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
  /(?:can\s+book|book)\s+(?:up\s+to|within|for\s+the\s+next|no\s+more\s+than|maximum\s+of|max)\s+(\d+)\s*(day|days|week|weeks|hour|hours)/gi,
  /(?:up\s+to|within|in\s+the\s+next|for\s+the\s+next|no\s+more\s+than|maximum\s+of|max)\s+(\d+)\s*(day|days|week|weeks|hour|hours)(?:\s+in\s+advance)?/gi
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

// Duration Guard Pattern Detection
const DURATION_RX = /(\d+(?:\.\d+)?)(?:\s?)(min|minutes?|h|hr|hrs?|hour|hours?)/gi;
const DIR_RX = /(min(?:imum)?|at\s+least|under|below|less\s+than|shorter\s+than|max(?:imum)?|over|above|more\s+than|longer\s+than|≥|>=|≤|<=|<|>)/gi;
const ADVANCE_CONTEXT_RX = /(?:in\s+advance|before|ahead\s+of|prior\s+to)/gi;

// Duration Guard Detection Function
function detectDurationGuard(text: string): { hasDurationConstraints: boolean; details: any[] } {
  const lowerText = text.toLowerCase();
  const durationMatches = [...lowerText.matchAll(DURATION_RX)];
  const directionMatches = [...lowerText.matchAll(DIR_RX)];
  
  // Check if advance context is present (should exclude from duration guard)
  const hasAdvanceContext = ADVANCE_CONTEXT_RX.test(lowerText);
  
  if (durationMatches.length > 0 && directionMatches.length > 0 && !hasAdvanceContext) {
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
  const durationGuard = detectDurationGuard(originalRule);
  
  if (durationGuard.hasDurationConstraints && parsedResponse.booking_window_rules && parsedResponse.booking_window_rules.length > 0) {
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
      
      // CRITICAL FIX: Auto-set user_scope when tags are present
      if (rule.tags && Array.isArray(rule.tags) && rule.tags.length > 0) {
        if (!rule.user_scope || rule.user_scope === 'all_users') {
          console.log(`[SANITIZE] Auto-setting user_scope for rule ${index} with tags:`, rule.tags);
          rule.user_scope = 'users_with_tags';
          rule.__user_scope_corrected = true;
        }
      } else {
        // If no tags, ensure user_scope is all_users
        if (!rule.user_scope) {
          rule.user_scope = 'all_users';
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
    
    const durationGuardHint = durationGuard.hasDurationConstraints 
      ? `\n\nDURATION GUARD DETECTED: This prompt contains duration constraints (${durationGuard.details.map(d => d.raw).join(', ')}). These should be parsed as BOOKING CONDITIONS with condition_type="duration", NOT as booking window rules.`
      : '';
      
    const specificDateHint = bookingWindowAnalysis.hasSpecificDates
      ? `\n\nSPECIFIC DATE DETECTED: This prompt contains calendar dates (${bookingWindowAnalysis.specificDateMatches.join(', ')}). The UI doesn't support hardcoded dates. Return guidance message explaining limitations and alternatives.`
      : '';

    const prompt = `
You are the "Booking-Rules AI Interpreter" that converts venue-owner text into structured blocks inside the Lovable scheduling platform.

The UI has six block types:
1. Pricing Rule
2. Booking Condition  
3. Booking Window
4. Buffer Time
5. Quota
6. Split-Space Dependency

Your job:
• choose the correct block type(s)
• fill every field exactly as the UI expects
• never invent components the UI lacks
• when a request is impossible, explain briefly **why** and offer the closest supported alternative

────────────────────────────────────────  BOOKING-WINDOW GUIDELINES (CRITICAL)

**HORIZON CAPS vs MINIMUM NOTICE - OPERATOR MAPPING:**

1. **HORIZON CAPS** (limits how far ahead users can book):
   • "can book ***up to*** X days" → constraint: "more_than" (blocks beyond X days)
   • "book for the ***next*** X days" → constraint: "more_than" (blocks beyond X days)
   • "no more than X days in advance" → constraint: "more_than" (blocks beyond X days)
   • "X days in advance" (in context of booking allowance) → constraint: "more_than"
   • Keywords: "up to", "next", "within", "no more than", "maximum", "can book"

2. **MINIMUM NOTICE** (requires advance booking):
   • "must book ***at least*** X days in advance" → constraint: "less_than" (blocks within X days)
   • "need X days notice" → constraint: "less_than" (blocks within X days)
   • Keywords: "at least", "minimum", "notice", "must book"

**CRITICAL EXAMPLES:**
- "Coaches can book up to 7 days in advance" → constraint: "more_than", value: 7, unit: "days"
- "Sales team can book 30 days in advance" → constraint: "more_than", value: 30, unit: "days"
- "Must book at least 48 hours in advance" → constraint: "less_than", value: 48, unit: "hours"

**USER SCOPE REQUIREMENTS:**
- ALWAYS set user_scope: "users_with_tags" when tags are present
- ALWAYS set user_scope: "all_users" when no tags specified

**UNIT PRESERVATION:**
• Keep user's original units: "30 days" stays "30 days" (NOT 720 hours)
• Only convert if user explicitly used hours
• Preserve: days, weeks, hours as user intended

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

1. **BOOKING WINDOW LOGIC (MOST CRITICAL)**:
   a) **HORIZON CAPS** (use constraint: "more_than"):
      - "up to 30 days" → more_than 30 days (blocks beyond 30 days)
      - "next 3 days" → more_than 3 days (blocks beyond 3 days)
      - "within 1 week" → more_than 1 week (blocks beyond 1 week)
      - "7 days in advance" (booking allowance) → more_than 7 days
      
   b) **MINIMUM NOTICE** (use constraint: "less_than"):
      - "at least 24 hours in advance" → less_than 24 hours (blocks within 24 hours)
      - "need 2 days notice" → less_than 2 days (blocks within 2 days)

2. **USER SCOPE CRITICAL RULE**: 
   - If tags specified → MUST set user_scope: "users_with_tags"
   - If no tags → MUST set user_scope: "all_users"

3. **UNIT PRESERVATION**: Keep user units unless they explicitly used hours.

4. **SPECIFIC DATES**: If you detect calendar dates, return guidance message only.

5. **DURATION CONSTRAINTS**: Session length limits go to booking_conditions, not booking_window_rules.

6. **"ONLY" PATTERNS**: "only [users] can book" → operator: "contains_none_of" with allowed tags.

7. **MULTI-ROW CONDITIONS**: Use "rules" array with "logic_operators" for compound conditions.

RESPONSE FORMAT:
Return a JSON object with appropriate rule arrays. If specific dates detected, return only:
{
  "summary": "Direct calendar dates aren't supported. Found: [dates]. You can: create a recurring booking window that ends on that date, then delete it manually; or manage availability on the calendar directly.",
  "explanation": "The booking system doesn't support hardcoded calendar dates. Use recurring time windows instead."
}

Otherwise, return full rule structure with:
- booking_conditions: [rules with multi-row support]
- booking_window_rules: [with correct operators, user_scope, and preserved units]
- pricing_rules, quota_rules, buffer_time_rules, space_sharing as needed
- summary: "Comprehensive summary (≤ 4 lines)"

${durationGuardHint}${specificDateHint}

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

    // Apply enhanced post-processing sanitization
    parsedResponse = await sanitizeRules(parsedResponse, rule);

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
