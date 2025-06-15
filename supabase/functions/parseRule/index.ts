
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
    // Groups with possessive forms
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'?s?\s+(?:can|must|should|booking|reservation)/gi
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

// NEW: Generate booking conditions for duration and time block constraints
const generateBookingConditions = (text: string, spaces: string[]): any[] => {
  console.log('[BOOKING CONDITIONS GENERATION] Starting with text:', text);
  console.log('[BOOKING CONDITIONS GENERATION] Available spaces:', spaces);
  
  const conditions: any[] = [];
  
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
  
  console.log('[BOOKING CONDITIONS GENERATION] Mentioned spaces:', mentionedSpaces);

  // Pattern 1: Time block constraints (e.g., "1-hour blocks only", "30-minute slots")
  const blockPatterns = [
    /(\d+)[-\s]*(hour|minute)s?\s+blocks?\s+only/gi,
    /only\s+(\d+)[-\s]*(hour|minute)s?\s+blocks?/gi,
    /(\d+)[-\s]*(hour|minute)s?\s+slots?\s+only/gi,
    /no\s+(?:half-hours?|90[-\s]*minute)/gi // Indicates hourly blocks
  ];

  let hasBlockConstraints = false;
  let blockDuration = "";

  blockPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      hasBlockConstraints = true;
      if (match[1] && match[2]) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        blockDuration = unit === 'hour' ? `${value}h` : `${value}min`;
        console.log('[BOOKING CONDITIONS] Detected block constraint:', blockDuration);
      } else if (match[0].includes('half-hours') || match[0].includes('90-minute')) {
        blockDuration = "1h"; // Infer 1-hour blocks from "no half-hours"
        console.log('[BOOKING CONDITIONS] Inferred 1-hour blocks from exclusions');
      }
    }
  });

  // Pattern 2: Duration constraints (minimum/maximum)
  const durationPatterns = [
    /minimum\s+(\d+)\s+(hours?|minutes?)/gi,
    /at\s+least\s+(\d+)\s+(hours?|minutes?)/gi,
    /maximum\s+(\d+)\s+(hours?|minutes?)/gi,
    /no\s+more\s+than\s+(\d+)\s+(hours?|minutes?)/gi
  ];

  const durationConstraints: { type: string; value: string }[] = [];

  durationPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[2]) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase().replace(/s$/, ''); // Remove plural 's'
        const durationValue = unit === 'hour' ? `${value}h` : `${value}min`;
        
        if (match[0].toLowerCase().includes('minimum') || match[0].toLowerCase().includes('at least')) {
          durationConstraints.push({ type: 'minimum', value: durationValue });
        } else if (match[0].toLowerCase().includes('maximum') || match[0].toLowerCase().includes('no more')) {
          durationConstraints.push({ type: 'maximum', value: durationValue });
        }
        
        console.log('[BOOKING CONDITIONS] Detected duration constraint:', { type: match[0], value: durationValue });
      }
    }
  });

  // Generate booking condition 1: Time block constraints (interval rules)
  if (hasBlockConstraints && blockDuration) {
    const blockCondition = {
      space: mentionedSpaces,
      time_range: "00:00–23:59",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      rules: [
        {
          condition_type: "interval_start",
          operator: "is_not_multiple_of",
          value: blockDuration,
          explanation: `Booking start time must be a multiple of ${blockDuration}`
        },
        {
          condition_type: "interval_end",
          operator: "is_not_multiple_of", 
          value: blockDuration,
          explanation: `Booking end time must be a multiple of ${blockDuration}`
        }
      ],
      logic_operators: ["OR"],
      explanation: `${mentionedSpaces.join(', ')} must be booked in ${blockDuration} blocks only`
    };
    
    conditions.push(blockCondition);
    console.log('[BOOKING CONDITIONS] Generated block constraint condition:', blockCondition);
  }

  // Generate booking condition 2: Duration constraints
  if (durationConstraints.length > 0) {
    const rules: any[] = [];
    const logicOperators: string[] = [];

    durationConstraints.forEach((constraint, index) => {
      const operator = constraint.type === 'minimum' ? 'is_less_than' : 'is_greater_than';
      rules.push({
        condition_type: "duration",
        operator: operator,
        value: constraint.value,
        explanation: `Booking duration ${constraint.type === 'minimum' ? 'cannot be less than' : 'cannot be greater than'} ${constraint.value}`
      });
      
      if (index < durationConstraints.length - 1) {
        logicOperators.push("OR");
      }
    });

    if (rules.length > 0) {
      const durationCondition = {
        space: mentionedSpaces,
        time_range: "00:00–23:59",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        rules: rules,
        logic_operators: logicOperators,
        explanation: `${mentionedSpaces.join(', ')} duration constraints: ${durationConstraints.map(c => `${c.type} ${c.value}`).join(', ')}`
      };
      
      conditions.push(durationCondition);
      console.log('[BOOKING CONDITIONS] Generated duration constraint condition:', durationCondition);
    }
  }

  console.log('[BOOKING CONDITIONS GENERATION] Final generated conditions:', conditions);
  return conditions;
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

// NEW: Intelligent rule type detection
const detectRuleTypes = (text: string): { needsBookingConditions: boolean; needsBookingWindow: boolean } => {
  console.log('[RULE TYPE DETECTION] Analyzing text for rule types:', text);
  
  // Patterns that indicate booking conditions are needed
  const bookingConditionPatterns = [
    /blocks?\s+only/gi,
    /slots?\s+only/gi,
    /minimum\s+\d+\s+(hours?|minutes?)/gi,
    /maximum\s+\d+\s+(hours?|minutes?)/gi,
    /at\s+least\s+\d+\s+(hours?|minutes?)/gi,
    /no\s+more\s+than\s+\d+\s+(hours?|minutes?)/gi,
    /no\s+(?:half-hours?|90[-\s]*minute)/gi
  ];
  
  // Patterns that indicate booking window rules are needed
  const bookingWindowPatterns = [
    /\d+\s+days?\s+(?:in\s+)?advance/gi,
    /\d+\s+hours?\s+(?:in\s+)?advance/gi,
    /advance\s+booking/gi,
    /up\s+to\s+\d+\s+days?/gi,
    /(?:can|must|should)\s+(?:only\s+)?(?:book|reserve)/gi
  ];
  
  const needsBookingConditions = bookingConditionPatterns.some(pattern => pattern.test(text));
  const needsBookingWindow = bookingWindowPatterns.some(pattern => pattern.test(text));
  
  console.log('[RULE TYPE DETECTION] Results:', { needsBookingConditions, needsBookingWindow });
  
  return { needsBookingConditions, needsBookingWindow };
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

    // ENHANCED: Detect what types of rules are needed
    const ruleTypes = detectRuleTypes(inputRule);
    
    // Generate booking conditions if needed
    let bookingConditions: any[] = [];
    if (ruleTypes.needsBookingConditions) {
      console.log('[RULE GENERATION] Generating booking conditions...');
      bookingConditions = generateBookingConditions(inputRule, ['all spaces']);
    }

    // Enhanced prompt for better rule generation
    const prompt = `
Analyze this booking rule and generate a JSON response with the appropriate rule types.

Rule: "${inputRule}"

CRITICAL REQUIREMENTS:

1. RULE TYPE DETECTION:
   - If the rule mentions "blocks", "slots", "minimum/maximum duration", "no half-hours" → generate booking_conditions
   - If the rule mentions "advance booking", "days in advance", user groups with time restrictions → generate booking_window_rules
   - If the rule mentions both types → generate both

2. For BOOKING CONDITIONS (duration/time block constraints):
   - Use "interval_start" and "interval_end" for time block requirements (e.g., "1-hour blocks only")
   - Use "duration" for minimum/maximum time constraints
   - Use operators: "is_not_multiple_of" for blocks, "is_less_than"/"is_greater_than" for duration limits
   - Multiple rules within one condition use logic_operators: ["OR"] or ["AND"]

3. For BOOKING WINDOW RULES (advance booking constraints):
   - When user groups are mentioned, ALWAYS set: user_scope: "users_with_tags", tags: ["GroupName"]
   - Only use user_scope: "all_users" when NO specific user groups are mentioned
   - Use "more_than" for "up to X time", "less_than" for "at least X time"

4. Always include proper space arrays, explanations, and time_range/days for booking conditions.

Example for "${inputRule}":
Expected: booking_conditions with interval rules for 1-hour blocks AND duration rules for 2-4 hour limits.

Respond with JSON only, no markdown formatting.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at parsing booking rules and generating structured JSON responses. Prioritize booking_conditions for duration and time block constraints, and booking_window_rules for advance booking restrictions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('AI Response:', aiResponse);

    // Parse the AI response and ensure it's properly formatted
    let parsedResponse;
    try {
      // Remove any markdown formatting
      const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      parsedResponse = JSON.parse(cleanResponse);
      console.log('Parsed response before sanitization:', parsedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Enhanced fallback logic
      const fallbackResponse: any = {};
      
      if (ruleTypes.needsBookingConditions && bookingConditions.length > 0) {
        fallbackResponse.booking_conditions = bookingConditions;
      }
      
      if (ruleTypes.needsBookingWindow) {
        const fallbackRules = generateBookingWindowRules(inputRule, ['all spaces']);
        if (fallbackRules.length > 0) {
          fallbackResponse.booking_window_rules = fallbackRules;
        }
      }
      
      if (Object.keys(fallbackResponse).length === 0) {
        fallbackResponse.booking_conditions = generateBookingConditions(inputRule, ['all spaces']);
      }
      
      parsedResponse = {
        ...fallbackResponse,
        summary: 'Generated rules using enhanced fallback logic with intelligent rule type detection'
      };
    }

    // Enhanced sanitization with field validation
    console.log('Starting enhanced rule sanitization...');
    
    // Sanitize booking window rules
    if (parsedResponse.booking_window_rules) {
      console.log('[BOOKING WINDOW FIELD MAPPING] Normalizing booking window rule field names');
      
      parsedResponse.booking_window_rules = parsedResponse.booking_window_rules.map((rule: any) => {
        // CRITICAL FIX: Ensure user_scope and tags are properly set
        if (!rule.user_scope) {
          if (rule.tags && rule.tags.length > 0) {
            rule.user_scope = "users_with_tags";
            console.log('[FIELD MAPPING] Added missing user_scope for rule with tags:', rule.tags);
          } else {
            const detectedGroups = extractUserGroupsFromText(rule.explanation || '');
            if (detectedGroups.length > 0) {
              rule.user_scope = "users_with_tags";
              rule.tags = detectedGroups;
              console.log('[FIELD MAPPING] Detected user groups from explanation and added user_scope:', detectedGroups);
            } else {
              rule.user_scope = "all_users";
              console.log('[FIELD MAPPING] No user groups detected, set to all_users');
            }
          }
        }
        
        if (rule.user_scope === "users_with_tags" && (!rule.tags || !Array.isArray(rule.tags))) {
          const detectedGroups = extractUserGroupsFromText(rule.explanation || inputRule);
          if (detectedGroups.length > 0) {
            rule.tags = detectedGroups;
            console.log('[FIELD MAPPING] Added missing tags array:', detectedGroups);
          } else {
            rule.user_scope = "all_users";
            console.log('[FIELD MAPPING] No tags found, reverted to all_users');
          }
        }
        
        return rule;
      });
    }

    // NEW: Sanitize booking conditions
    if (parsedResponse.booking_conditions) {
      console.log('[BOOKING CONDITIONS FIELD MAPPING] Normalizing booking condition field names');
      
      parsedResponse.booking_conditions = parsedResponse.booking_conditions.map((condition: any) => {
        // Ensure required fields are present
        if (!condition.space) condition.space = ['all spaces'];
        if (!condition.time_range) condition.time_range = '00:00–23:59';
        if (!condition.days) condition.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        if (!condition.rules) condition.rules = [];
        if (!condition.logic_operators) condition.logic_operators = [];
        
        // Ensure rules have proper structure
        condition.rules = condition.rules.map((rule: any) => {
          if (!rule.condition_type) rule.condition_type = 'duration';
          if (!rule.operator) rule.operator = 'is_less_than';
          if (!rule.value) rule.value = '30min';
          if (!rule.explanation) rule.explanation = 'Default booking condition rule';
          return rule;
        });
        
        return condition;
      });
    }

    console.log('Parsed response after sanitization:', JSON.stringify(parsedResponse, null, 2));

    return new Response(JSON.stringify(parsedResponse), {
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
