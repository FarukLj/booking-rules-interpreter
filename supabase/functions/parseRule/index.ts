
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

When the user provides a prompt, return the following JSON structure:

1. **parsed_rule_blocks** – condition blocks parsed from the prompt.
2. **setup_guide** – a step-by-step instructional array including:
   - Step 1: Create spaces
   - Step 2: Create user tags (mention negative logic where needed)
   - Step 3: Booking conditions
   - Step 4: Pricing rules (if applicable)
   - Step 5: Quota rules (if applicable)
   - Step 6: Buffer times (if applicable)
   - Step 7: Booking window rules (if applicable)
3. **summary** – natural language explanation of what these rules accomplish

### CRITICAL: Booking Conditions Logic Rules for Tag-Based Access:

**EXCLUSIVE ACCESS PATTERNS** (Only X can book, X only, X exclusively):
- Phrases: "Only [X] can book", "[X] can book and no one else", "[X] exclusively", "[X] only"
- Logic: Use 'contains none of' + [X] (blocks users WITHOUT the tag)
- Example: "Only Premium Members" → operator: "contains_none_of", value: ["Premium Members"]

**INCLUSIVE ACCESS PATTERNS** (Everyone except X):
- Phrases: "All except [X]", "Everyone but [X]", "[X] cannot book", "No [X] allowed"
- Logic: Use 'contains any of' + [X] (blocks users WITH the tag)
- Example: "All except Staff" → operator: "contains_any_of", value: ["Staff"]

**NEVER use 'contains none of' with complement tags** (all tags except the allowed ones) - this creates double-negative logic.

### CRITICAL: Pricing Rules Logic - POSITIVE INCLUSION ONLY:

**PRICING RULES SPECIFY WHO GETS THE PRICE** (never negative logic):
- Phrases: "[X] pay $Y", "[X] are charged $Y", "Rate for [X] is $Y"
- Logic: Use 'contains any of' + [X] (price applies TO users with the tag)
- Example: "Premium Members pay $50" → operator: "contains_any_of", value: ["Premium Members"]

**PRICING EXCLUSION PATTERNS** (Everyone except X pays):
- Phrases: "Everyone except [X] pays $Y", "All but [X] are charged $Y"
- Logic: Use 'contains none of' + [X] (price applies to users WITHOUT the tag)
- Example: "Everyone except Basic pays $100" → operator: "contains_none_of", value: ["Basic"]

**NO TAG FILTER** (All users get this price):
- Phrases: "All users pay $Y", "$Y for everyone", "Standard rate $Y"
- Logic: No condition_type or use 'duration' condition instead
- Example: "Studio costs $40/hour" → condition_type: "duration", operator: "is_greater_than", value: "0min"

### Booking Conditions Logic Rules:
- Booking conditions define when a booking is NOT ALLOWED.
- For exclusive access ("Only X can book"), use 'contains none of' + [X] to block users without tag X.
- For inclusive access ("All except X"), use 'contains any of' + [X] to block users with tag X.
- Always structure time ranges as 'HH:MM–HH:MM' format with 15-minute increments (e.g., "09:00–17:00").

Available tags for logic: ["Public", "The Team", "Premium Members", "Gold Members", "Basic", "VIP", "Staff", "Instructor", "Pro Member", "Visitor"]

### Output Keys:
Each step must include a unique \`step_key\` for internal use:
- create_spaces
- create_user_tags  
- booking_conditions
- pricing_rules
- quota_rules
- buffer_time_rules
- booking_window_rules

### Setup Guide Steps:
Generate steps dynamically based on the rule blocks needed. Always include create_spaces and create_user_tags if any user tags are referenced.

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
    rate: { amount: 25, unit: "per_hour" },
    condition_type: "duration" | "user_tags",
    operator: "is_less_than" | "contains_any_of" | "contains_none_of" | ...,
    value: "1h" | ["Premium Members"] (for user_tags: who GETS this price, not who doesn't),
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
    spaces: ["Court 1", "Studio"],
    explanation: "Clear description of this booking window rule"
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
    "booking_window_rules": [...]
  },
  "setup_guide": [
    {
      "step_key": "create_spaces",
      "title": "Step 1: Create the required spaces",
      "instruction": "Go to Settings > Spaces and click 'Add Space'. Create these spaces: [list specific space names from the prompt]"
    },
    {
      "step_key": "create_user_tags", 
      "title": "Step 2: Add user tags",
      "instruction": "Go to Users > Manage Tags and add: [list specific tags]. Note: For booking conditions with exclusive access (Only X can book), use 'contains none of' with the allowed tag. For pricing rules, use 'contains any of' with tags that should receive the price."
    },
    {
      "step_key": "booking_conditions",
      "title": "Step 3: Create booking conditions", 
      "instruction": "Go to Settings > Conditions and create the following restriction rules:",
      "rule_blocks": [...]
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
    const parsedResult = JSON.parse(openAiData.choices[0].message.content);

    return new Response(JSON.stringify(parsedResult), {
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
