
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Enhanced pattern detection for post-processing
const allowlistPatterns = /(only|just|exclusively)\s+([\w\s,&]+?)\s+can\s+book/i;
const noMoreThanPatterns = /(no more than|at most|up to)\s+(\d+)\s*(hour|hours|day|days|week|weeks)\s+in advance/i;
const atLeastPatterns = /(at\s+least|least|minimum|min\.?|not\s+less\s+than|must\s+book\s+at\s+least|≥|>=)\s+(\d+)\s*(hour|hours|day|days|week|weeks)/i;

// Unit normalization utility
function normalizeAdvanceUnit(value: number, unit: string): number {
  switch(unit.toLowerCase()) {
    case 'day':
    case 'days':
      return value * 24;
    case 'week':
    case 'weeks':
      return value * 24 * 7;
    case 'hour':
    case 'hours':
    default:
      return value;
  }
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

// Enhanced post-processing sanitization layer
async function sanitizeRules(parsedResponse: any, originalRule: string): Promise<any> {
  console.log('Starting enhanced rule sanitization...');
  
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

  // Enhanced booking window rules - handle both advance booking constraint types
  if (parsedResponse.booking_window_rules) {
    parsedResponse.booking_window_rules.forEach((rule: any, index: number) => {
      // Fix operator for "no more than" patterns
      if (rule.constraint === 'less_than') {
        const noMoreThanMatch = originalRule.match(noMoreThanPatterns);
        if (noMoreThanMatch) {
          console.log(`[SANITIZE] Fixing booking window operator ${index}: less_than -> more_than (detected: ${noMoreThanMatch[0]})`);
          rule.constraint = 'more_than';
          rule.__corrected = true;
        }
      }

      // NEW: Fix operator for "at least" patterns
      if (rule.constraint === 'more_than') {
        const atLeastMatch = originalRule.match(atLeastPatterns);
        if (atLeastMatch) {
          console.log(`[SANITIZE] Fixing booking window operator ${index}: more_than -> less_than (detected: ${atLeastMatch[0]})`);
          rule.constraint = 'less_than';
          rule.__corrected = true;
        }
      }

      // Normalize units to hours
      if (rule.unit && rule.unit !== 'hours') {
        const originalValue = rule.value;
        const originalUnit = rule.unit;
        rule.value = normalizeAdvanceUnit(rule.value, rule.unit);
        rule.unit = 'hours';
        console.log(`[SANITIZE] Unit conversion ${index}: ${originalValue} ${originalUnit} -> ${rule.value} hours`);
        rule.__unit_converted = true;
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

    const prompt = `
You are an advanced AI booking rule interpreter that extracts structured data from natural language venue booking rules. You must analyze the input text and identify ALL applicable rule types from the six categories below.

CRITICAL PARSING INSTRUCTIONS:
1. "ONLY" PATTERNS: When you see "only [users] can book", this means ONLY those users are allowed, everyone else is blocked.
   - Generate booking_conditions with condition_type: "user_tags"
   - Use operator: "contains_none_of" (this blocks users who DON'T have the allowed tags)
   - Set value to the allowed tags
   - Example: "Only Club Members can book" → operator: "contains_none_of", value: ["Club Members"]

2. BOOKING WINDOW CONSTRAINTS: 
   a) "no more than/at most/up to X time in advance":
      - This means users CANNOT book if they try to book MORE than X time in advance
      - Use constraint: "more_than" (blocks if booking is more than X time ahead)
      - Example: "no more than 48 hours in advance" → constraint: "more_than", value: 48, unit: "hours"
   
   b) "at least/minimum/must book at least X time in advance":
      - This means users CANNOT book if they try to book LESS than X time in advance
      - Use constraint: "less_than" (blocks if booking is less than X time ahead)
      - Example: "must book at least 24 hours in advance" → constraint: "less_than", value: 24, unit: "hours"

3. UNIT PRESERVATION: Always preserve the original time units mentioned:
   - "48 hours" → value: 48, unit: "hours"
   - "14 days" → value: 14, unit: "days"  
   - "2 weeks" → value: 2, unit: "weeks"

RULE CATEGORIES TO DETECT:

1. BOOKING CONDITIONS (Access restrictions)
   - Keywords: "only", "can book", "restricted to", "allowed", "permitted"
   - Format: Who can book which spaces at what times

2. PRICING RULES (Rate variations)
   - Keywords: "charge", "rate", "price", "$", "cost", "fee"
   - Format: Different prices based on time, user type, or conditions

3. QUOTA RULES (Usage limits)
   - Keywords: "limit", "maximum", "per week", "per day", "hours", "bookings"
   - Format: Restrictions on how much users can book

4. BUFFER TIME RULES (Time gaps)
   - Keywords: "buffer", "gap", "between", "turnaround", "minutes"
   - Format: Required time between consecutive bookings

5. BOOKING WINDOW RULES (Advance booking limits)
   - Keywords: "advance", "ahead", "in advance", "hours/days before", "at least", "no more than"
   - Format: How far in advance different users can book

6. SPACE SHARING RULES (Space dependencies)
   - Keywords: "split", "block", "vice-versa", "if...then", "connected"
   - Format: Relationships between spaces (parent/child, blocking)

RESPONSE FORMAT:
Return a JSON object with these fields:

{
  "booking_conditions": [
    {
      "space": ["Space Name"],
      "time_range": "HH:MM–HH:MM",
      "days": ["Monday", "Tuesday", ...],
      "condition_type": "user_tags",
      "operator": "contains_none_of" | "contains_any_of",
      "value": ["tag1", "tag2"],
      "explanation": "Clear explanation of this condition"
    }
  ],
  "pricing_rules": [
    {
      "space": ["Space Name"],
      "time_range": "HH:MM–HH:MM",
      "days": ["Monday", "Tuesday", ...],
      "rate": {"amount": 25, "unit": "hour"},
      "condition_type": "user_tags" | "duration",
      "operator": "contains_any_of" | "greater_than",
      "value": ["tag"] | "duration_string",
      "explanation": "Clear explanation of this pricing rule"
    }
  ],
  "quota_rules": [
    {
      "target": "individuals_with_tags",
      "tags": ["Coach"],
      "quota_type": "time",
      "value": "12h",
      "period": "week",
      "affected_spaces": ["Court 1", "Court 2"],
      "consideration_time": "any_time",
      "explanation": "Clear explanation of this quota"
    }
  ],
  "buffer_time_rules": [
    {
      "spaces": ["PB A", "PB B"],
      "buffer_duration": "15m",
      "explanation": "Clear explanation of this buffer rule"
    }
  ],
  "booking_window_rules": [
    {
      "user_scope": "users_with_tags",
      "tags": ["Public"],
      "constraint": "more_than" | "less_than",
      "value": 48,
      "unit": "hours",
      "spaces": ["Court 1", "Court 2"],
      "explanation": "Clear explanation of this booking window rule"
    }
  ],
  "space_sharing": [
    {
      "from": "PB A",
      "to": "Court 3"
    }
  ],
  "summary": "Comprehensive summary of all detected rules and their interactions"
}

IMPORTANT NOTES:
- For "only...can book" patterns, use "contains_none_of" operator
- For "at least X in advance", use "less_than" constraint
- For "no more than X in advance", use "more_than" constraint
- Preserve original time units (hours, days, weeks)
- Always include "explanation" fields for human readability
- Use 24-hour time format (e.g., "17:00" not "5 PM")
- Extract ALL rule types present in the input
- If no rules of a category are found, omit that array entirely

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

    // Add setup guide generation
    const setupGuide = generateSetupGuide(parsedResponse)
    parsedResponse.setup_guide = setupGuide

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
