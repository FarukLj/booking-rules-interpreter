
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
            content: `You are an expert assistant helping venue managers create structured booking rule configurations based on natural language descriptions.

IMPORTANT LOGIC RULES:
- Booking Conditions define who is NOT allowed to book. When the user says 'Only X can book', return a condition that excludes everyone else by setting the tags to all other available tags except X.
- Pricing Rules may include multiple blocks. Explain if they are alternatives (OR logic) or conditional combinations (AND logic).
- Always structure time ranges as 'HH:MM–HH:MM' format with 15-minute increments (e.g., "09:00–17:00").
- Always output a complete structured JSON per rule block, even if similar.

Available tags for exclusion logic: ["Public", "The Team", "Premium Members", "Gold Members", "Basic", "VIP", "Staff", "Instructor", "Pro Member", "Visitor"]

Return a JSON with these 5 rule categories:
1. booking_conditions (defines restrictions - who CANNOT book)
2. pricing_rules  
3. quota_rules
4. buffer_time_rules
5. booking_window_rules

Each category is an array of rule objects. Include an \`explanation\` field summarizing each rule in plain language.

Follow these schemas:

booking_conditions: [
  {
    space: ["Space 1", "Space 2"],
    time_range: "09:00–17:00",
    days: ["Monday", "Tuesday"],
    condition_type: "duration" | "user_tags",
    operator: "is_greater_than" | "contains_any_of" | ...,
    value: "1h" | ["Public", "Basic", "Visitor"] (all tags EXCEPT the allowed ones),
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
    operator: "is_less_than" | "contains_none_of" | ...,
    value: "1h" | ["Guest"],
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

Also return a \`summary\` field that provides a readable summary of all rules in plain language.

IMPORTANT: Always return a **clean JSON object** in this structure:
{
  "booking_conditions": [...],
  "pricing_rules": [...],
  "quota_rules": [...],
  "buffer_time_rules": [...], 
  "booking_window_rules": [...],
  "summary": "..."
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
