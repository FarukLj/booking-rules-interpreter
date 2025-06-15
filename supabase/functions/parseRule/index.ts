
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

    // Enhanced prompt for better booking window rule generation
    const prompt = `
Analyze this booking rule and generate a JSON response with booking window rules that include proper user scope and tags.

Rule: "${inputRule}"

CRITICAL REQUIREMENTS for booking window rules:
1. When user groups are mentioned (like "Visitors", "Club members", "Staff", etc.), ALWAYS set:
   - user_scope: "users_with_tags"
   - tags: ["GroupName"] (array with the actual group name)
   
2. Only use user_scope: "all_users" when NO specific user groups are mentioned.

3. For constraints:
   - Use "more_than" for "up to X time" (meaning no more than X)
   - Use "less_than" for "at least X time" (meaning minimum X)

4. Always include: user_scope, tags (when applicable), constraint, value, unit, spaces, explanation

Example input: "Visitors can only reserve Tennis Courts up to 3 days in advance; club members up to 14 days in advance"
Expected output:
{
  "booking_window_rules": [
    {
      "user_scope": "users_with_tags",
      "tags": ["Visitors"],
      "constraint": "more_than",
      "value": 3,
      "unit": "days",
      "spaces": ["Tennis Courts"],
      "explanation": "Visitors can reserve Tennis Courts up to 3 days in advance"
    },
    {
      "user_scope": "users_with_tags", 
      "tags": ["Club members"],
      "constraint": "more_than",
      "value": 14,
      "unit": "days", 
      "spaces": ["Tennis Courts"],
      "explanation": "Club members can reserve Tennis Courts up to 14 days in advance"
    }
  ]
}

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
            content: 'You are an expert at parsing booking rules and generating structured JSON responses. Always include user_scope and tags fields when user groups are detected.'
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
      // Fallback to rule generation if AI parsing fails
      const fallbackRules = generateBookingWindowRules(inputRule, ['all spaces']);
      parsedResponse = {
        booking_window_rules: fallbackRules,
        summary: 'Generated booking window rules using fallback logic'
      };
    }

    // Enhanced sanitization with field validation
    console.log('Starting enhanced rule sanitization with improved pattern detection...');
    
    if (parsedResponse.booking_window_rules) {
      console.log('[BOOKING WINDOW FIELD MAPPING] Normalizing booking window rule field names and extracting spaces');
      
      parsedResponse.booking_window_rules = parsedResponse.booking_window_rules.map((rule: any) => {
        // CRITICAL FIX: Ensure user_scope and tags are properly set
        if (!rule.user_scope) {
          // If no user_scope is set, try to detect from tags or explanation
          if (rule.tags && rule.tags.length > 0) {
            rule.user_scope = "users_with_tags";
            console.log('[FIELD MAPPING] Added missing user_scope for rule with tags:', rule.tags);
          } else {
            // Check explanation for user groups
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
        
        // Ensure tags is an array when user_scope is users_with_tags
        if (rule.user_scope === "users_with_tags" && (!rule.tags || !Array.isArray(rule.tags))) {
          const detectedGroups = extractUserGroupsFromText(rule.explanation || inputRule);
          if (detectedGroups.length > 0) {
            rule.tags = detectedGroups;
            console.log('[FIELD MAPPING] Added missing tags array:', detectedGroups);
          } else {
            // Fallback to all_users if no tags can be determined
            rule.user_scope = "all_users";
            console.log('[FIELD MAPPING] No tags found, reverted to all_users');
          }
        }
        
        return rule;
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
