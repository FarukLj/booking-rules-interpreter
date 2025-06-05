
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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
   - Keywords: "advance", "ahead", "in advance", "hours/days before"
   - Format: How far in advance different users can book

6. SPACE SHARING RULES (Space dependencies)
   - Keywords: "split", "block", "vice-versa", "if...then", "connected"
   - Format: Relationships between spaces (parent/child, blocking)

ANALYSIS PROCESS:
1. Read the entire rule text carefully
2. Identify each sentence and what rule type(s) it represents
3. Extract structured data for EACH identified rule type
4. Generate a comprehensive response covering ALL detected rules

RESPONSE FORMAT:
Return a JSON object with these fields:

{
  "booking_conditions": [
    {
      "space": ["Space Name"],
      "time_range": "HH:MM–HH:MM",
      "days": ["Monday", "Tuesday", ...],
      "condition_type": "user_tags",
      "operator": "contains_any_of" | "contains_none_of",
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
      "constraint": "less_than",
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
    },
    {
      "from": "PB B", 
      "to": "Court 3"
    }
  ],
  "summary": "Comprehensive summary of all detected rules and their interactions"
}

EXAMPLES OF RULE DETECTION:

Input: "Only Club Members and Coaches can book Court 1 & Court 2 on weekday mornings before 8 AM"
Detected: BOOKING CONDITIONS
- Restricts access to specific user tags on specific spaces and times

Input: "charge $40/hour during peak time; otherwise $25/hour"
Detected: PRICING RULES  
- Two different rates based on time conditions

Input: "Limit each Coach to 12 hours per week"
Detected: QUOTA RULES
- Usage restriction for users with specific tag

Input: "15-minute buffer between reservations"
Detected: BUFFER TIME RULES
- Required gap between bookings

Input: "Guests must book no more than 48 hours in advance"
Detected: BOOKING WINDOW RULES
- Advance booking restriction for specific user type

Input: "If PB A is booked, block Court 3"
Detected: SPACE SHARING RULES
- Space dependency relationship

IMPORTANT NOTES:
- Always include "explanation" fields for human readability
- Use 24-hour time format (e.g., "17:00" not "5 PM")
- Extract ALL rule types present in the input
- If no rules of a category are found, omit that array entirely
- Be thorough - complex rules often contain multiple rule types

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
