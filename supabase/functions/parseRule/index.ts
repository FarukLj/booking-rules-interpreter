
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Core parsing utilities
const parseTimeRange = (text: string): string => {
  console.log('[parseTimeRange] Input:', text);
  
  // Handle "after X PM/AM" pattern
  const afterMatch = text.match(/after\s+(\d{1,2})\s*(AM|PM)/i);
  if (afterMatch) {
    const hour = parseInt(afterMatch[1]);
    const period = afterMatch[2].toUpperCase();
    let h24 = period === 'PM' && hour !== 12 ? hour + 12 : hour;
    if (period === 'AM' && hour === 12) h24 = 0;
    return `${h24.toString().padStart(2, '0')}:00–24:00`;
  }
  
  // Handle "before X PM/AM" pattern
  const beforeMatch = text.match(/before\s+(\d{1,2})\s*(AM|PM)/i);
  if (beforeMatch) {
    const hour = parseInt(beforeMatch[1]);
    const period = beforeMatch[2].toUpperCase();
    let h24 = period === 'PM' && hour !== 12 ? hour + 12 : hour;
    if (period === 'AM' && hour === 12) h24 = 0;
    return `00:00–${h24.toString().padStart(2, '0')}:00`;
  }
  
  // Handle time ranges like "6 AM-4 PM"
  const rangeMatch = text.match(/(\d{1,2})\s*(AM|PM)\s*[-–]\s*(\d{1,2})\s*(AM|PM)/i);
  if (rangeMatch) {
    const [, startHour, startPeriod, endHour, endPeriod] = rangeMatch;
    const convertTo24Hour = (hour: string, period: string): string => {
      let h = parseInt(hour);
      if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
      if (period.toUpperCase() === 'AM' && h === 12) h = 0;
      return h.toString().padStart(2, '0') + ':00';
    };
    
    return `${convertTo24Hour(startHour, startPeriod)}–${convertTo24Hour(endHour, endPeriod)}`;
  }
  
  // Default to all day
  if (/all day|entire day|24 h/i.test(text)) {
    return "00:00–24:00";
  }
  
  return "00:00–24:00";
};

const detectSpecificDates = (text: string): boolean => {
  const datePatterns = [
    /\b\d{4}-\d{2}-\d{2}\b/, // ISO format: 2024-08-01
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/, // US format: 8/1/2024
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i, // Aug 1
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/i
  ];
  
  return datePatterns.some(pattern => pattern.test(text));
};

const resolveTags = (tagNames: string[]): Array<{id?: string, name: string}> => {
  // For now, create placeholders - in real implementation would query database
  return tagNames.map(name => ({ name: name.trim() }));
};

const resolveSpaces = (spaceNames: string[]): Array<{id?: string, name: string}> => {
  // For now, create placeholders - in real implementation would query database
  return spaceNames.map(name => ({ name: name.trim() }));
};

const extractSpaces = (text: string): string[] => {
  console.log('[extractSpaces] Input:', text);
  const spaces = new Set<string>();
  
  // Enhanced pattern for numbered space ranges like "Sales Desks 1-10"
  const numberedRangePattern = /([A-Za-z\s]+?)s?\s+(\d+)[-–](\d+)/gi;
  const numberedRangeMatches = text.matchAll(numberedRangePattern);
  
  for (const match of numberedRangeMatches) {
    console.log('[extractSpaces] Found numbered range:', match[0]);
    const baseType = match[1].trim();
    const start = parseInt(match[2]);
    const end = parseInt(match[3]);
    
    // Generate individual spaces for the range
    for (let i = start; i <= end; i++) {
      const spaceName = `${baseType} ${i}`;
      spaces.add(spaceName);
      console.log('[extractSpaces] Added space:', spaceName);
    }
  }
  
  // If we found numbered ranges, use those
  if (spaces.size > 0) {
    const result = Array.from(spaces);
    console.log('[extractSpaces] Final numbered range spaces:', result);
    return result;
  }
  
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
      space = space.replace(/^the\s+/i, '');
      spaces.add(space);
    }
  });
  
  const result = spaces.size > 0 ? Array.from(spaces) : ['all spaces'];
  console.log('[extractSpaces] Final spaces:', result);
  return result;
};

const extractUserGroups = (text: string): string[] => {
  console.log('[extractUserGroups] Analyzing:', text);
  
  const userGroupPatterns = [
    /(?:for\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:team|members?))?)\s+(?:can|must|should|are)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:team|members?))?)\s+(?:can|must|should)\s+(?:book|reserve|access)/gi,
    /members?\s+with\s+(?:the\s+)?['"']([^'"]+)['"']\s+tag/gi,
    /['"']([A-Z][a-zA-Z\s-]+)['"']\s+tagged/gi
  ];

  const groups = new Set<string>();
  
  userGroupPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        let group = match[1].trim();
        group = group.replace(/'/g, '').replace(/\s+/g, ' ');
        
        const skipWords = ['only', 'all', 'any', 'the', 'and', 'or', 'but'];
        if (!skipWords.includes(group.toLowerCase()) && group.length > 2) {
          groups.add(group);
        }
      }
    }
  });

  const result = Array.from(groups);
  console.log('[extractUserGroups] Extracted:', result);
  return result;
};

const parseConditions = (text: string, conditionType: string): Array<{field: string, operator: string, value: any}> => {
  const conditions = [];
  
  // Parse duration conditions
  if (conditionType === 'duration') {
    // Look for compound conditions with "or"
    const orParts = text.split(/\s+or\s+/i);
    
    for (const part of orParts) {
      const lessThanMatch = part.match(/(less than|shorter than|under)\s+(\d+(?:\.\d+)?)\s*(h|hour|hours|min|minutes)/i);
      if (lessThanMatch) {
        const value = parseFloat(lessThanMatch[2]);
        const unit = lessThanMatch[3].toLowerCase().startsWith('h') ? 'h' : 'min';
        conditions.push({
          field: 'duration',
          operator: '<',
          value: `${value}${unit}`
        });
      }
      
      const greaterThanMatch = part.match(/(more than|longer than|over)\s+(\d+(?:\.\d+)?)\s*(h|hour|hours|min|minutes)/i);
      if (greaterThanMatch) {
        const value = parseFloat(greaterThanMatch[2]);
        const unit = greaterThanMatch[3].toLowerCase().startsWith('h') ? 'h' : 'min';
        conditions.push({
          field: 'duration',
          operator: '>',
          value: `${value}${unit}`
        });
      }
    }
  }
  
  return conditions;
};

const generatePricingRules = (text: string, spaces: string[]): any[] => {
  console.log('[generatePricingRules] Input:', text);
  const rules = [];
  
  // Split by semicolons or other delimiters
  const segments = text.split(/[;]/);
  
  segments.forEach(segment => {
    // Match pricing patterns like "$40/hour after 5 PM"
    const pricingPattern = /\$(\d+(?:\.\d+)?)\s*(?:\/\s*)?(?:per\s+)?(hour|h|day)\s*(.+)?/gi;
    const pricingMatches = segment.matchAll(pricingPattern);
    
    for (const match of pricingMatches) {
      const amount = parseFloat(match[1]);
      const unit = match[2].toLowerCase().startsWith('h') ? 'per_hour' : 'per_day';
      const context = match[3] || '';
      
      const timeRange = parseTimeRange(context.length > 0 ? context : segment);
      
      const rule = {
        time_range: timeRange,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        spaces: resolveSpaces(spaces),
        rate: { amount, unit },
        conditions: []
      };
      
      // Check for user tag conditions
      const tagMatch = segment.match(/(?:for\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
      if (tagMatch) {
        rule.conditions.push({
          field: 'user_tags',
          operator: '=',
          value: [tagMatch[1]]
        });
      }
      
      rules.push(rule);
    }
  });
  
  console.log('[generatePricingRules] Generated:', rules);
  return rules;
};

const generateBookingWindowRules = (text: string, spaces: string[]): any[] => {
  console.log('[generateBookingWindowRules] Input:', text);
  const rules = [];
  
  // Enhanced patterns for parseRule-v3
  const windowPatterns = [
    // "Group should be able to book... for the next X days/hours/weeks"
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:team|members?))?)\s+should\s+be\s+able\s+to\s+book[^.]*?for\s+the\s+next\s+(\d+)\s+(days?|hours?|weeks?)/gi,
    
    // "Group can only book for the next X days/hours/weeks"  
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:team|members?))?)\s+can\s+only\s+book[^.]*?for\s+the\s+next\s+(\d+)\s+(days?|hours?|weeks?)/gi,
    
    // "Everybody else can only book for the next X days"
    /(everybody\s+else|everyone\s+else|all\s+other\s+users|others)\s+(?:can\s+only\s+book[^.]*?)?for\s+the\s+next\s+(\d+)\s+(days?|hours?|weeks?)/gi,
    
    // "up to/within X days/hours in advance"
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:team|members?))?)\s+(?:can\s+(?:only\s+)?(?:book|reserve))?\s*(?:up\s+to|within)\s+(\d+)\s+(days?|hours?|weeks?)\s+(?:in\s+)?advance/gi,
    
    // "at least X days/hours in advance"
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:team|members?))?)\s+(?:must|should)\s+(?:book|reserve)\s+(?:at\s+least)\s+(\d+)\s+(days?|hours?|weeks?)\s+(?:in\s+)?advance/gi
  ];

  windowPatterns.forEach((pattern, patternIndex) => {
    console.log(`[generateBookingWindowRules] Testing pattern ${patternIndex}`);
    const matches = text.matchAll(pattern);
    
    for (const match of matches) {
      console.log(`[generateBookingWindowRules] Pattern ${patternIndex} matched:`, match[0]);
      
      let userGroup: string;
      let value: number;
      let unit: string;
      let constraint: string;
      let tags_include: string[] = [];
      
      if (patternIndex <= 2) { // "for the next X" patterns
        userGroup = match[1].trim();
        value = parseInt(match[2]);
        unit = match[3].toLowerCase().replace(/s$/, '');
        constraint = "more_than"; // horizon cap
        
        // Handle "everybody else" case
        if (/everybody\s+else|everyone\s+else|all\s+other\s+users|others/i.test(userGroup)) {
          tags_include = []; // all users
        } else {
          tags_include = [userGroup];
        }
      } else if (patternIndex === 3) { // "up to/within" patterns
        userGroup = match[1].trim();
        value = parseInt(match[2]);
        unit = match[3].toLowerCase().replace(/s$/, '');
        constraint = "more_than"; // horizon cap
        tags_include = [userGroup];
      } else { // "at least" patterns
        userGroup = match[1].trim();
        value = parseInt(match[2]);
        unit = match[3].toLowerCase().replace(/s$/, '');
        constraint = "less_than"; // minimum notice
        tags_include = [userGroup];
      }
      
      const rule = {
        tags_include,
        constraint,
        value,
        unit
      };
      
      rules.push(rule);
      console.log('[generateBookingWindowRules] Added rule:', rule);
    }
  });
  
  console.log('[generateBookingWindowRules] Final rules:', rules);
  return rules;
};

const generateBookingConditionRules = (text: string, spaces: string[]): any[] => {
  console.log('[generateBookingConditionRules] Input:', text);
  const rules = [];
  
  // Look for duration conditions with compound logic
  const conditionMatch = text.match(/(less than|shorter than|more than|longer than).+?(or|and)/i);
  if (conditionMatch) {
    const conditions = parseConditions(text, 'duration');
    const logic = /\bor\b/i.test(text) ? 'OR' : 'AND';
    
    if (conditions.length > 0) {
      rules.push({
        spaces: resolveSpaces(spaces),
        time_range: "00:00–24:00",
        conditions,
        logic
      });
    }
  }
  
  console.log('[generateBookingConditionRules] Generated:', rules);
  return rules;
};

const generateBufferTimeRules = (text: string, spaces: string[]): any[] => {
  console.log('[generateBufferTimeRules] Input:', text);
  const rules = [];
  
  const bufferPattern = /(\d+)[-\s]?minute?s?\s+(?:clean[-\s]?up\s+)?buffer/gi;
  const bufferMatches = text.matchAll(bufferPattern);
  
  for (const match of bufferMatches) {
    const duration = `${match[1]}min`;
    
    rules.push({
      spaces: resolveSpaces(spaces),
      buffer_duration: duration,
      explanation: `${match[1]}-minute buffer between bookings`
    });
  }
  
  console.log('[generateBufferTimeRules] Generated:', rules);
  return rules;
};

const generateQuotaRules = (text: string, spaces: string[]): any[] => {
  console.log('[generateQuotaRules] Input:', text);
  const rules = [];
  
  const quotaPattern = /limit\s+(?:each\s+)?([^to]+)\s+to\s+(\d+)\s+(hours?|bookings?)\s+per\s+(day|week|month)/gi;
  const quotaMatches = text.matchAll(quotaPattern);
  
  for (const match of quotaMatches) {
    const subject = match[1].trim().toLowerCase().includes('player') ? 'any_individual' : 'tags_any';
    const value = parseInt(match[2]);
    const metric = match[3].toLowerCase().startsWith('hour') ? 'time_usage' : 'booking_count';
    const period = `per_${match[4].toLowerCase()}`;
    
    rules.push({
      subject,
      metric,
      limit_hours: metric === 'time_usage' ? value : undefined,
      period,
      spaces: resolveSpaces(spaces)
    });
  }
  
  console.log('[generateQuotaRules] Generated:', rules);
  return rules;
};

const generateSpaceSharingRules = (text: string): any[] => {
  console.log('[generateSpaceSharingRules] Input:', text);
  const rules = [];
  
  const exclusivityPattern = /if\s+([^,]+)\s+is\s+booked,?\s+([^,]+)\s+becomes?\s+unavailable/gi;
  const exclusivityMatches = text.matchAll(exclusivityPattern);
  
  for (const match of exclusivityMatches) {
    const primary = match[1].trim();
    const locks_with = [match[2].trim()];
    
    rules.push({ primary, locks_with });
    
    // Add reverse relationship for "vice versa"
    if (/vice versa|vice-versa/i.test(text)) {
      rules.push({ primary: match[2].trim(), locks_with: [primary] });
    }
  }
  
  console.log('[generateSpaceSharingRules] Generated:', rules);
  return rules;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rule: inputRule } = await req.json();
    console.log('parseRule-v3 processing:', inputRule);

    // Check for specific dates first
    if (detectSpecificDates(inputRule)) {
      const response = {
        pricing_rules: [],
        booking_window_rules: [],
        booking_condition_rules: [],
        buffer_time_rules: [],
        quota_rules: [],
        space_sharing_rules: [],
        diagnostics: {
          message: "specific_date_unsupported",
          suggest: "Use booking-blocks feature or rolling window."
        }
      };
      
      console.info("parseRule-v3", { prompt: inputRule, json: response });
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rule type detection
    const hasPricingPattern = /\$\d+|per hour|hourly rate/i.test(inputRule);
    const hasQuotaPattern = /limit.+to\s+\d+\s+(hours?|bookings?)\s+per\s+(day|week|month)/i.test(inputRule);
    const hasBufferPattern = /\d+[-\s]?minute.+buffer|clean[-\s]?up/i.test(inputRule);
    const hasSpaceSharingPattern = /if.+booked.+becomes unavailable|vice versa|mutual/i.test(inputRule);
    const hasBlockPattern = /block|slot/i.test(inputRule);
    const hasMinMaxPattern = /(minimum|maximum|at\s+least|no\s+more\s+than|min|max|less than|more than|shorter than|longer than)/i.test(inputRule);
    const hasAdvanceBookingPattern = /(in advance|prior to|beforehand|for\s+the\s+next)/i.test(inputRule);

    console.log('[RULE TYPE DETECTION]', {
      hasPricingPattern,
      hasQuotaPattern,
      hasBufferPattern,
      hasSpaceSharingPattern,
      hasBlockPattern,
      hasMinMaxPattern,
      hasAdvanceBookingPattern
    });

    // Extract spaces for all rule types
    const mentionedSpaces = extractSpaces(inputRule);

    // Initialize response object with parseRule-v3 structure
    const responseObj: any = {
      pricing_rules: [],
      booking_window_rules: [],
      booking_condition_rules: [],
      buffer_time_rules: [],
      quota_rules: [],
      space_sharing_rules: []
    };

    // Generate rules based on detected patterns
    if (hasPricingPattern) {
      console.log('[MAIN] Generating pricing rules');
      responseObj.pricing_rules = generatePricingRules(inputRule, mentionedSpaces);
    }

    if (hasAdvanceBookingPattern) {
      console.log('[MAIN] Generating booking window rules');
      responseObj.booking_window_rules = generateBookingWindowRules(inputRule, mentionedSpaces);
    }

    if (hasMinMaxPattern && !hasAdvanceBookingPattern) {
      console.log('[MAIN] Generating booking condition rules');
      responseObj.booking_condition_rules = generateBookingConditionRules(inputRule, mentionedSpaces);
    }

    if (hasBufferPattern) {
      console.log('[MAIN] Generating buffer time rules');
      responseObj.buffer_time_rules = generateBufferTimeRules(inputRule, mentionedSpaces);
    }

    if (hasQuotaPattern) {
      console.log('[MAIN] Generating quota rules');
      responseObj.quota_rules = generateQuotaRules(inputRule, mentionedSpaces);
    }

    if (hasSpaceSharingPattern) {
      console.log('[MAIN] Generating space sharing rules');
      responseObj.space_sharing_rules = generateSpaceSharingRules(inputRule);
    }

    // Fallback to booking window if no specific patterns detected
    if (Object.values(responseObj).every(arr => Array.isArray(arr) && arr.length === 0)) {
      console.log('[MAIN] No patterns detected, using booking window fallback');
      responseObj.booking_window_rules = generateBookingWindowRules(inputRule, mentionedSpaces);
    }

    console.info("parseRule-v3", { prompt: inputRule, json: responseObj });

    return new Response(JSON.stringify(responseObj), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parseRule-v3 function:', error);
    const errorResponse = {
      pricing_rules: [],
      booking_window_rules: [],
      booking_condition_rules: [],
      buffer_time_rules: [],
      quota_rules: [],
      space_sharing_rules: [],
      diagnostics: { 
        message: 'Failed to process rule',
        details: error.message 
      }
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
