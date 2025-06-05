import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Time range conversion utility for templates
function splitTimeRange(str: string): [any, any] {
  if (!str) return [null, null];
  
  const normalized = str.trim()
    .replace(/—|–|\s+to\s+/gi, '-')
    .replace(/\s+/g, '');
  
  const parts = normalized.split('-');
  if (parts.length !== 2) return [null, null];
  
  const [rawStart, rawEnd] = parts;
  return [parseTime(rawStart), parseTime(rawEnd)];
}

function parseTime(timeStr: string): any {
  if (!timeStr) return null;
  
  const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  
  const [, hourStr, minuteStr = '00', ampm] = match;
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  
  if (ampm) {
    const isPM = /pm/i.test(ampm);
    if (isPM && hour !== 12) {
      hour += 12;
    } else if (!isPM && hour === 12) {
      hour = 0;
    }
  }
  
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  
  return { hour, minute };
}

// Template normalization utility - injects from_time / to_time for template compatibility
function normalizeTemplateRules(json: any): any {
  if (!json) return json;

  console.log('normalizeTemplateRules: Processing template JSON');

  // Helper to process any array that might hold time_range
  const injectTimes = (arr: any[] = []) => {
    return arr.map((rule: any) => {
      if (rule.time_range && (!rule.from_time || !rule.to_time)) {
        console.log(`normalizeTemplateRules: Processing time_range "${rule.time_range}"`);
        const [from, to] = splitTimeRange(rule.time_range);
        if (from && to) {
          console.log(`normalizeTemplateRules: Injected from_time={h:${from.hour}, m:${from.minute}} to_time={h:${to.hour}, m:${to.minute}}`);
          return { ...rule, from_time: from, to_time: to };
        } else {
          console.warn(`normalizeTemplateRules: Failed to parse time_range "${rule.time_range}"`);
        }
      }
      return rule;
    });
  };

  // Process all rule types that support time ranges
  const normalizedJson = {
    ...json,
    parsed_rule_blocks: {
      ...json.parsed_rule_blocks,
      pricing_rules: injectTimes(json.parsed_rule_blocks?.pricing_rules),
      booking_conditions: injectTimes(json.parsed_rule_blocks?.booking_conditions),
      buffer_time_rules: injectTimes(json.parsed_rule_blocks?.buffer_time_rules),
      quota_rules: injectTimes(json.parsed_rule_blocks?.quota_rules),
      booking_window_rules: injectTimes(json.parsed_rule_blocks?.booking_window_rules),
      space_sharing: json.parsed_rule_blocks?.space_sharing || []
    }
  };

  // Ensure rule_blocks exist in setup_guide steps and include derived times
  if (normalizedJson.setup_guide) {
    normalizedJson.setup_guide = normalizedJson.setup_guide.map((step: any) => {
      switch (step.step_key) {
        case 'pricing_rules':
          return { ...step, rule_blocks: normalizedJson.parsed_rule_blocks.pricing_rules };
        case 'booking_conditions':
          return { ...step, rule_blocks: normalizedJson.parsed_rule_blocks.booking_conditions };
        case 'buffer_time_rules':
          return { ...step, rule_blocks: normalizedJson.parsed_rule_blocks.buffer_time_rules };
        case 'quota_rules':
          return { ...step, rule_blocks: normalizedJson.parsed_rule_blocks.quota_rules };
        case 'booking_window_rules':
          return { ...step, rule_blocks: normalizedJson.parsed_rule_blocks.booking_window_rules };
        case 'space_sharing':
          return { ...step, connections: normalizedJson.parsed_rule_blocks.space_sharing };
        default:
          return step;
      }
    });
  }

  console.log('normalizeTemplateRules: Template normalization complete');
  return normalizedJson;
}

// Convert time_range to from_time/to_time for template rule blocks
function ensureRuleBlocks(parsedResult: any) {
  console.log('ensureRuleBlocks: Processing parsed result');
  
  if (parsedResult.parsed_rule_blocks?.pricing_rules) {
    console.log(`ensureRuleBlocks: Processing ${parsedResult.parsed_rule_blocks.pricing_rules.length} pricing rules`);
    parsedResult.parsed_rule_blocks.pricing_rules.forEach((rule: any, index: number) => {
      if (rule.time_range && (!rule.from_time || !rule.to_time)) {
        console.log(`ensureRuleBlocks: Converting time_range "${rule.time_range}" for pricing rule ${index}`);
        const [fromTime, toTime] = splitTimeRange(rule.time_range);
        if (fromTime && toTime) {
          // Assign BEFORE any object spreading to prevent overwriting
          rule.from_time = fromTime;
          rule.to_time = toTime;
          console.log(`ensureRuleBlocks: Set pricing rule ${index} from_time={h:${fromTime.hour}, m:${fromTime.minute}} to_time={h:${toTime.hour}, m:${toTime.minute}}`);
        } else {
          console.warn(`ensureRuleBlocks: Failed to parse time_range "${rule.time_range}" for pricing rule ${index}`);
        }
      }
    });
  }

  if (parsedResult.parsed_rule_blocks?.booking_conditions) {
    console.log(`ensureRuleBlocks: Processing ${parsedResult.parsed_rule_blocks.booking_conditions.length} booking conditions`);
    parsedResult.parsed_rule_blocks.booking_conditions.forEach((rule: any, index: number) => {
      if (rule.time_range && (!rule.from_time || !rule.to_time)) {
        console.log(`ensureRuleBlocks: Converting time_range "${rule.time_range}" for booking condition ${index}`);
        const [fromTime, toTime] = splitTimeRange(rule.time_range);
        if (fromTime && toTime) {
          rule.from_time = fromTime;
          rule.to_time = toTime;
          console.log(`ensureRuleBlocks: Set booking condition ${index} from_time={h:${fromTime.hour}, m:${fromTime.minute}} to_time={h:${toTime.hour}, m:${toTime.minute}}`);
        }
      }
    });
  }

  // Apply to other rule types as needed
  ['quota_rules', 'buffer_time_rules', 'booking_window_rules'].forEach(ruleType => {
    if (parsedResult.parsed_rule_blocks?.[ruleType]) {
      console.log(`ensureRuleBlocks: Processing ${parsedResult.parsed_rule_blocks[ruleType].length} ${ruleType}`);
      parsedResult.parsed_rule_blocks[ruleType].forEach((rule: any, index: number) => {
        if (rule.time_range && (!rule.from_time || !rule.to_time)) {
          console.log(`ensureRuleBlocks: Converting time_range "${rule.time_range}" for ${ruleType} ${index}`);
          const [fromTime, toTime] = splitTimeRange(rule.time_range);
          if (fromTime && toTime) {
            rule.from_time = fromTime;
            rule.to_time = toTime;
            console.log(`ensureRuleBlocks: Set ${ruleType} ${index} from_time={h:${fromTime.hour}, m:${fromTime.minute}} to_time={h:${toTime.hour}, m:${toTime.minute}}`);
          }
        }
      });
    }
  });
}

// Force guide generation - ensures setup_guide steps exist for any populated rule arrays
function forceGuide(json: any): any {
  const ruleMap = {
    pricing_rules: 'pricing_rules',
    booking_conditions: 'booking_conditions',
    quota_rules: 'quota_rules',
    buffer_time_rules: 'buffer_time_rules',
    booking_window_rules: 'booking_window_rules',
    space_sharing: 'space_sharing'
  };

  if (!Array.isArray(json.setup_guide)) json.setup_guide = [];

  Object.entries(ruleMap).forEach(([key, stepKey]) => {
    if (Array.isArray(json[key]) && json[key].length) {
      const exists = json.setup_guide.some((s: any) => s.step_key === stepKey);
      if (!exists) {
        console.log(`[forceGuide] Auto-injecting missing step: ${stepKey} with ${json[key].length} rules`);
        json.setup_guide.push({
          title: `Step: ${stepKey.replace(/_/g, ' ')}`,
          step_key: stepKey,
          instruction: `Auto-injected by forceGuide - Go to Settings and create the following ${stepKey.replace(/_/g, ' ')}:`,
          rule_blocks: json[key]
        });
      }
    }
  });

  console.log(`[forceGuide] Final setup_guide has ${json.setup_guide.length} steps: ${json.setup_guide.map((s: any) => s.step_key).join(', ')}`);
  return json;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Check if this is a template fetch request
    const url = new URL(req.url);
    const templateId = url.searchParams.get('template_id');
    
    if (templateId && req.method === "GET") {
      // This is a template fetch request - apply normalization
      console.log(`Fetching template ${templateId} with normalization`);
      
      // Here you would normally fetch from Supabase, but since we don't have direct DB access
      // in this edge function context for templates, we'll return a placeholder response
      // The actual template fetching would happen in the frontend and then use normalizeTemplateRules
      
      return new Response(
        JSON.stringify({ 
          error: "Template fetching should be handled by frontend with normalization",
          suggestion: "Use normalizeTemplateRules utility after fetching template data"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the OpenAI API key from environment variables
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ 
          error: "OpenAI API key not configured",
          details: "Please set the OPENAI_API_KEY in your Supabase Edge Function secrets."
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the request body
    const { rule } = await req.json();

    if (!rule) {
      return new Response(
        JSON.stringify({ error: "Booking rule text is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing rule: "${rule}"`);

    // Call OpenAI API
    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a venue automation assistant helping admins configure complex booking logic using natural language prompts.

CRITICAL: When the user provides a prompt, you MUST return a complete JSON structure with ALL relevant rule types. If the user mentions hourly and daily pricing, always output a pricing_rules array with at least two objects: one per_hour and one fixed. If the user mentions a tag restriction ("only X"), output a booking_conditions array with operator "contains_none_of" and value = [tag].

When the user provides a prompt, return the following JSON structure:

1. **parsed_rule_blocks** – condition blocks parsed from the prompt.
2. **setup_guide** – a step-by-step instructional array including:
   - Step 1: Create spaces
   - Step 2: Add hours of availability (NEW)
   - Step 3: Create user tags (mention negative logic where needed)
   - Step 4: Booking conditions
   - Step 5: Pricing rules (if applicable)
   - Step 6: Quota rules (if applicable)
   - Step 7: Buffer times (if applicable)
   - Step 8: Booking window rules (if applicable)
   - Step 9: Space-sharing rules (if applicable) - NEW
3. **summary** – natural language explanation of what these rules accomplish

### CRITICAL: Space-Sharing Rules Detection and Logic:

**SPACE-SHARING PATTERNS** (Mutual exclusivity between spaces):
- Phrases: "If [X] is booked, block [Y]", "Booking [X] should prevent [Y]", "[X] and [Y] are mutually exclusive", "whole venue", "entire venue", "full venue"
- Logic: Create bidirectional connections for mutual exclusivity
- Example: "If Basketball Court is booked, block Badminton 1 and Badminton 2" → 
  space_sharing: [{"from":"Basketball Court","to":"Badminton 1"}, {"from":"Basketball Court","to":"Badminton 2"}]

**CHAINED DEPENDENCIES**:
- Auto-detect chains (A→B, B→C) and include implied pairs (A→C) in explanations
- Limit to 30 pairs maximum to prevent circular loops

### CRITICAL: Booking Conditions Logic Rules for Tag-Based Access:

**EXCLUSIVE ACCESS PATTERNS** (Only X can book, X only, X exclusively):
- Phrases: "Only [X] can book", "[X] can book and no one else", "[X] exclusively", "[X] only"
- Logic: Use 'contains none of' + [X] (blocks users WITHOUT the tag)
- Example: "Only Premium Members" → operator: "contains_none_of", value: ["Premium Members"]

**INCLUSIVE ACCESS PATTERNS** (Everyone except X):
- Phrases: "All except [X]", "Everyone but [X]", "[X] cannot book", "No [X] allowed"
- Logic: Use 'contains any of' + [X] (blocks users WITH the tag)
- Example: "All except Staff" → operator: "contains_any_of", value: ["Staff"]

### CRITICAL: Pricing Rules Logic - POSITIVE INCLUSION ONLY:

**PRICING RULES SPECIFY WHO GETS THE PRICE** (never negative logic):
- Phrases: "[X] pay $Y", "[X] are charged $Y", "Rate for [X] is $Y"
- Logic: Use 'contains any of' + [X] (price applies TO users with the tag)
- Example: "Premium Members pay $50" → operator: "contains_any_of", value: ["Premium Members"]

**PRICING EXCLUSION PATTERNS** (Everyone except X pays):
- Phrases: "Everyone except [X] pays $Y", "All but [X] are charged $Y"
- Logic: Use 'contains none of' + [X] (price applies to users WITHOUT the tag)
- Example: "Everyone except Basic pays $100" → operator: "contains_none_of", value: ["Basic"]

**PRICING TYPE DETECTION**:
- Fixed rate phrases: "flat rate", "flat fee", "fixed rate", "fixed fee", "$200 flat"
- Per-hour phrases: "$40 per hour", "$25/hour", "hourly rate"

**FIXED-RATE PRICING PRIORITY**:
- When a prompt includes fixed pricing ("$200 flat", "fixed rate"), the fixed-rate rule MUST be listed first in pricing_rules[] for that space/time.
- Sort order: pricing_type "fixed" before "per_hour" or other per-period rates.

**MULTIPLE CONDITIONS FOR SAME SPACE/TIME**:
- When multiple duration/tag conditions apply to identical space + time + days, group them as sub_conditions[] within one rule object:
- Example: {
    "space": ["Studio X"],
    "time_range": "07:00–21:00", 
    "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "rate": { "amount": 200, "unit": "fixed" },
    "sub_conditions": [
      { "condition_type": "duration", "operator": "is_greater_than", "value": "4h", "logic": "AND" },
      { "condition_type": "duration", "operator": "is_greater_than_or_equal_to", "value": "15min", "logic": "AND" }
    ]
  }

**NO TAG FILTER** (All users get this price):
- Phrases: "All users pay $Y", "$Y for everyone", "Standard rate $Y"
- Logic: No condition_type or use 'duration' condition instead
- Example: "Studio costs $40/hour" → condition_type: "duration", operator: "is_greater_than", value: "0min"

### CRITICAL: Booking Window Rules Comparison Logic and Unit Normalization:

**COMPARISON OPERATOR MAPPING** (Critical for correct booking window logic):
- Phrases with "more than", "no more than", "not more than", "stop from booking more than", "over", "beyond", "at least", "minimum of":
  - Logic: Use 'more_than' constraint (blocks if booking is BEYOND X hours)
  - Example: "Stop Public from booking more than 36 hours in advance" → constraint: "more_than", value: 36

- Phrases with "less than", "within", "inside", "up to", "no less than":
  - Logic: Use 'less_than' constraint (blocks if booking is INSIDE X hours)
  - Example: "Public cannot book less than 6 hours ahead" → constraint: "less_than", value: 6

**UNIT NORMALIZATION FOR BOOKING WINDOWS**:
- Always convert time values to hours for internal processing:
  - Days to hours: "3 days" → 72 hours
  - Weeks to hours: "1 week" → 168 hours
  - Keep hours as-is: "36 hours" → 36 hours
- Store both converted value and display text:
  - value: 168 (hours)
  - display: "1 week"
- The UI will show "hours in advance" but explanations use original units

**NATURAL LANGUAGE TIME PHRASES**:
- "reserve ahead of time", "in advance", "notice" → booking window context
- "one week", "two days", "three hours" → convert number words
- "48 hours", "3 days", "1 week" → extract and normalize

### Booking Conditions Logic Rules:
- Booking conditions define when a booking is NOT ALLOWED.
- For exclusive access ("Only X can book"), use 'contains none of' + [X] to block users without tag X.
- For inclusive access ("All except X"), use 'contains any of' + [X] to block users with tag X.
- Always structure time ranges as 'HH:MM–HH:MM' format with 15-minute increments (e.g., "09:00–17:00").

Available tags for logic: ["Public", "The Team", "Premium Members", "Gold Members", "Basic", "VIP", "Staff", "Instructor", "Pro Member", "Visitor", "Coaches"]

### Output Keys:
Each step must include a unique \`step_key\` for internal use:
- create_spaces
- hours_of_availability (NEW)
- create_user_tags  
- booking_conditions
- pricing_rules
- quota_rules
- buffer_time_rules
- booking_window_rules
- space_sharing (NEW)

### Setup Guide Steps:
Generate steps dynamically based on the rule blocks needed. Always include create_spaces, hours_of_availability, and create_user_tags if any user tags are referenced.

For each rule step, include:
- step_key: unique identifier
- title: "Step X: [Action]"
- instruction: Clear direction where to go in the system
- rule_blocks: the actual rule objects (only for rule configuration steps)

### Rule Schemas:

booking_conditions: [
  {
    space: ["Space 1", "Space 2"],
    time_range: "09:00–17:00",
    days: ["Monday", "Tuesday"],
    condition_type: "duration" | "user_tags",
    operator: "is_greater_than" | "contains_any_of" | "contains_none_of" | ...,
    value: "1h" | ["Premium Members"] (specific allowed/disallowed tags, not complements),
    explanation: "Clear description of this restriction condition"
  }
]

pricing_rules: [
  {
    space: ["Space 1"],
    time_range: "17:00–22:00", 
    days: ["Monday", "Tuesday"],
    rate: { amount: 25, unit: "per_hour" | "fixed" },
    condition_type: "duration" | "user_tags",
    operator: "is_less_than" | "contains_any_of" | "contains_none_of" | ...,
    value: "1h" | ["Premium Members"] (for user_tags: who GETS this price, not who doesn't),
    sub_conditions?: [
      {
        condition_type: "duration" | "user_tags",
        operator: string,
        value: string | string[],
        logic: "AND" | "OR"
      }
    ],
    explanation: "Clear description of this pricing rule"
  }
]

quota_rules: [
  {
    target: "individuals" | "individuals_with_tags" | "group_with_tag",
    tags: ["Member"] (optional),
    quota_type: "time" | "count", 
    value: "5h" | 3,
    period: "day" | "week" | "month" | "at_any_time",
    affected_spaces: ["Gym", "Court A"],
    consideration_time: "any_time" | "specific_time",
    time_range: "07:00–20:00",
    days: ["Monday", "Tuesday"],
    explanation: "Clear description of this quota rule"
  }
]

buffer_time_rules: [
  {
    spaces: ["Studio 1", "Studio 2"],
    buffer_duration: "30min",
    explanation: "Clear description of this buffer rule"
  }
]

booking_window_rules: [
  {
    user_scope: "all_users" | "users_with_tags" | "users_with_no_tags",
    tags: ["Basic"] (optional),
    constraint: "less_than" | "more_than", 
    value: 72,
    unit: "hours",
    display: "3 days",
    spaces: ["Court 1", "Studio"],
    explanation: "Clear description of this booking window rule"
  }
]

space_sharing: [
  {
    from: "Basketball Court",
    to: "Badminton 1"
  }
]

### Output Format (Required)
Return a **clean JSON object** in this structure:
{
  "parsed_rule_blocks": {
    "booking_conditions": [...],
    "pricing_rules": [...],
    "quota_rules": [...],
    "buffer_time_rules": [...], 
    "booking_window_rules": [...],
    "space_sharing": [...]
  },
  "setup_guide": [
    {
      "step_key": "create_spaces",
      "title": "Step 1: Create the required spaces",
      "instruction": "Go to Settings > Spaces and click 'Add Space'. Create these spaces: [list specific space names from the prompt]",
      "spaces": ["Studio X", "Gym Floor"]
    },
    {
      "step_key": "hours_of_availability", 
      "title": "Step 2: Add hours of availability",
      "instruction": "Go to Settings › Hours of availability and set each space to at least 07:00 AM – 09:00 PM for Monday–Friday. Adjust weekend hours as needed.",
      "spaces": ["Studio X", "Gym Floor"],
      "times": "07:00 AM – 09:00 PM"
    },
    {
      "step_key": "create_user_tags", 
      "title": "Step 3: Add user tags",
      "instruction": "Go to Users > Manage Tags and add: [list specific tags]. Note: For booking conditions with exclusive access (Only X can book), use 'contains none of' with the allowed tag. For pricing rules, use 'contains any of' with tags that should receive the price."
    },
    {
      "step_key": "booking_conditions",
      "title": "Step 4: Create booking conditions", 
      "instruction": "Go to Settings > Conditions and create the following restriction rules:",
      "rule_blocks": [...]
    },
    {
      "step_key": "pricing_rules",
      "title": "Step 5: Create pricing rules", 
      "instruction": "Go to Settings > Pricing and create the following pricing rules:",
      "rule_blocks": [...]
    },
    {
      "step_key": "space_sharing",
      "title": "Step 9: Set space-sharing rules",
      "instruction": "Go to Settings › Space Sharing and add the following connections:",
      "connections": [{"from":"Basketball Court","to":"Badminton 1"}, {"from":"Basketball Court","to":"Badminton 2"}]
    }
  ],
  "summary": "This setup ensures that..."
}

Your JSON should never be wrapped in markdown backticks or contain extra notes. Use empty arrays for any missing rule categories.`,
          },
          {
            role: "user",
            content: rule,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!openAiResponse.ok) {
      const errorData = await openAiResponse.json();
      console.error("OpenAI API error:", errorData);
      
      // Extract specific error message if available
      const errorMessage = errorData?.error?.message || "Unknown OpenAI API error";
      
      return new Response(
        JSON.stringify({ 
          error: "OpenAI API error", 
          details: errorMessage 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openAiData = await openAiResponse.json();
    console.log('[GPT raw response]', JSON.stringify(openAiData, null, 2));
    
    let responseContent = openAiData.choices[0].message.content;

    // Clean up markdown code blocks if present
    if (responseContent.includes('```json')) {
      responseContent = responseContent.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    }
    
    // Also handle cases where it might just have backticks
    if (responseContent.startsWith('```') && responseContent.endsWith('```')) {
      responseContent = responseContent.slice(3, -3).trim();
    }

    console.log("Cleaned response content:", responseContent);

    let parsedResult;
    try {
      parsedResult = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.error("Response content that failed to parse:", responseContent);
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse AI response", 
          details: "The AI returned an invalid JSON format" 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Debug: Log the parsed result structure
    console.log('[Parsed result structure]', {
      pricing_rules_count: parsedResult.parsed_rule_blocks?.pricing_rules?.length || 0,
      booking_conditions_count: parsedResult.parsed_rule_blocks?.booking_conditions?.length || 0,
      setup_guide_count: parsedResult.setup_guide?.length || 0,
      setup_guide_keys: parsedResult.setup_guide?.map((s: any) => s.step_key) || []
    });

    // Convert time_range to from_time/to_time for template compatibility
    ensureRuleBlocks(parsedResult);

    // Apply forceGuide to ensure setup_guide completeness
    const finalResult = forceGuide(parsedResult);

    // Final debug: Log the final result structure
    console.log('[Final result structure after forceGuide]', {
      pricing_rules_count: finalResult.parsed_rule_blocks?.pricing_rules?.length || 0,
      booking_conditions_count: finalResult.parsed_rule_blocks?.booking_conditions?.length || 0,
      setup_guide_count: finalResult.setup_guide?.length || 0,
      setup_guide_keys: finalResult.setup_guide?.map((s: any) => s.step_key) || []
    });

    return new Response(JSON.stringify(finalResult), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message || "An unknown error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
