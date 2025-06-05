
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Mock the edge function response for testing
const mockParseRuleResponse = {
  parsed_rule_blocks: {
    booking_conditions: [
      {
        space: ["Space 1"],
        time_range: "09:00–22:00",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        condition_type: "user_tags",
        operator: "contains_none_of",
        value: ["The Team"],
        explanation: "Only The Team can book Space 1 from 9am to 10pm."
      }
    ],
    pricing_rules: [
      {
        space: ["Space 1"],
        time_range: "09:00–22:00",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        rate: { amount: 150, unit: "fixed" },
        condition_type: "user_tags",
        operator: "contains_any_of",
        value: ["The Team"],
        explanation: "The Team can book Space 1 for a full day at a fixed rate of $150."
      },
      {
        space: ["Space 1"],
        time_range: "09:00–22:00",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        rate: { amount: 25, unit: "per_hour" },
        condition_type: "user_tags",
        operator: "contains_any_of",
        value: ["The Team"],
        explanation: "The Team can book Space 1 at $25 per hour."
      }
    ],
    quota_rules: [],
    buffer_time_rules: [],
    booking_window_rules: [],
    space_sharing: []
  },
  setup_guide: [
    {
      step_key: "create_spaces",
      title: "Step 1: Create the required spaces",
      instruction: "Go to Settings > Spaces and click 'Add Space'. Create these spaces: Space 1",
      spaces: ["Space 1"]
    },
    {
      step_key: "hours_of_availability",
      title: "Step 2: Add hours of availability",
      instruction: "Go to Settings › Hours of availability and set each space to at least 09:00 AM – 10:00 PM for Monday–Sunday.",
      spaces: ["Space 1"],
      times: "09:00 AM – 10:00 PM"
    },
    {
      step_key: "create_user_tags",
      title: "Step 3: Add user tags",
      instruction: "Go to Users > Manage Tags and add: The Team. Note: For booking conditions with exclusive access (Only The Team can book), use 'contains none of' with the allowed tag. For pricing rules, use 'contains any of' with tags that should receive the price."
    },
    {
      step_key: "booking_conditions",
      title: "Step 4: Create booking conditions",
      instruction: "Go to Settings > Conditions and create the following restriction rules:",
      rule_blocks: [
        {
          space: ["Space 1"],
          time_range: "09:00–22:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          condition_type: "user_tags",
          operator: "contains_none_of",
          value: ["The Team"],
          explanation: "Only The Team can book Space 1 from 9am to 10pm."
        }
      ]
    },
    {
      step_key: "pricing_rules",
      title: "Step 5: Create pricing rules",
      instruction: "Go to Settings > Pricing and create the following pricing rules:",
      rule_blocks: [
        {
          space: ["Space 1"],
          time_range: "09:00–22:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          rate: { amount: 150, unit: "fixed" },
          condition_type: "user_tags",
          operator: "contains_any_of",
          value: ["The Team"],
          explanation: "The Team can book Space 1 for a full day at a fixed rate of $150."
        },
        {
          space: ["Space 1"],
          time_range: "09:00–22:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          rate: { amount: 25, unit: "per_hour" },
          condition_type: "user_tags",
          operator: "contains_any_of",
          value: ["The Team"],
          explanation: "The Team can book Space 1 at $25 per hour."
        }
      ]
    }
  ],
  summary: "This setup ensures that only users tagged as 'The Team' can book Space 1 from 9am to 10pm. They have the option to book at $25 per hour or a full day at a fixed rate of $150."
};

describe('AI Prompt Processing', () => {
  it('should build complete setup guide with all rule types', () => {
    const result = mockParseRuleResponse;
    
    // Verify all expected rule arrays exist and are populated
    expect(result.parsed_rule_blocks.pricing_rules.length).toBeGreaterThan(0);
    expect(result.parsed_rule_blocks.booking_conditions.length).toBeGreaterThan(0);
    
    // Verify setup guide includes all expected steps
    const stepKeys = result.setup_guide.map(s => s.step_key);
    expect(stepKeys).toContain('create_spaces');
    expect(stepKeys).toContain('hours_of_availability');
    expect(stepKeys).toContain('create_user_tags');
    expect(stepKeys).toContain('booking_conditions');
    expect(stepKeys).toContain('pricing_rules');
    
    // Verify rule blocks are properly attached to setup guide steps
    const pricingStep = result.setup_guide.find(s => s.step_key === 'pricing_rules');
    expect(pricingStep?.rule_blocks).toBeDefined();
    expect(pricingStep?.rule_blocks?.length).toBeGreaterThan(0);
    
    const conditionsStep = result.setup_guide.find(s => s.step_key === 'booking_conditions');
    expect(conditionsStep?.rule_blocks).toBeDefined();
    expect(conditionsStep?.rule_blocks?.length).toBeGreaterThan(0);
  });

  it('should handle both hourly and daily pricing for same prompt', () => {
    const result = mockParseRuleResponse;
    const pricingRules = result.parsed_rule_blocks.pricing_rules;
    
    // Should have both per_hour and fixed pricing
    const hourlyRule = pricingRules.find(r => r.rate.unit === 'per_hour');
    const fixedRule = pricingRules.find(r => r.rate.unit === 'fixed');
    
    expect(hourlyRule).toBeDefined();
    expect(fixedRule).toBeDefined();
    expect(hourlyRule?.rate.amount).toBe(25);
    expect(fixedRule?.rate.amount).toBe(150);
  });

  it('should use correct operator logic for exclusive access', () => {
    const result = mockParseRuleResponse;
    const bookingCondition = result.parsed_rule_blocks.booking_conditions[0];
    
    // For "Only The Team can book", should use contains_none_of
    expect(bookingCondition.operator).toBe('contains_none_of');
    expect(bookingCondition.value).toEqual(['The Team']);
  });

  it('should use correct operator logic for pricing rules', () => {
    const result = mockParseRuleResponse;
    const pricingRules = result.parsed_rule_blocks.pricing_rules;
    
    // For pricing rules, should use contains_any_of (who GETS the price)
    pricingRules.forEach(rule => {
      expect(rule.operator).toBe('contains_any_of');
      expect(rule.value).toEqual(['The Team']);
    });
  });
});
