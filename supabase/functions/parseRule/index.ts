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
      You are an AI that extracts structured data from natural language booking rules.
      The rules will be related to booking venues, spaces, or equipment.
      
      Example Rule: "Only The Team can book Space 1 from 9am to 10pm at $25/hour or $150 full day"
      
      Respond with a JSON object that contains the following keys:
      - "allowed_users": An array of user names or groups that are allowed to make the booking. If anyone is allowed, return ["anyone"].
      - "space": The name or identifier of the bookable space or equipment.
      - "times": An array of time ranges during which the booking is valid. Each time range should have "start" and "end" keys in 24-hour format (e.g., "09:00", "22:00").
      - "price": An object containing the pricing details. Include "hourly_rate" and "full_day_rate" if applicable. If the booking is free, return null.
      
      If a specific detail is not mentioned in the rule, return null for that key.
      
      Your response should be concise and only include the JSON object.
      
      Rule: ${rule}
    `

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
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
      parsedResponse = JSON.parse(aiResponse)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      throw new Error('Failed to parse AI response as JSON')
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
