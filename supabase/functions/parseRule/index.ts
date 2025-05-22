
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
        JSON.stringify({ error: "OpenAI API key not configured" }),
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
            content: `You are an AI assistant that converts natural language booking rules into structured JSON data for a venue management system. Always return only valid JSON—no explanations or formatting outside of the JSON object.

Extract and return the following fields:

1. spaceName: the name of the space being referred to
2. availability: clear human-readable availability (e.g., "Monday–Sunday, 9am–10pm")
3. allowedUsers: either a single user group (string) or an array of allowed user tags
4. pricing: an object that includes:
   - hourlyRate: the hourly price (if any), as a string like "$25/hour"
   - dailyRate: the full-day rate (if any), as a string like "$150/day"
   - weekendRules: any weekend-specific pricing notes (if applicable)
5. explanation: a plain-English explanation of the rule
6. aiReasoning: a transparent description of how you derived the JSON values

IMPORTANT: Always return a **clean JSON object** in this structure:
{
  "spaceName": "...",
  "availability": "...",
  "allowedUsers": "...",
  "pricing": {
    "hourlyRate": "...",
    "dailyRate": "...",
    "weekendRules": "..."
  },
  "explanation": "...",
  "aiReasoning": "..."
}

Your JSON should never be wrapped in markdown backticks or contain extra notes. Use null or empty strings for any missing data.`,
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
      return new Response(
        JSON.stringify({ error: "Failed to process with AI" }),
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
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
