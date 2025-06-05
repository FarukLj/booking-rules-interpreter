
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface ParsedTime {
  hour: number;
  minute: number;
}

function splitTimeRange(str: string): [ParsedTime | null, ParsedTime | null] {
  if (!str) return [null, null];
  
  const normalized = str.replace(/—|–|\s+to\s+/gi, '-').replace(/\s+/g, '');
  const [rawStart, rawEnd] = normalized.split('-');

  const parseTime = (timeStr: string): ParsedTime | null => {
    if (!timeStr) return null;
    
    const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/i);
    if (!match) return null;

    const [, hourStr, minuteStr = '00', ampm] = match;
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (ampm) {
      const isAM = /am/i.test(ampm);
      const isPM = /pm/i.test(ampm);
      
      if (isPM && hour !== 12) {
        hour += 12;
      } else if (isAM && hour === 12) {
        hour = 0;
      }
    }

    return { hour, minute };
  };

  return [parseTime(rawStart), parseTime(rawEnd)];
}

function formatTime(time: ParsedTime): string {
  const hour = time.hour.toString().padStart(2, '0');
  const minute = time.minute.toString().padStart(2, '0');
  return `${hour}:${minute}`;
}

function normalizeTemplate(json: any): any {
  const injectTimeFields = (ruleArray: any[] = []) => {
    return ruleArray.map(rule => {
      if (rule.time_range && (!rule.from_time || !rule.to_time)) {
        const [fromTime, toTime] = splitTimeRange(rule.time_range);
        return {
          ...rule,
          from_time: fromTime ? formatTime(fromTime) : null,
          to_time: toTime ? formatTime(toTime) : null
        };
      }
      return rule;
    });
  };

  json.pricing_rules = injectTimeFields(json.pricing_rules);
  json.booking_conditions = injectTimeFields(json.booking_conditions);
  json.quota_rules = injectTimeFields(json.quota_rules);
  json.buffer_time_rules = injectTimeFields(json.buffer_time_rules);
  json.booking_window_rules = injectTimeFields(json.booking_window_rules);
  json.space_sharing = json.space_sharing || [];

  // Synthesize setup_guide for library mode
  if (!Array.isArray(json.setup_guide)) {
    json.setup_guide = [];
  }

  const addSetupStep = (ruleKey: string, stepKey: string, title: string) => {
    if (json[ruleKey]?.length && !json.setup_guide.some((s: any) => s.step_key === stepKey)) {
      json.setup_guide.push({
        step_key: stepKey,
        title: `Step: ${title}`,
        instruction: 'Configure these rule blocks in your booking system',
        rule_blocks: json[ruleKey]
      });
    }
  };

  addSetupStep('pricing_rules', 'pricing_rules', 'Pricing Rules');
  addSetupStep('booking_conditions', 'booking_conditions', 'Booking Conditions');
  addSetupStep('quota_rules', 'quota_rules', 'Quota Rules');
  addSetupStep('buffer_time_rules', 'buffer_time_rules', 'Buffer Time Rules');
  addSetupStep('booking_window_rules', 'booking_window_rules', 'Booking Window Rules');
  addSetupStep('space_sharing', 'space_sharing', 'Space Sharing Rules');

  return json;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { templateId } = await req.json();

    if (!templateId) {
      return new Response(
        JSON.stringify({ error: "Template ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Here you would typically fetch from Supabase
    // For now, return the normalized template
    const normalizedTemplate = normalizeTemplate({});

    return new Response(JSON.stringify(normalizedTemplate), {
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
