import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Utility functions
const parseTimeRange = (text: string): { from: string; to: string } | null => {
  console.log('[parseTimeRange] Input text:', text);
  
  // Pattern for time ranges like "6 AM-4 PM" or "4 PM-9 PM"
  const timeMatch = text.match(/(\d{1,2})\s*(AM|PM)\s*[-–]\s*(\d{1,2})\s*(AM|PM)/i);
  if (!timeMatch) {
    console.log('[parseTimeRange] No time match found');
    return null;
  }
  
  const [, startHour, startPeriod, endHour, endPeriod] = timeMatch;
  console.log('[parseTimeRange] Matched:', { startHour, startPeriod, endHour, endPeriod });
  
  const convertTo24Hour = (hour: string, period: string): string => {
    let h = parseInt(hour);
    if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (period.toUpperCase() === 'AM' && h === 12) h = 0;
    return h.toString().padStart(2, '0') + ':00';
  };
  
  const result = {
    from: convertTo24Hour(startHour, startPeriod),
    to: convertTo24Hour(endHour, endPeriod)
  };
  
  console.log('[parseTimeRange] Result:', result);
  return result;
};

const parseAmount = (text: string): { amount: number; unit: string } | null => {
  const amountMatch = text.match(/\$(\d+(?:\.\d+)?)\s*(?:\/\s*)?(per\s+)?(hour|h|day|d)/i);
  if (!amountMatch) return null;
  
  const amount = parseFloat(amountMatch[1]);
  const unit = amountMatch[3].toLowerCase().startsWith('h') ? 'hour' : 'day';
  
  return { amount, unit };
};

const parseDuration = (text: string): string | null => {
  const durationMatch = text.match(/(\d+(?:\.\d+)?)\s*[-\s]*(h(ours?)?|hr?s?|minutes?|mins?|m)/i);
  if (!durationMatch) return null;
  let num = Number(durationMatch[1]);
  if (/min/i.test(durationMatch[0])) {
    return `${num}min`;
  } else {
    return `${num}h`;
  }
};

const extractSpaces = (text: string): string[] => {
  console.log('[extractSpaces] Input text:', text);
  const spaces = new Set<string>();
  
  // Specific patterns for common facility names
  const facilityPatterns = [
    /(?:the\s+)?indoor\s+track/gi,
    /(?:the\s+)?outdoor\s+track/gi,
    /basketball\s+court\s*\d*/gi,
    /tennis\s+court\s*[s]?(?:\s*\d+)?/gi,
    /pickleball\s*\d*/gi,
    /batting\s+cage\s*[A-Z]?/gi,
    /court\s*\d+/gi,
    /courts?\s+\d+[-–]\d+/gi
  ];
  
  facilityPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      let space = match[0].trim();
      // Clean up common prefixes
      space = space.replace(/^the\s+/i, '');
      spaces.add(space);
    }
  });
  
  // Handle ranges like "Courts 1-4"
  const rangeMatch = text.match(/(Courts?)\s+(\d+)[-–](\d+)/i);
  if (rangeMatch) {
    const [, courtType, start, end] = rangeMatch;
    spaces.clear(); // Clear any previous matches for this range
    for (let i = parseInt(start); i <= parseInt(end); i++) {
      spaces.add(`${courtType.replace(/s$/, '')} ${i}`);
    }
  }
  
  const result = spaces.size > 0 ? Array.from(spaces) : ['all spaces'];
  console.log('[extractSpaces] Extracted spaces:', result);
  return result;
};

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
    // Groups with possessive forms
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*'?s?)\s+(?:can|must|should|booking|reservation)/gi,
    // Tagged groups
    /members?\s+with\s+(?:the\s+)?['"']([^'"]+)['"']\s+tag/gi,
    // Quoted groups
    /['"']([A-Z][a-zA-Z\s-]+)['"']\s+tagged/gi
  ];

  const groups = new Set<string>();
  
  userGroupPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        let group = match[1].trim();
        group = group.replace(/'/g, '').replace(/\s+/g, ' ');
        
        const skipWords = ['only', 'all', 'any', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'without', 'per hour'];
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

// Generate pricing rules
const generatePricingRules = (inputRule: string, spaces: string[]): any[] => {
  console.log('[PRICING GENERATION] Starting with text:', inputRule);
  console.log('[PRICING GENERATION] Available spaces:', spaces);
  
  const rules: any[] = [];
  
  // Split the input by semicolons to handle multiple pricing rules
  const segments = inputRule.split(/[;]/);
  console.log('[PRICING GENERATION] Segments:', segments);
  
  segments.forEach((segment, index) => {
    console.log(`[PRICING GENERATION] Processing segment ${index}:`, segment.trim());
    
    // Pattern for time-based pricing: "From X AM-Y PM ... $Z per hour"
    const timeBasedPattern = /from\s+(\d{1,2}\s*(?:AM|PM)\s*[-–]\s*\d{1,2}\s*(?:AM|PM))[^$]*\$(\d+(?:\.\d+)?)\s*(?:\/\s*)?(?:per\s+)?(hour|h)/gi;
    const timeBasedMatches = segment.matchAll(timeBasedPattern);
    
    for (const match of timeBasedMatches) {
      console.log('[PRICING GENERATION] Time-based match:', match[0]);
      const timeRange = parseTimeRange(match[1]);
      const amount = parseFloat(match[2]);
      
      if (timeRange) {
        const rule = {
          space: spaces,
          time_range: `${timeRange.from}–${timeRange.to}`,
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          rate: { amount, unit: "hour" },
          condition_type: "duration",
          operator: "is_greater_than_or_equal_to",
          value: "15min",
          explanation: `Pricing: $${amount}/hour from ${timeRange.from} to ${timeRange.to}`
        };
        
        console.log('[PRICING GENERATION] Generated time-based rule:', rule);
        rules.push(rule);
      }
    }
    
    // Enhanced pattern for user-specific pricing: "members with 'X' tag ... pay $Y"
    const userPricingPattern = /members?\s+with\s+(?:the\s+)?['"']([^'"]+)['"']\s+tag[^$]*(?:always\s+)?(?:pay|get|charged?)\s*\$(\d+(?:\.\d+)?)\s*(?:\/\s*)?(?:per\s+)?(hour|h)/gi;
    const userPricingMatches = segment.matchAll(userPricingPattern);
    
    for (const match of userPricingMatches) {
      console.log('[PRICING GENERATION] User-specific match:', match[0]);
      const tag = match[1];
      const amount = parseFloat(match[2]);
      
      const rule = {
        space: spaces,
        time_range: "00:00–23:59",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        rate: { amount, unit: "hour" },
        condition_type: "user_tags",
        operator: "contains_any_of",
        value: [tag],
        explanation: `Special pricing: $${amount}/hour for ${tag} members`
      };
      
      console.log('[PRICING GENERATION] Generated user-specific rule:', rule);
      rules.push(rule);
    }
  });
  
  console.log('[PRICING GENERATION] Final generated rules:', rules);
  return rules;
};

// Generate quota rules
const generateQuotaRules = (inputRule: string, spaces: string[]): any[] => {
  console.log('[QUOTA GENERATION] Starting with text:', inputRule);
  
  const rules: any[] = [];
  
  // Pattern for quota limits: "limit each player to X hours per week/day"
  const quotaPattern = /limit\s+(?:each\s+)?([^to]+)\s+to\s+(\d+)\s+(hours?|bookings?)\s+per\s+(day|week|month)/gi;
  const quotaMatches = inputRule.matchAll(quotaPattern);
  
  for (const match of quotaMatches) {
    const target = match[1].trim().toLowerCase().includes('player') ? 'individuals' : 'individuals_with_tags';
    const value = parseInt(match[2]);
    const quotaType = match[3].toLowerCase().startsWith('hour') ? 'time' : 'count';
    const period = match[4].toLowerCase() as 'day' | 'week' | 'month';
    
    rules.push({
      target,
      quota_type: quotaType,
      value: quotaType === 'time' ? `${value}h` : value,
      period,
      affected_spaces: spaces,
      consideration_time: "any_time",
      explanation: `Limit: ${value} ${match[3]} per ${period} for ${match[1].trim()}`
    });
  }
  
  // Pattern for user group quotas: "'X' tagged teams to Y hours per day"
  const userQuotaPattern = /['"']([^'"]+)['"']\s+tagged\s+([^to]+)\s+to\s+(\d+)\s+(hours?)\s+per\s+(day|week|month)/gi;
  const userQuotaMatches = inputRule.matchAll(userQuotaPattern);
  
  for (const match of userQuotaMatches) {
    const tag = match[1];
    const value = parseInt(match[3]);
    const period = match[5].toLowerCase() as 'day' | 'week' | 'month';
    
    rules.push({
      target: "individuals_with_tags",
      tags: [tag],
      quota_type: "time",
      value: `${value}h`,
      period,
      affected_spaces: spaces,
      consideration_time: "any_time",
      explanation: `Limit: ${value} hours per ${period} for ${tag} tagged users`
    });
  }
  
  console.log('[QUOTA GENERATION] Generated rules:', rules);
  return rules;
};

// Generate buffer time rules
const generateBufferTimeRules = (inputRule: string, spaces: string[]): any[] => {
  console.log('[BUFFER GENERATION] Starting with text:', inputRule);
  
  const rules: any[] = [];
  
  // Pattern for buffer times: "X-minute buffer", "X min buffer"
  const bufferPattern = /(?:add\s+(?:a\s+)?)?(\d+)[-\s]?minute?s?\s+(?:clean[-\s]?up\s+)?buffer/gi;
  const bufferMatches = inputRule.matchAll(bufferPattern);
  
  for (const match of bufferMatches) {
    const duration = `${match[1]}min`;
    
    rules.push({
      spaces: spaces.map(space => ({ name: space })),
      buffer_duration: duration,
      explanation: `${match[1]}-minute buffer between bookings`
    });
  }
  
  console.log('[BUFFER GENERATION] Generated rules:', rules);
  return rules;
};

// Generate space sharing rules
const generateSpaceSharingRules = (inputRule: string): any[] => {
  console.log('[SPACE SHARING GENERATION] Starting with text:', inputRule);
  
  const rules: any[] = [];
  
  // Pattern for mutual exclusivity: "If X is booked, Y becomes unavailable"
  const exclusivityPattern = /if\s+([^,]+)\s+is\s+booked,?\s+([^,]+)\s+becomes?\s+unavailable/gi;
  const exclusivityMatches = inputRule.matchAll(exclusivityPattern);
  
  for (const match of exclusivityMatches) {
    const from = match[1].trim();
    const to = match[2].trim();
    
    rules.push({ from, to });
    
    // Add reverse relationship for "vice-versa"
    if (inputRule.toLowerCase().includes('vice versa') || inputRule.toLowerCase().includes('vice-versa')) {
      rules.push({ from: to, to: from });
    }
  }
  
  console.log('[SPACE SHARING GENERATION] Generated rules:', rules);
  return rules;
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

// Enhanced booking window rule generation
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
    mentionedSpaces = spaces;
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
        userGroup = match[1].trim();
        value = parseInt(match[2]);
        unit = match[3].toLowerCase().replace(/s$/, '');
        constraint = "more_than";
      } else if (match[3] && isNaN(parseInt(match[3]))) {
        value = parseInt(match[1]);
        unit = match[2].toLowerCase().replace(/s$/, '');
        userGroup = match[3].trim();
        constraint = "more_than";
      } else {
        continue;
      }
      
      userGroup = userGroup.replace(/'/g, '').replace(/\s+/g, ' ');
      
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
        user_scope: "users_with_tags",
        tags: [userGroup],
        constraint,
        value,
        unit,
        spaces: mentionedSpaces,
        explanation: `${userGroup} can reserve ${mentionedSpaces.join(', ')} ${constraint === 'more_than' ? 'up to' : 'at least'} ${value} ${unit}${value !== 1 ? 's' : ''} in advance`
      };
      
      rules.push(rule);
    }
  });
  
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

    // Enhanced rule type detection with priority order
    const hasPricingPattern = /\$\d+|per hour|hourly rate/i.test(inputRule);
    const hasQuotaPattern = /limit.+to\s+\d+\s+(hours?|bookings?)\s+per\s+(day|week|month)/i.test(inputRule);
    const hasBufferPattern = /\d+[-\s]?minute.+buffer|clean[-\s]?up/i.test(inputRule);
    const hasSpaceSharingPattern = /if.+booked.+becomes unavailable|vice versa|mutual/i.test(inputRule);
    const hasBlockPattern = /block|slot/i.test(inputRule);
    const hasMinMaxPattern = /(minimum|maximum|at\s+least|no\s+more\s+than|min|max)/i.test(inputRule);
    const hasAdvanceBookingPattern = /(in advance|prior to|beforehand)/i.test(inputRule);
    const hasUserGroupPattern = /(can only|for\s*\w+)/i.test(inputRule);

    console.log('[RULE TYPE DETECTION]', {
      hasPricingPattern,
      hasQuotaPattern,
      hasBufferPattern,
      hasSpaceSharingPattern,
      hasBlockPattern,
      hasMinMaxPattern,
      hasAdvanceBookingPattern,
      hasUserGroupPattern,
      inputRule
    });

    // Extract spaces for all rule types
    const mentionedSpaces = extractSpaces(inputRule);

    // Initialize response object
    let responseObj: any = {};

    // Generate rules based on priority order
    if (hasSpaceSharingPattern) {
      console.log('[MAIN] Generating space sharing rules');
      responseObj.space_sharing = generateSpaceSharingRules(inputRule);
    }

    if (hasPricingPattern) {
      console.log('[MAIN] Generating pricing rules');
      responseObj.pricing_rules = generatePricingRules(inputRule, mentionedSpaces);
    }

    if (hasBufferPattern) {
      console.log('[MAIN] Generating buffer time rules');
      responseObj.buffer_time_rules = generateBufferTimeRules(inputRule, mentionedSpaces);
    }

    if (hasQuotaPattern) {
      console.log('[MAIN] Generating quota rules');
      responseObj.quota_rules = generateQuotaRules(inputRule, mentionedSpaces);
    }

    if (hasBlockPattern || hasMinMaxPattern) {
      console.log('[MAIN] Generating booking conditions');
      responseObj.booking_conditions = generateBookingConditions(inputRule, mentionedSpaces);
    }

    if (hasAdvanceBookingPattern || hasUserGroupPattern) {
      console.log('[MAIN] Generating booking window rules');
      responseObj.booking_window_rules = generateBookingWindowRules(inputRule, mentionedSpaces);
    }

    // Fallback to booking window if no specific patterns detected
    if (Object.keys(responseObj).length === 0) {
      console.log('[MAIN] No specific patterns detected, using booking window fallback');
      responseObj.booking_window_rules = generateBookingWindowRules(inputRule, mentionedSpaces);
    }

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
