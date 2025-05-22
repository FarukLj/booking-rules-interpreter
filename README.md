
# AI Booking Rule Assistant

An AI-powered application that helps interpret and structure natural language booking rules for venues.

## Features

- Natural language input for booking rules
- AI-powered interpretation using OpenAI's GPT-4
- Structured display of booking rules including:
  - Space Name
  - Availability
  - Allowed Users
  - Pricing
  - Rule Explanation
  - AI Reasoning

## Setup

### Prerequisites

- Node.js and npm installed
- Supabase account for Edge Functions
- OpenAI API key

### Setting Up Supabase Edge Function

1. Connect your Lovable project to Supabase using the Supabase button in the top right corner
2. After connecting, deploy the Edge Function:
   
   ```
   supabase functions deploy analyze-booking-rule
   ```

3. Add your OpenAI API key to Supabase secrets:

   ```
   supabase secrets set OPENAI_API_KEY=your_openai_api_key
   ```

### Running the Application

1. Install dependencies:

   ```
   npm install
   ```

2. Start the development server:

   ```
   npm run dev
   ```

3. Open your browser to `http://localhost:8080`

## Example Rules

Try entering these example rules:

- "Only The Team can book Space 1 from 9am to 10pm at $25/hour or $150 full day"
- "Premium Members can book Conference Room A on weekdays from 8am-6pm at $50/hour"
- "Studio 3 is available for Staff on weekends, $200 flat rate"

## How It Works

1. Enter your booking rule in natural language
2. The rule is sent to our Supabase Edge Function, which securely calls the OpenAI API
3. GPT-4 interprets the rule and returns a structured representation
4. The app displays the structured rule in an easy-to-read format
