
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Enhanced pattern detection for booking windows
const HORIZON_CAP_PATTERNS = [
  /(?:up\s+to|within|in\s+the\s+next|for\s+the\s+next|no\s+more\s+than|maximum\s+of|max)\s+(\d+)\s*(day|days|week|weeks|hour|hours)/gi,
  /(?:can\s+book|book)\s+(?:up\s+to|within|for\s+the\s+next)\s+(\d+)\s*(day|days|week|weeks|hour|hours)/gi
];

const MINIMUM_NOTICE_PATTERNS = [
  /(?:at\s+least|minimum|min\.?|not\s+less\s+than|must\s+book\s+at\s+least)\s+(\d+)\s*(day|days|week|weeks|hour|hours)\s+(?:in\s+advance|ahead|before|prior)/gi,
  /(?:need|require)\s+(\d+)\s*(day|days|week|weeks|hour|hours)\s+(?:notice|advance|ahead)/gi
];

const SPECIFIC_DATE_PATTERNS = [
  /(?:before|after|from|until|by)\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?/gi,
  /(?:before|after|from|until|by)\s+\d{1,2}\/\d{1,2}\/?\d{0,4}/gi,
  /(?:before|after|from|until|by)\s+\d{4}-\d{2}-\d{2}/gi
];

// NEW: Quota Rule Pattern Detection
const QUOTA_PATTERNS = [
  /(?:limit|restrict|cap|maximum\s+of|max\s+of)\s+(?:each|every|per)\s+(?:player|user|person|individual)\s+to\s+(\d+)\s*(h|hour|hours|min|minutes|booking|bookings)\s+per\s+(day|week|month)/gi,
  /(?:each|every|per)\s+(?:player|user|person|individual)\s+(?:can\s+only|is\s+limited\s+to|gets)\s+(\d+)\s*(h|hour|hours|min|minutes|booking|bookings)\s+per\s+(day|week|month)/gi,
  /(\d+)\s*(h|hour|hours|min|minutes|booking|bookings)\s+per\s+(day|week|month)\s+(?:limit|maximum|max|restriction)\s+(?:for\s+)?(?:each|every|per)\s+(?:player|user|person|individual)/gi,
  /(?:no\s+more\s+than|maximum\s+of|max\s+of)\s+(\d+)\s*(h|hour|hours|min|minutes|booking|bookings)\s+per\s+(?:player|user|person|individual)\s+per\s+(day|week|month)/gi
];

// NEW: Space Sharing Pattern Detection
const SPACE_SHARING_PATTERNS = [
  /if\s+(.+?)\s+is\s+booked,?\s+(.+?)\s+(?:becomes?\s+)?(?:unavailable|blocked|not\s+available)/gi,
  /when\s+(.+?)\s+is\s+(?:booked|reserved),?\s+(.+?)\s+(?:becomes?\s+)?(?:unavailable|blocked|not\s+available)/gi,
  /(.+?)\s+and\s+(.+?)\s+(?:cannot\s+be\s+booked|are\s+mutually\s+exclusive|share\s+the\s+same)/gi,
  /(?:mutual\s+exclusion|mutually\s+exclusive)\s+between\s+(.+?)\s+and\s+(.+)/gi,
  /(.+?)\s+(?:makes?\s+)?(.+?)\s+(?:unavailable|blocked)/gi
];

const QUOTA_USER_SCOPE_PATTERNS = [
  /(?:each|every|per)\s+(?:player|user|person|individual)/gi,
  /(?:players|users|people|individuals)\s+with\s+(?:tag|tags)/gi,
  /(?:group|team)\s+(?:with|having)\s+(?:tag|tags)/gi
];

// Duration Guard Pattern Detection
const DURATION_RX = /(\d+(?:\.\d+)?)(?:\s?)(min|minutes?|h|hr|hrs?|hour|hours?)/gi;
const DIR_RX = /(min(?:imum)?|at\s+least|under|below|less\s+than|shorter\s+than|max(?:imum)?|over|above|more\s+than|longer\s+than|≥|>=|≤|<=|<|>)/gi;
const ADVANCE_CONTEXT_RX = /(?:in\s+advance|before|ahead\s+of|prior\s+to)/gi;

// ────────────────────────────────────────── helper: builds TWO booking condition blocks for time blocks
function buildTimeBlockConditions(
  spaceRaw: string,               // raw space name from input
  nHours: number,                // size of each allowed block (1 → 60 min)
  minHrs: number,                // minimum duration (in hours)
  maxHrs: number                 // maximum duration (in hours)
) {
  console.log(`[buildTimeBlockConditions] Creating TWO separate blocks for ${spaceRaw}: ${nHours}h blocks, ${minHrs}-${maxHrs}h range`);
  
  // First block: Time interval blocking (ensures 1-hour slots only)
  const timeBlockingCondition = {
    space: [spaceRaw],
    time_range: "00:00–24:00",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    rules: [
      {
        condition_type: "interval_start",
        operator: "multiple_of",
        value: `${nHours}h`,
        explanation: `Booking start time must align with ${nHours}-hour intervals from 00:00`
      },
      {
        condition_type: "interval_end", 
        operator: "multiple_of",
        value: `${nHours}h`,
        explanation: `Booking end time must align with ${nHours}-hour intervals to 24:00`
      }
    ],
    logic_operators: ["AND"],
    explanation: `${spaceRaw} bookings must start and end on ${nHours}-hour boundaries only`
  };
  
  // Second block: Duration constraints (min/max hours)
  const durationConstraintCondition = {
    space: [spaceRaw],
    time_range: "00:00–24:00", 
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    rules: [
      {
        condition_type: "duration",
        operator: "is_less_than",
        value: `${minHrs}h`,
        explanation: `Booking duration cannot be less than ${minHrs} hours`
      },
      {
        condition_type: "duration",
        operator: "is_greater_than", 
        value: `${maxHrs}h`,
        explanation: `Booking duration cannot be greater than ${maxHrs} hours`
      }
    ],
    logic_operators: ["OR"],
    explanation: `${spaceRaw} bookings must be between ${minHrs} and ${maxHrs} hours`
  };
  
  return [timeBlockingCondition, durationConstraintCondition];
}

// Duration Guard Detection Function
function detectDurationGuard(text: string): { hasDurationConstraints: boolean; details: any[] } {
  const lowerText = text.toLowerCase();
  const durationMatches = [...lowerText.matchAll(DURATION_RX)];
  const directionMatches = [...lowerText.matchAll(DIR_RX)];
  
  // Check if advance context is present (should exclude from duration guard)
  const hasAdvanceContext = ADVANCE_CONTEXT_RX.test(lowerText);
  
  // NEW: Check if quota context is present (should exclude from duration guard)
  const quotaAnalysis = detectQuotaPattern(text);
  const hasQuotaContext = quotaAnalysis.hasQuotaConstraints;
  
  if (durationMatches.length > 0 && directionMatches.length > 0 && !hasAdvanceContext && !hasQuotaContext) {
    console.log(`[DURATION GUARD] Detected duration constraints: ${durationMatches.length} durations, ${directionMatches.length} directions`);
    
    const details = durationMatches.map((match, index) => {
      const value = parseFloat(match[1]);
      const unit = normalizeUnit(match[2]);
      const direction = directionMatches[index] ? directionMatches[index][1] : null;
      const operator = mapDirectionToOperator(direction);
      
      return {
        value: `${value}${unit}`,
        operator,
        direction: direction,
        raw: match[0]
      };
    });
    
    return { hasDurationConstraints: true, details };
  }
  
  return { hasDurationConstraints: false, details: [] };
}

// NEW: Quota Detection Function
function detectQuotaPattern(text: string): { 
  hasQuotaConstraints: boolean; 
  quotaDetails: Array<{ value: number; unit: string; period: string; userScope: string }>;
} {
  const lowerText = text.toLowerCase();
  const quotaDetails: Array<{ value: number; unit: string; period: string; userScope: string }> = [];
  
  // Check for quota patterns
  let hasQuotaConstraints = false;
  for (const pattern of QUOTA_PATTERNS) {
    const matches = [...lowerText.matchAll(pattern)];
    if (matches.length > 0) {
      hasQuotaConstraints = true;
      matches.forEach(match => {
        const value = parseInt(match[1]);
        const unit = normalizeQuotaUnit(match[2]);
        const period = normalizeQuotaPeriod(match[3]);
        
        // Detect user scope
        let userScope = "individuals";
        if (/(?:players|users|people|individuals)\s+with\s+(?:tag|tags)/.test(lowerText)) {
          userScope = "individuals_with_tags";
        } else if (/(?:group|team)\s+(?:with|having)\s+(?:tag|tags)/.test(lowerText)) {
          userScope = "group_with_tag";
        }
        
        quotaDetails.push({ value, unit, period, userScope });
      });
    }
  }
  
  return { hasQuotaConstraints, quotaDetails };
}

// NEW: Space Sharing Detection Function
function detectSpaceSharingPattern(text: string): {
  hasSpaceSharing: boolean;
  spacePairs: Array<{ from: string; to: string }>;
  isBidirectional: boolean;
} {
  const spacePairs: Array<{ from: string; to: string }> = [];
  let hasSpaceSharing = false;
  let isBidirectional = false;
  
  // Check for bidirectional indicators
  const bidirectionalKeywords = /(?:vice[\s-]?versa|mutually\s+exclusive|both\s+ways|either\s+way)/gi;
  isBidirectional = bidirectionalKeywords.test(text);
  
  // Extract space relationships
  for (const pattern of SPACE_SHARING_PATTERNS) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      hasSpaceSharing = true;
      matches.forEach(match => {
        const space1 = match[1]?.trim();
        const space2 = match[2]?.trim();
        
        if (space1 && space2) {
          spacePairs.push({ from: space1, to: space2 });
          // If bidirectional, add reverse relationship
          if (isBidirectional) {
            spacePairs.push({ from: space2, to: space1 });
          }
        }
      });
    }
  }
  
  return { hasSpaceSharing, spacePairs, isBidirectional };
}

function normalizeQuotaUnit(unit: string): string {
  const normalized = unit.toLowerCase();
  if (['h', 'hour', 'hours'].includes(normalized)) return 'h';
  if (['min', 'minute', 'minutes'].includes(normalized)) return 'min';
  if (['booking', 'bookings'].includes(normalized)) return 'bookings';
  return normalized;
}

function normalizeQuotaPeriod(period: string): string {
  const normalized = period.toLowerCase();
  if (['day'].includes(normalized)) return 'day';
  if (['week'].includes(normalized)) return 'week';
  if (['month'].includes(normalized)) return 'month';
  return normalized;
}

// Enhanced booking window pattern detection
function detectBookingWindowType(text: string): { 
  isHorizonCap: boolean; 
  isMinimumNotice: boolean; 
  hasSpecificDates: boolean;
  values: Array<{ value: number; unit: string; type: string }>;
  specificDateMatches: string[];
} {
  const lowerText = text.toLowerCase();
  const values: Array<{ value: number; unit: string; type: string }> = [];
  const specificDateMatches: string[] = [];
  
  // Check for horizon caps (up to X days)
  let isHorizonCap = false;
  for (const pattern of HORIZON_CAP_PATTERNS) {
    const matches = [...lowerText.matchAll(pattern)];
    if (matches.length > 0) {
      isHorizonCap = true;
      matches.forEach(match => {
        values.push({
          value: parseInt(match[1]),
          unit: normalizeBookingUnit(match[2]),
          type: 'horizon_cap'
        });
      });
    }
  }
  
  // Check for minimum notice (at least X days in advance)
  let isMinimumNotice = false;
  for (const pattern of MINIMUM_NOTICE_PATTERNS) {
    const matches = [...lowerText.matchAll(pattern)];
    if (matches.length > 0) {
      isMinimumNotice = true;
      matches.forEach(match => {
        values.push({
          value: parseInt(match[1]),
          unit: normalizeBookingUnit(match[2]),
          type: 'minimum_notice'
        });
      });
    }
  }
  
  // Check for specific dates
  let hasSpecificDates = false;
  for (const pattern of SPECIFIC_DATE_PATTERNS) {
    const matches = [...lowerText.matchAll(pattern)];
    if (matches.length > 0) {
      hasSpecificDates = true;
      matches.forEach(match => {
        specificDateMatches.push(match[0]);
      });
    }
  }
  
  return { isHorizonCap, isMinimumNotice, hasSpecificDates, values, specificDateMatches };
}

// Unit normalization utility
function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase();
  if (['min', 'minutes', 'minute'].includes(normalized)) return 'min';
  if (['h', 'hr', 'hrs', 'hour', 'hours'].includes(normalized)) return 'h';
  return normalized;
}

function normalizeBookingUnit(unit: string): string {
  const normalized = unit.toLowerCase();
  if (['day', 'days'].includes(normalized)) return 'days';
  if (['week', 'weeks'].includes(normalized)) return 'weeks';
  if (['hour', 'hours', 'h', 'hr', 'hrs'].includes(normalized)) return 'hours';
  return normalized;
}

// Direction to operator mapping
function mapDirectionToOperator(direction: string | null): string {
  if (!direction) return 'is_less_than';
  
  const dir = direction.toLowerCase().replace(/\s+/g, ' ');
  
  if (['min', 'minimum', 'at least', 'under', 'below', 'less than', 'shorter than', '≤', '<=', '<'].includes(dir)) {
    return 'is_less_than';
  }
  if (['max', 'maximum', 'over', 'above', 'more than', 'longer than', '≥', '>=', '>'].includes(dir)) {
    return 'is_greater_than';
  }
  
  return 'is_less_than'; // default
}

// Space resolution utility
async function resolveSpaces(spaceNames: string[]) {
  if (!spaceNames || spaceNames.length === 0) return [];
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  try {
    // Get existing spaces from database
    const { data: existingSpaces, error } = await supabase
      .from('spaces')
      .select('id, name')
      .in('name', spaceNames);
    
    if (error) {
      console.error('Error fetching spaces:', error);
      // Fallback to string names if DB query fails
      return spaceNames;
    }
    
    const existingSpaceNames = new Set(existingSpaces?.map(s => s.name) || []);
    const newSpaceNames = spaceNames.filter(name => !existingSpaceNames.has(name));
    
    // Create any missing spaces
    if (newSpaceNames.length > 0) {
      const { data: newSpaces, error: insertError } = await supabase
        .from('spaces')
        .insert(newSpaceNames.map(name => ({ name })))
        .select('id, name');
      
      if (insertError) {
        console.warn('Could not create new spaces:', insertError);
        // Still return existing spaces + string names for new ones
        return [
          ...(existingSpaces || []),
          ...newSpaceNames
        ];
      }
      
      // Return all spaces (existing + newly created)
      return [
        ...(existingSpaces || []),
        ...(newSpaces || [])
      ];
    }
    
    // Return only existing spaces
    return existingSpaces || [];
    
  } catch (err) {
    console.error('Space resolution failed:', err);
    // Fallback to original string names
    return spaceNames;
  }
}

// Enhanced post-processing sanitization layer with improved pattern detection
async function sanitizeRules(parsedResponse: any, originalRule: string): Promise<any> {
  console.log('Starting enhanced rule sanitization with improved pattern detection...');
  
  // NEW: Check for quota patterns first to prevent incorrect duration guard conversion
  const quotaAnalysis = detectQuotaPattern(originalRule);
  if (quotaAnalysis.hasQuotaConstraints) {
    console.log('[QUOTA GUARD] Detected quota constraints, preserving quota rules and preventing duration guard conversion');
    // If we have quota patterns, ensure quota rules are preserved and don't convert to booking conditions
    if (parsedResponse.quota_rules && parsedResponse.quota_rules.length > 0) {
      console.log('[QUOTA GUARD] Quota rules already present, preserving them');
    }
    
    // Prevent duration guard from converting quota-related booking conditions
    if (parsedResponse.booking_conditions) {
      const quotaRelatedConditions = parsedResponse.booking_conditions.filter((condition: any) => {
        return condition.explanation && (
          condition.explanation.toLowerCase().includes('limit') ||
          condition.explanation.toLowerCase().includes('per week') ||
          condition.explanation.toLowerCase().includes('per day') ||
          condition.explanation.toLowerCase().includes('per month') ||
          condition.explanation.toLowerCase().includes('each player') ||
          condition.explanation.toLowerCase().includes('each user')
        );
      });
      
      if (quotaRelatedConditions.length > 0) {
        console.log('[QUOTA GUARD] Found quota-related booking conditions that should be quota rules instead');
        // Don't automatically convert here - let the AI prompt guide this correctly
      }
    }
  }

  // NEW: Check for space sharing patterns and fix field name inconsistency
  const spaceSharingAnalysis = detectSpaceSharingPattern(originalRule);
  if (spaceSharingAnalysis.hasSpaceSharing) {
    console.log('[SPACE SHARING GUARD] Detected space sharing patterns, ensuring proper field naming');
    
    // Convert split_space_dependency_rules to space_sharing if present
    if (parsedResponse.split_space_dependency_rules) {
      console.log('[SPACE SHARING GUARD] Converting split_space_dependency_rules to space_sharing');
      parsedResponse.space_sharing = parsedResponse.split_space_dependency_rules.map((rule: any) => ({
        from: rule.spaces?.[0] || rule.from,
        to: rule.spaces?.[1] || rule.to
      }));
      delete parsedResponse.split_space_dependency_rules;
    }
    
    // Ensure we have space_sharing rules if detected
    if (!parsedResponse.space_sharing && spaceSharingAnalysis.spacePairs.length > 0) {
      console.log('[SPACE SHARING GUARD] Creating missing space_sharing rules from detected patterns');
      parsedResponse.space_sharing = spaceSharingAnalysis.spacePairs;
    }
  }
  
  // Check for time-block + min/max duration pattern first
  const tbMatch = originalRule.match(/(.*?)\s+must\s+be\s+booked\s+in\s+(\d+)\s*-?\s*hour\s+blocks?\s+only.*minimum\s+(\d+)\s*hours?.*maximum\s+(\d+)\s*hours?/i);
  if (tbMatch) {
    const spaceRaw = tbMatch[1].trim();
    const blockHrs = parseInt(tbMatch[2], 10);
    const minHrs   = parseInt(tbMatch[3], 10);
    const maxHrs   = parseInt(tbMatch[4], 10);
    parsedResponse.booking_conditions = buildTimeBlockConditions(spaceRaw, blockHrs, minHrs, maxHrs);
    delete parsedResponse.booking_window_rules;
    console.log("[SANITIZE] Applied time-block + min/max duration override with TWO separate blocks for", spaceRaw);
  }
  
  // Enhanced booking window detection
  const bookingWindowAnalysis = detectBookingWindowType(originalRule);
  
  // Check for specific dates first
  if (bookingWindowAnalysis.hasSpecificDates) {
    console.log('[SPECIFIC DATES] Detected unsupported calendar dates:', bookingWindowAnalysis.specificDateMatches);
    
    // Return guidance instead of rules
    return {
      summary: `Direct calendar dates aren't supported. Found: ${bookingWindowAnalysis.specificDateMatches.join(', ')}. You can: create a recurring booking window that ends on that date, then delete it manually; or manage availability on the calendar directly.`,
      explanation: "The booking system doesn't support hardcoded calendar dates. Use recurring time windows instead."
    };
  }
  
  // Duration Guard: Check if booking_window_rules should be booking_conditions
  // BUT SKIP if quota patterns are detected
  const durationGuard = detectDurationGuard(originalRule);
  
  if (durationGuard.hasDurationConstraints && parsedResponse.booking_window_rules && parsedResponse.booking_window_rules.length > 0 && !quotaAnalysis.hasQuotaConstraints) {
    console.log('[DURATION GUARD] Converting misclassified booking window rules to booking conditions');
    
    // Convert booking window rules to booking conditions
    const convertedConditions = parsedResponse.booking_window_rules.map((rule: any, index: number) => {
      const guardDetail = durationGuard.details[index] || durationGuard.details[0];
      
      return {
        space: rule.spaces || ["all"],
        time_range: "00:00–24:00",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        condition_type: "duration",
        operator: guardDetail?.operator || "is_less_than",
        value: guardDetail?.value || `${rule.value}${rule.unit === 'hours' ? 'h' : rule.unit}`,
        explanation: `Booking not allowed if duration ${guardDetail?.operator === 'is_less_than' ? 'is less than' : 'is greater than'} ${guardDetail?.value || rule.value + rule.unit}`
      };
    });
    
    parsedResponse.booking_conditions = [
      ...(parsedResponse.booking_conditions || []),
      ...convertedConditions
    ];
    
    // Remove the misclassified booking window rules
    delete parsedResponse.booking_window_rules;
    console.log('[DURATION GUARD] Successfully converted to booking conditions');
  }
  
  // NEW: Fix booking window rule field names - map AI fields to expected interface
  if (parsedResponse.booking_window_rules) {
    console.log('[BOOKING WINDOW FIELD MAPPING] Normalizing booking window rule field names');
    parsedResponse.booking_window_rules = parsedResponse.booking_window_rules.map((rule: any) => {
      const normalizedRule = { ...rule };
      
      // Map target -> user_scope
      if (rule.target && !rule.user_scope) {
        normalizedRule.user_scope = rule.target;
        delete normalizedRule.target;
        console.log('[BOOKING WINDOW FIELD MAPPING] Mapped target to user_scope:', rule.target);
      }
      
      // Map affected_spaces -> spaces
      if (rule.affected_spaces && !rule.spaces) {
        normalizedRule.spaces = rule.affected_spaces;
        delete normalizedRule.affected_spaces;
        console.log('[BOOKING WINDOW FIELD MAPPING] Mapped affected_spaces to spaces:', rule.affected_spaces);
      }
      
      return normalizedRule;
    });
  }
  
  // Enhanced booking window rule corrections
  if (parsedResponse.booking_window_rules) {
    parsedResponse.booking_window_rules.forEach((rule: any, index: number) => {
      const ruleAnalysis = bookingWindowAnalysis.values[index];
      
      if (ruleAnalysis) {
        // Fix operator based on detected pattern type
        if (ruleAnalysis.type === 'horizon_cap') {
          // "up to X days" should be "more_than" (blocks beyond X days)
          if (rule.constraint === 'less_than') {
            console.log(`[SANITIZE] Fixing horizon cap operator ${index}: less_than -> more_than (${ruleAnalysis.value} ${ruleAnalysis.unit})`);
            rule.constraint = 'more_than';
            rule.__corrected = true;
          }
        } else if (ruleAnalysis.type === 'minimum_notice') {
          // "at least X days in advance" should be "less_than" (blocks within X days)
          if (rule.constraint === 'more_than') {
            console.log(`[SANITIZE] Fixing minimum notice operator ${index}: more_than -> less_than (${ruleAnalysis.value} ${ruleAnalysis.unit})`);
            rule.constraint = 'less_than';
            rule.__corrected = true;
          }
        }
        
        // Preserve original units unless user explicitly used hours
        if (rule.unit !== ruleAnalysis.unit && ruleAnalysis.unit !== 'hours') {
          const originalValue = rule.value;
          const originalUnit = rule.unit;
          rule.value = ruleAnalysis.value;
          rule.unit = ruleAnalysis.unit;
          console.log(`[SANITIZE] Preserving user units ${index}: ${originalValue} ${originalUnit} -> ${rule.value} ${rule.unit}`);
          rule.__unit_preserved = true;
        }
      }
    });
  }
  
  // Resolve spaces in buffer_time_rules
  if (parsedResponse.buffer_time_rules) {
    for (const rule of parsedResponse.buffer_time_rules) {
      if (rule.spaces && Array.isArray(rule.spaces)) {
        rule.spaces = await resolveSpaces(rule.spaces);
        console.log('Resolved buffer time spaces:', rule.spaces);
      }
    }
  }

  // NEW: Resolve spaces in quota_rules
  if (parsedResponse.quota_rules) {
    for (const rule of parsedResponse.quota_rules) {
      if (rule.affected_spaces && Array.isArray(rule.affected_spaces)) {
        rule.affected_spaces = await resolveSpaces(rule.affected_spaces);
        console.log('Resolved quota rule spaces:', rule.affected_spaces);
      }
    }
  }
  
  // Fix booking conditions - handle "only...can book" patterns
  const allowlistPatterns = /(only|just|exclusively)\s+([\w\s,&]+?)\s+can\s+book/i;
  if (parsedResponse.booking_conditions) {
    parsedResponse.booking_conditions.forEach((condition: any, index: number) => {
      // Check if this is an allowlist pattern that got parsed as deny rule
      if (originalRule.match(allowlistPatterns) && condition.operator === 'contains_any_of') {
        console.log(`[SANITIZE] Fixing logic inversion in booking condition ${index}: contains_any_of -> contains_none_of`);
        condition.operator = 'contains_none_of';
        condition.__corrected = true;
      }
    });
  }

  return parsedResponse;
}

// Simple rate limiting function
function checkRateLimit(identifier: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(identifier);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= maxRequests) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    const { rule } = await req.json()
    
    // Input validation
    if (!rule || typeof rule !== 'string') {
      throw new Error('Rule text is required and must be a string')
    }
    
    if (rule.length > 2000) {
      throw new Error('Rule text is too long. Maximum 2000 characters allowed.')
    }
    
    if (rule.trim().length < 10) {
      throw new Error('Rule text is too short. Please provide more details.')
    }

    console.log('Processing rule:', rule.substring(0, 100) + '...')

    // Enhanced pre-processing analysis
    const durationGuard = detectDurationGuard(rule);
    const bookingWindowAnalysis = detectBookingWindowType(rule);
    const quotaAnalysis = detectQuotaPattern(rule);
    const spaceSharingAnalysis = detectSpaceSharingPattern(rule);
    
    const durationGuardHint = durationGuard.hasDurationConstraints 
      ? `\n\nDURATION GUARD DETECTED: This prompt contains duration constraints (${durationGuard.details.map(d => d.raw).join(', ')}). These should be parsed as BOOKING CONDITIONS with condition_type="duration", NOT as booking window rules.`
      : '';
      
    const specificDateHint = bookingWindowAnalysis.hasSpecificDates
      ? `\n\nSPECIFIC DATE DETECTED: This prompt contains calendar dates (${bookingWindowAnalysis.specificDateMatches.join(', ')}). The UI doesn't support hardcoded dates. Return guidance message explaining limitations and alternatives.`
      : '';

    const quotaHint = quotaAnalysis.hasQuotaConstraints
      ? `\n\nQUOTA CONSTRAINTS DETECTED: This prompt contains quota/limit patterns (${quotaAnalysis.quotaDetails.map(d => `${d.value}${d.unit} per ${d.period} for ${d.userScope}`).join(', ')}). These should be parsed as QUOTA RULES, NOT as booking conditions or booking window rules.`
      : '';

    const spaceSharingHint = spaceSharingAnalysis.hasSpaceSharing
      ? `\n\nSPACE SHARING DETECTED: This prompt contains space interdependency patterns (${spaceSharingAnalysis.spacePairs.map(p => `${p.from} → ${p.to}`).join(', ')}). These should be parsed as SPACE SHARING rules with field name "space_sharing", NOT "split_space_dependency_rules".`
      : '';

    const prompt = `
You are the "Booking-Rules AI Interpreter" that converts venue-owner text into structured blocks inside the Lovable scheduling platform.

The UI has six block types:
1. Pricing Rule
2. Booking Condition  
3. Booking Window
4. Buffer Time
5. Quota
6. Space Sharing

Your job:
• choose the correct block type(s)
• fill every field exactly as the UI expects
• never invent components the UI lacks
• when a request is impossible, explain briefly **why** and offer the closest supported alternative

────────────────────────────────────────  SPACE SHARING RULES GUIDELINES (NEW)

**SPACE SHARING DETECTION PATTERNS:**
Space sharing rules handle interdependencies between spaces. Key phrases:
• "if X is booked, Y becomes unavailable"
• "when X is reserved, Y is blocked"
• "X and Y cannot be booked together"
• "mutual exclusion between X and Y"
• "X makes Y unavailable"
• "vice-versa" or "both ways" (indicates bidirectional)

**SPACE SHARING RULE STRUCTURE:**
{
  "from": "Space Name A",
  "to": "Space Name B"
}

**FIELD NAME: Use "space_sharing" NOT "split_space_dependency_rules"**

**EXAMPLES:**
- "If Batting Cage A is booked, Batting Cage B becomes unavailable, and vice-versa" →
  {
    "space_sharing": [
      { "from": "Batting Cage A", "to": "Batting Cage B" },
      { "from": "Batting Cage B", "to": "Batting Cage A" }
    ]
  }

- "When Conference Room 1 is booked, Conference Room 2 is blocked" →
  {
    "space_sharing": [
      { "from": "Conference Room 1", "to": "Conference Room 2" }
    ]
  }

**CRITICAL: Always use "space_sharing" as the field name, never "split_space_dependency_rules"**

────────────────────────────────────────  QUOTA RULES GUIDELINES (CRITICAL)

**QUOTA DETECTION PATTERNS:**
Quota rules are for limiting individual users or groups over time periods. Key phrases:
• "limit each player to X hours per week"
• "each user gets maximum Y bookings per month"
• "no more than Z hours per day per person"
• "maximum X minutes per week for individuals"

**QUOTA RULE STRUCTURE:**
{
  "target": "individuals" | "individuals_with_tags" | "individuals_with_no_tags" | "group_with_tag",
  "tags": ["tag1", "tag2"] // only if target involves tags
  "quota_type": "time" | "count",
  "value": "6h" | 5, // string for time, number for count
  "period": "day" | "week" | "month" | "at_any_time",
  "affected_spaces": ["Space1", "Space2"],
  "consideration_time": "any_time" | "specific_time",
  "time_range": "09:00–17:00", // only if consideration_time is "specific_time"
  "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], // only if consideration_time is "specific_time"
  "explanation": "Clear explanation of the quota rule"
}

**QUOTA EXAMPLES:**
- "limit each player to 6 hours per week on Pickleball 1 & 2" →
  {
    "target": "individuals",
    "quota_type": "time",
    "value": "6h",
    "period": "week", 
    "affected_spaces": ["Pickleball 1", "Pickleball 2"],
    "consideration_time": "any_time",
    "explanation": "Each player is limited to 6 hours per week on Pickleball 1 & 2"
  }

- "Premium members get 10 bookings per month" →
  {
    "target": "individuals_with_tags",
    "tags": ["Premium"],
    "quota_type": "count",
    "value": 10,
    "period": "month",
    "affected_spaces": ["all spaces"],
    "consideration_time": "any_time",
    "explanation": "Premium members can make up to 10 bookings per month"
  }

**CRITICAL: DO NOT CREATE BOOKING CONDITIONS FOR QUOTA PATTERNS**
If you detect quota language (limit, per week, each player, etc.), always create quota_rules, never booking_conditions.

────────────────────────────────────────  PRICING RULES GUIDELINES (CRITICAL)

**TIME PARSING - CONVERT TO 24H FORMAT:**
• "6 AM" → "06:00"
• "4 PM" → "16:00" 
• "9 PM" → "21:00"
• "12 PM" → "12:00"
• "12 AM" → "00:00"

**SPACE EXTRACTION:**
• Extract exact space names from text: "indoor track" → ["Indoor Track"]
• Always include the space name in the space array

**DAYS DEFAULT:**
• If no specific days mentioned, set days to ALL 7 days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

**PRICE EXTRACTION:**
• "$10 per hour" → rate: { amount: 10, unit: "per_hour" }
• "$18 per hour" → rate: { amount: 18, unit: "per_hour" }
• "$8 per hour" → rate: { amount: 8, unit: "per_hour" }

**DEFAULT CONDITION:**
• For non-tag pricing rules, use: condition_type: "duration", operator: "is_greater_than_or_equal_to", value: "15min"
• For tag-based rules, use: condition_type: "user_tags", operator: "contains_any_of", value: [tag_names]

**EXAMPLE PRICING RULE STRUCTURE:**
{
  "space": ["Indoor Track"],
  "time_range": "06:00–16:00", 
  "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  "rate": { "amount": 10, "unit": "per_hour" },
  "condition_type": "duration",
  "operator": "is_greater_than_or_equal_to", 
  "value": "15min",
  "explanation": "Indoor Track is $10 per hour from 6 AM to 4 PM if booking is at least 15 minutes"
}

────────────────────────────────────────  BOOKING-WINDOW GUIDELINES (CRITICAL)

**HORIZON CAPS vs MINIMUM NOTICE - OPERATOR MAPPING:**

1. **HORIZON CAPS** (limits how far ahead users can book):
   • "can book ***up to*** X days" → constraint: "more_than" (blocks beyond X days)
   • "book for the ***next*** X days" → constraint: "more_than" (blocks beyond X days)
   • "no more than X days in advance" → constraint: "more_than" (blocks beyond X days)
   • Keywords: "up to", "next", "within", "no more than", "maximum"

2. **MINIMUM NOTICE** (requires advance booking):
   • "must book ***at least*** X days in advance" → constraint: "less_than" (blocks within X days)
   • "need X days notice" → constraint: "less_than" (blocks within X days)
   • Keywords: "at least", "minimum", "notice", "in advance"

**UNIT PRESERVATION:**
• Keep user's original units: "30 days" stays "30 days" (NOT 720 hours)
• Only convert if user explicitly used hours
• Preserve: days, weeks, hours as user intended

**EXAMPLES:**
- "Sales team can book up to 30 days" → constraint: "more_than", value: 30, unit: "days"
- "Everyone else only 3 days" → constraint: "more_than", value: 3, unit: "days"
- "Must book 48 hours in advance" → constraint: "less_than", value: 48, unit: "hours"

────────────────────────────────────────  SPECIFIC-DATE LIMITS (Unsupported)
The UI cannot pin rules to a calendar date.
If the prompt asks for "before Aug 1", "from 1 Dec to 10 Dec", or any calendar dates, respond:

> "Direct calendar dates aren't supported. You can: create a recurring booking window that ends on that date, then delete it manually; or manage availability on the calendar directly."

Create **no rule blocks** that pretend date logic exists.

────────────────────────────────────────  BOOKING-CONDITION GUIDELINES
• The Booking-Condition block supports multiple rows joined by **AND / OR**.
• For compound conditions like "cannot book less than 1h AND max 3h":
  - Use "rules" array with multiple rule objects
  - Add "logic_operators" array with "AND"/"OR" between rules
• For "cannot book less than 1h OR more than 3h":
  - Row 1: condition_type="duration", operator="is_less_than", value="1h"
  - Operator: "OR"  
  - Row 2: condition_type="duration", operator="is_greater_than", value="3h"
• Final explanation must read "a booking is **not allowed** if …"

────────────────────────────────────────  TAG & SPACE HANDLING
• Resolve user, tag, and space names **exactly** as typed.
• If names don't exist, still show them (UI marks them red for user to fix).

CRITICAL PARSING INSTRUCTIONS:

1. **SPACE SHARING RULES PRIORITY (NEW)**:
   a) **ALWAYS CHECK FOR SPACE SHARING PATTERNS FIRST** before any other rule type
   b) Space sharing keywords: "if X is booked Y becomes unavailable", "mutual exclusion", "vice-versa"
   c) If detected, create space_sharing rules, NOT booking_conditions or other types
   d) Example: "If A is booked, B becomes unavailable" → space_sharing rule with from="A", to="B"
   e) **CRITICAL: Use field name "space_sharing", NOT "split_space_dependency_rules"**

2. **QUOTA RULES PRIORITY**:
   a) **ALWAYS CHECK FOR QUOTA PATTERNS FIRST** before any other rule type
   b) Quota keywords: "limit", "each player", "per week", "per day", "per month", "maximum per user"
   c) If detected, create quota_rules, NOT booking_conditions or booking_window_rules
   d) Example: "limit each player to 6 hours per week" → quota_rule with target="individuals", value="6h", period="week"

3. **PRICING RULES PRIORITY**:
   a) Parse time ranges correctly: "6 AM-4 PM" → "06:00–16:00"
   b) Extract prices correctly: "$10 per hour" → amount: 10
   c) Include space names: "indoor track" → ["Indoor Track"]
   d) Default to all 7 days if not specified
   e) Use default condition: "is_greater_than_or_equal_to" "15min" for non-tag rules

4. **BOOKING WINDOW LOGIC (MOST CRITICAL)**:
   a) **HORIZON CAPS** (use constraint: "more_than"):
      - "up to 30 days" → more_than 30 days (blocks beyond 30 days)
      - "next 3 days" → more_than 3 days (blocks beyond 3 days)
      - "within 1 week" → more_than 1 week (blocks beyond 1 week)
      
   b) **MINIMUM NOTICE** (use constraint: "less_than"):
      - "at least 24 hours in advance" → less_than 24 hours (blocks within 24 hours)
      - "need 2 days notice" → less_than 2 days (blocks within 2 days)

5. **UNIT PRESERVATION**: Keep user units unless they explicitly used hours.

6. **SPECIFIC DATES**: If you detect calendar dates, return guidance message only.

7. **DURATION CONSTRAINTS**: Session length limits go to booking_conditions, NOT quota_rules, UNLESS they mention "per week/day/month" or "each user/player".

8. **"ONLY" PATTERNS**: "only [users] can book" → operator: "contains_none_of" with allowed tags.

9. **MULTI-ROW CONDITIONS**: Use "rules" array with "logic_operators" for compound conditions.

RESPONSE FORMAT:
Return a JSON object with appropriate rule arrays. If specific dates detected, return only:
{
  "summary": "Direct calendar dates aren't supported. Found: [dates]. You can: create a recurring booking window that ends on that date, then delete it manually; or manage availability on the calendar directly.",
  "explanation": "The booking system doesn't support hardcoded calendar dates. Use recurring time windows instead."
}

Otherwise, return full rule structure with:
- space_sharing: [rules for space interdependencies with from/to structure]
- quota_rules: [rules for user/time limits with target, quota_type, value, period, affected_spaces]
- pricing_rules: [rules with correct times, prices, spaces, days, and conditions]
- booking_conditions: [rules with multi-row support]
- booking_window_rules: [with correct operators and preserved units]
- buffer_time_rules, as needed
- summary: "Comprehensive summary (≤ 4 lines)"

${durationGuardHint}${specificDateHint}${quotaHint}${spaceSharingHint}

Now analyze this booking rule and extract ALL applicable rule structures:

Rule: ${rule}
    `

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    })

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', openaiResponse.status, await openaiResponse.text())
      throw new Error('Failed to fetch response from OpenAI API')
    }

    const { choices } = await openaiResponse.json()

    if (!choices || choices.length === 0) {
      throw new Error('No response from OpenAI API')
    }

    const aiResponse = choices[0].message.content.trim()

    console.log('AI Response:', aiResponse)

    let parsedResponse
    try {
      // Try to extract JSON from the response if it's wrapped in markdown
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/```\s*([\s\S]*?)\s*```/)
      const jsonString = jsonMatch ? jsonMatch[1] : aiResponse
      
      parsedResponse = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      throw new Error('Failed to parse AI response as JSON')
    }

    // Validate the response has the expected structure
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('Invalid response structure from AI')
    }

    console.log('Parsed response before sanitization:', JSON.stringify(parsedResponse, null, 2));

    // Apply enhanced post-processing sanitization
    parsedResponse = await sanitizeRules(parsedResponse, rule);

    console.log('Parsed response after sanitization:', JSON.stringify(parsedResponse, null, 2));

    // Add setup guide generation only if we have actual rules
    if (parsedResponse.booking_conditions || parsedResponse.booking_window_rules || parsedResponse.pricing_rules || parsedResponse.quota_rules || parsedResponse.buffer_time_rules || parsedResponse.space_sharing) {
      const setupGuide = generateSetupGuide(parsedResponse)
      parsedResponse.setup_guide = setupGuide
    }

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in parseRule function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process booking rule',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function generateSetupGuide(data: any) {
  const steps = []

  // Extract unique spaces from all rule types
  const allSpaces = new Set<string>()
  
  data.booking_conditions?.forEach((rule: any) => rule.space?.forEach((space: string) => allSpaces.add(space)))
  data.pricing_rules?.forEach((rule: any) => rule.space?.forEach((space: string) => allSpaces.add(space)))
  data.quota_rules?.forEach((rule: any) => rule.affected_spaces?.forEach((space: string) => allSpaces.add(space)))
  data.buffer_time_rules?.forEach((rule: any) => rule.spaces?.forEach((space: string) => allSpaces.add(space)))
  data.booking_window_rules?.forEach((rule: any) => rule.spaces?.forEach((space: string) => allSpaces.add(space)))
  data.space_sharing?.forEach((rule: any) => {
    allSpaces.add(rule.from)
    allSpaces.add(rule.to)
  })

  if (allSpaces.size > 0) {
    steps.push({
      step_key: "create_spaces",
      title: "Step 1: Create the required spaces",
      instruction: `Go to Settings > Spaces and click 'Add Space'. Create these spaces: ${Array.from(allSpaces).join(', ')}`,
      spaces: Array.from(allSpaces)
    })
  }

  steps.push({
    step_key: "hours_of_availability",
    title: "Step 2: Add hours of availability", 
    instruction: "Go to Settings › Hours of availability and set each space to at least 07:00 AM – 09:00 PM for Monday–Friday. Adjust weekend hours as needed.",
    spaces: Array.from(allSpaces),
    times: "07:00 AM – 09:00 PM"
  })

  // Extract unique tags
  const allTags = new Set<string>()
  data.booking_conditions?.forEach((rule: any) => {
    if (rule.condition_type === "user_tags" && Array.isArray(rule.value)) {
      rule.value.forEach((tag: string) => allTags.add(tag))
    }
  })
  data.pricing_rules?.forEach((rule: any) => {
    if (rule.condition_type === "user_tags" && Array.isArray(rule.value)) {
      rule.value.forEach((tag: string) => allTags.add(tag))
    }
  })
  data.quota_rules?.forEach((rule: any) => {
    rule.tags?.forEach((tag: string) => allTags.add(tag))
  })
  data.booking_window_rules?.forEach((rule: any) => {
    rule.tags?.forEach((tag: string) => allTags.add(tag))
  })

  if (allTags.size > 0) {
    steps.push({
      step_key: "create_user_tags",
      title: "Step 3: Add user tags",
      instruction: `Go to Users > Manage Tags and add: ${Array.from(allTags).join(', ')}. Note: For booking conditions with exclusive access (Only X can book), use 'contains none of' with the allowed tag. For pricing rules, use 'contains any of' with tags that should receive the price.`
    })
  }

  // Add rule-specific steps
  const ruleStepMap = [
    { key: 'booking_conditions', title: 'Create booking conditions', instruction: 'Go to Settings > Conditions and create the following restriction rules:' },
    { key: 'pricing_rules', title: 'Create pricing rules', instruction: 'Go to Settings > Pricing and create the following pricing rules:' },
    { key: 'quota_rules', title: 'Create quota rules', instruction: 'Go to Settings > Quotas and create the following quota rules:' },
    { key: 'buffer_time_rules', title: 'Create buffer time rules', instruction: 'Go to Settings > Buffer Times and create the following buffer rules:' },
    { key: 'booking_window_rules', title: 'Create booking window rules', instruction: 'Go to Settings > Booking Windows and create the following advance booking rules:' },
    { key: 'space_sharing', title: 'Set space-sharing rules', instruction: 'Go to Settings › Space Sharing and add the following connections:' }
  ]

  ruleStepMap.forEach((ruleStep) => {
    const ruleData = data[ruleStep.key] as any[]
    if (ruleData && ruleData.length > 0) {
      const stepNumber = steps.length + 1
      steps.push({
        step_key: ruleStep.key,
        title: `Step ${stepNumber}: ${ruleStep.title}`,
        instruction: ruleStep.instruction,
        rule_blocks: ruleData,
        ...(ruleStep.key === 'space_sharing' && { connections: ruleData })
      })
    }
  })

  return steps
}
