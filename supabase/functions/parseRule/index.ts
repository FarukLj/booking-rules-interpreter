
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced user group detection patterns
const extractUserGroupsFromText = (text: string): string[] => {
  console.log('[USER GROUP EXTRACTION] Analyzing text:', text);
  
  const userGroupPatterns = [
    // Direct user group mentions
    /(?:for\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+members?)?)\s+(?:can|must|should|are)/gi,
    // Groups before constraints
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+members?)?)(?:\s+(?:can|must|should|are)\s+(?:only\s+)?(?:book|reserve|access))/gi,
    // Groups with "up to" or time constraints
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+members?)?)(?:\s+up\s+to|\s+within|\s+at\s+least)/gi,
    // Semicolon separated groups
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+members?)?)(?:\s*[;,]\s*)/gi,
    // Groups with possessive forms - FIXED: Properly escaped and closed
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*'?s?)\s+(?:can|must|should|booking|reservation)/gi
  ];

  const groups = new Set<string>();
  
  userGroupPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        let group = match[1].trim();
        // Clean up the group name
        group = group.replace(/'/g, '').replace(/\s+/g, ' ');
        
        // Skip common non-user words
        const skipWords = ['only', 'all', 'any', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'without'];
        if (!skipWords.includes(group.toLowerCase()) && group.length > 2) {
          groups.add(group);
        }
      }
    }
  });

  const extractedGroups = Array.from(groups);
  console.log('[USER GROUP EXTRACTION] Extracted groups:', extractedGroups);
  return extractedGroups;
};

// Enhanced booking condition detection and generation
const generateBookingConditions = (inputRule: string, spaces: string[]): any[] => {
  console.log('[BOOKING CONDITIONS] Analyzing rule for conditions:', inputRule);
  
  const lower = inputRule.toLowerCase();
  let blocks: any[] = [];

  // Patterns for time block constraints
  const blockMatch = inputRule.match(/(\d+)(?:[ -]?hour|\s*h)(?:\s*blocks?|\s*slots?| blocks?)?/i);
  const noIrregularSlot = /(no\s+(half(-|\s*)hours?|90[-\s]*minutes?|irregular\s*slots?))/i.test(inputRule);

  // Patterns for min/max duration
  const minMatch = inputRule.match(/min(?:imum)?\s*(?:of\s*)?(\d+(?:\.\d+)?\s*(?:hours?|h|minutes?|mins?|m))/i);
  const maxMatch = inputRule.match(/max(?:imum)?\s*(?:of\s*)?(\d+(?:\.\d+)?\s*(?:hours?|h|minutes?|mins?|m))/i);
  const atLeastMatch = inputRule.match(/at\s+least\s+(\d+(?:\.\d+)?\s*(?:hours?|h|minutes?|mins?|m))/i);
  const noMoreThanMatch = inputRule.match(/no\s+more\s+than\s+(\d+(?:\.\d+)?\s*(?:hours?|h|minutes?|mins?|m))/i);

  console.log('[BOOKING CONDITIONS] Pattern matches:', {
    blockMatch: blockMatch?.[0],
    noIrregularSlot,
    minMatch: minMatch?.[0],
    maxMatch: maxMatch?.[0],
    atLeastMatch: atLeastMatch?.[0],
    noMoreThanMatch: noMoreThanMatch?.[0]
  });

  // Generate block constraint rules if block pattern is detected
  if (blockMatch || noIrregularSlot) {
    let blockStr = blockMatch ? blockMatch[1] : '1';
    let blockVal = parseFloat(blockStr);
    let blockDisplay = blockVal + 'h';

    let explanation = `Bookings must be made in ${blockDisplay} blocks only.`;
    let ruleStart = {
      condition_type: "interval_start",
      operator: "is_not_multiple_of",
      value: blockDisplay,
      explanation: `Booking start time must be a multiple of ${blockDisplay}`
    };
    let ruleEnd = {
      condition_type: "interval_end", 
      operator: "is_not_multiple_of",
      value: blockDisplay,
      explanation: `Booking end time must be a multiple of ${blockDisplay}`
    };
    
    blocks.push({
      space: spaces,
      time_range: "00:00–23:59",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      rules: [ruleStart, ruleEnd],
      logic_operators: ["OR"],
      explanation
    });
    
    console.log('[BOOKING CONDITIONS] Generated block constraint:', blocks[blocks.length - 1]);
  }

  // Generate duration constraint rules if min/max patterns are detected
  let minStr = minMatch?.[1] || atLeastMatch?.[1];
  let maxStr = maxMatch?.[1] || noMoreThanMatch?.[1];

  if (minStr || maxStr) {
    let rules = [];
    let logic_operators = [];
    
    if (minStr) {
      let normMin = parseDuration(minStr);
      rules.push({
        condition_type: "duration",
        operator: "is_less_than",
        value: normMin,
        explanation: `Booking duration cannot be less than ${normMin}`
      });
    }
    if (maxStr) {
      let normMax = parseDuration(maxStr);
      rules.push({
        condition_type: "duration",
        operator: "is_greater_than", 
        value: normMax,
        explanation: `Booking duration cannot be greater than ${normMax}`
      });
    }
    if (rules.length > 1) logic_operators.push("OR");
    
    blocks.push({
      space: spaces,
      time_range: "00:00–23:59",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      rules, 
      logic_operators,
      explanation: `Booking duration constraints: ${minStr ? `minimum ${parseDuration(minStr)}` : ''}${minStr && maxStr ? ', ' : ''}${maxStr ? `maximum ${parseDuration(maxStr)}` : ''}`
    });
    
    console.log('[BOOKING CONDITIONS] Generated duration constraint:', blocks[blocks.length - 1]);
  }

  console.log('[BOOKING CONDITIONS] Final generated blocks:', blocks);
  return blocks;
};

// Normalize duration units
const parseDuration = (text: string): string | null => {
  const durationMatch = text.match(/(\d+(\.\d+)?)\s*(h(ours?)?|hr?s?|minutes?|mins?|m)/i);
  if (!durationMatch) return null;
  let num = Number(durationMatch[1]);
  if (/min/i.test(durationMatch[0])) {
    return `${num}min`;
  } else {
    return `${num}h`;
  }
};

// Enhanced booking window rule generation with proper user scope mapping
const generateBookingWindowRules = (text: string, spaces: string[]): any[] => {
  console.log('[BOOKING WINDOW GENERATION] Starting with text:', text);
  console.log('[BOOKING WINDOW GENERATION] Available spaces:', spaces);
  
  const rules: any[] = [];
  const userGroups = extractUserGroupsFromText(text);
  
  console.log('[BOOKING WINDOW GENERATION] Detected user groups:', userGroups);
  
  // Pattern to extract booking window constraints
  const windowPatterns = [
    // "Group up to X days/hours in advance"
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+members?)?)\s+(?:can\s+(?:only\s+)?(?:book|reserve|access))?\s*(?:up\s+to|within|at\s+most)\s+(\d+)\s+(days?|hours?|weeks?)\s+(?:in\s+)?advance/gi,
    // "Group must book at least X days/hours in advance"
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+members?)?)\s+(?:must|should)\s+(?:book|reserve)\s+(?:at\s+least)\s+(\d+)\s+(days?|hours?|weeks?)\s+(?:in\s+)?advance/gi,
    // "X days/hours advance for Group"
    /(\d+)\s+(days?|hours?|weeks?)\s+(?:in\s+)?advance\s+(?:for\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+members?)?)/gi
  ];

  // Extract specific space mentions
  const spacePatterns = spaces.map(space => new RegExp(`\\b${space.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'));
  let mentionedSpaces: string[] = [];
  
  spacePatterns.forEach((pattern, index) => {
    if (pattern.test(text)) {
      mentionedSpaces.push(spaces[index]);
    }
  });
  
  if (mentionedSpaces.length === 0) {
    mentionedSpaces = spaces; // Default to all spaces if none specifically mentioned
  }
  
  console.log('[BOOKING WINDOW GENERATION] Mentioned spaces:', mentionedSpaces);

  windowPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      let userGroup: string;
      let value: number;
      let unit: string;
      let constraint: string;
      
      if (match[1] && isNaN(parseInt(match[1]))) {
        // Pattern: "Group up to X days/hours"
        userGroup = match[1].trim();
        value = parseInt(match[2]);
        unit = match[3].toLowerCase().replace(/s$/, ''); // Remove plural 's'
        constraint = "more_than"; // "up to X" means "more than X is not allowed"
      } else if (match[3] && isNaN(parseInt(match[3]))) {
        // Pattern: "X days/hours for Group"
        value = parseInt(match[1]);
        unit = match[2].toLowerCase().replace(/s$/, '');
        userGroup = match[3].trim();
        constraint = "more_than";
      } else {
        continue; // Skip if pattern doesn't match expected format
      }
      
      // Clean user group name
      userGroup = userGroup.replace(/'/g, '').replace(/\s+/g, ' ');
      
      // Determine constraint type based on context
      if (text.toLowerCase().includes('at least') || text.toLowerCase().includes('must book')) {
        constraint = "less_than";
      }
      
      console.log('[BOOKING WINDOW GENERATION] Creating rule for:', {
        userGroup,
        value,
        unit,
        constraint,
        spaces: mentionedSpaces
      });
      
      const rule = {
        user_scope: "users_with_tags", // CRITICAL FIX: Always set user_scope when user groups are detected
        tags: [userGroup], // CRITICAL FIX: Set the tags array with the detected user group
        constraint,
        value,
        unit,
        spaces: mentionedSpaces,
        explanation: `${userGroup} can reserve ${mentionedSpaces.join(', ')} ${constraint === 'more_than' ? 'up to' : 'at least'} ${value} ${unit}${value !== 1 ? 's' : ''} in advance`
      };
      
      rules.push(rule);
    }
  });
  
  // If no specific rules were generated but user groups were detected, create default rules
  if (rules.length === 0 && userGroups.length > 0) {
    console.log('[BOOKING WINDOW GENERATION] No specific rules found, creating default rules for detected groups');
    
    userGroups.forEach(group => {
      const rule = {
        user_scope: "users_with_tags",
        tags: [group],
        constraint: "more_than",
        value: 72,
        unit: "hours",
        spaces: mentionedSpaces,
        explanation: `${group} can reserve ${mentionedSpaces.join(', ')} up to 72 hours in advance`
      };
      rules.push(rule);
    });
  }
  
  console.log('[BOOKING WINDOW GENERATION] Final generated rules:', rules);
  return rules;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rule: inputRule } = await req.json();
    console.log('Processing rule:', inputRule);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    // Enhanced rule type detection
    let booking_conditions = [];
    let booking_window_rules = [];
    let summary = '';

    const blockMatch = /block|slot/i.test(inputRule);
    const minMaxMatch = /(minimum|maximum|at\s+least|no\s+more\s+than|min|max)/i.test(inputRule);
    const advanceBookingMatch = /(in advance|prior to|beforehand)/i.test(inputRule);
    const userGroupMatch = /(can only|for\s*\w+)/i.test(inputRule);

    console.log('[RULE TYPE DETECTION]', {
      blockMatch,
      minMaxMatch,
      advanceBookingMatch,
      userGroupMatch,
      inputRule
    });

    let mentionedSpaces = [];
    // Basic heuristic for extracting a space name, fallback to 'all spaces'
    const spaceMatch = inputRule.match(/([A-Z][a-zA-Z0-9\s]+)\s+must\s+be\s+booked/i);
    if (spaceMatch) {
      mentionedSpaces.push(spaceMatch[1].trim());
    } else {
      mentionedSpaces.push('all spaces');
    }

    // If there are any block/min/max rules, create booking_conditions
    if (blockMatch || minMaxMatch) {
      console.log('[MAIN] Generating booking conditions');
      booking_conditions = generateBookingConditions(inputRule, mentionedSpaces);
    }

    // If "in advance" or user group detected, create booking_window_rules
    if (advanceBookingMatch || userGroupMatch) {
      console.log('[MAIN] Generating booking window rules');
      booking_window_rules = generateBookingWindowRules(inputRule, mentionedSpaces);
    }

    // If none detected, send both as fallback
    if (!booking_conditions.length && !booking_window_rules.length) {
      console.log('[MAIN] No specific patterns detected, using fallback');
      booking_window_rules = generateBookingWindowRules(inputRule, mentionedSpaces);
    }

    // Compose response
    let responseObj: any = {};
    if (booking_conditions.length) responseObj.booking_conditions = booking_conditions;
    if (booking_window_rules.length) responseObj.booking_window_rules = booking_window_rules;
    responseObj.summary = "AI-generated interpretation of your rule constraints.";

    console.log('[MAIN] Final response:', responseObj);

    return new Response(JSON.stringify(responseObj), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parseRule function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process rule',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
