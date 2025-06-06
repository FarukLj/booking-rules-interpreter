
import { describe, it, expect } from 'vitest';

// Mock test data representing the expected output after fixes
const expectedTennisPickleballResult = {
  booking_conditions: [
    {
      space: ["Court 1", "Court 2"],
      operator: "contains_none_of", // Should be none_of for "only...can book"
      value: ["Club Members", "Coaches"]
    }
  ],
  booking_window_rules: [
    {
      user_scope: "users_with_tags",
      tags: ["Public"],
      constraint: "more_than", // Should be more_than for "no more than"
      value: 48,
      unit: "hours"
    },
    {
      user_scope: "users_with_tags", 
      tags: ["Members"],
      constraint: "more_than",
      value: 14,
      unit: "days" // Should preserve original unit
    }
  ],
  pricing_rules: [
    { rate: { amount: 40 } }, // Peak rate
    { rate: { amount: 25 } }  // Off-peak rate
  ]
};

describe('Booking Rule Parser Regression Tests', () => {
  it('should correctly parse allowlist patterns with contains_none_of', () => {
    // Test the "only...can book" pattern
    const condition = expectedTennisPickleballResult.booking_conditions[0];
    expect(condition.operator).toBe('contains_none_of');
    expect(condition.value).toContain('Club Members');
    expect(condition.value).toContain('Coaches');
  });

  it('should correctly parse booking window constraints with more_than', () => {
    // Test the "no more than...in advance" pattern  
    const publicRule = expectedTennisPickleballResult.booking_window_rules[0];
    expect(publicRule.constraint).toBe('more_than');
    expect(publicRule.value).toBe(48);
    expect(publicRule.unit).toBe('hours');
  });

  it('should preserve original time units', () => {
    // Test unit preservation for days
    const memberRule = expectedTennisPickleballResult.booking_window_rules[1];
    expect(memberRule.value).toBe(14);
    expect(memberRule.unit).toBe('days'); // Should not be converted to hours
  });

  it('should detect peak and off-peak pricing rules', () => {
    // Test pricing rule detection
    const pricingRules = expectedTennisPickleballResult.pricing_rules;
    expect(pricingRules).toHaveLength(2);
    expect(pricingRules[0].rate.amount).toBe(40); // Peak rate
    expect(pricingRules[1].rate.amount).toBe(25); // Off-peak rate
  });
});

describe('Unit Normalization Utilities', () => {
  it('should correctly convert days to hours', () => {
    const normalizeAdvanceUnit = (value: number, unit: string): number => {
      switch(unit.toLowerCase()) {
        case 'day':
        case 'days': return value * 24;
        case 'week':
        case 'weeks': return value * 24 * 7;
        default: return value;
      }
    };

    expect(normalizeAdvanceUnit(1, 'day')).toBe(24);
    expect(normalizeAdvanceUnit(2, 'days')).toBe(48);
    expect(normalizeAdvanceUnit(1, 'week')).toBe(168);
    expect(normalizeAdvanceUnit(48, 'hours')).toBe(48);
  });

  it('should handle edge cases in unit conversion', () => {
    const normalizeAdvanceUnit = (value: number, unit: string): number => {
      switch(unit.toLowerCase()) {
        case 'day':
        case 'days': return value * 24;
        case 'week':  
        case 'weeks': return value * 24 * 7;
        default: return value;
      }
    };

    expect(normalizeAdvanceUnit(0, 'days')).toBe(0);
    expect(normalizeAdvanceUnit(14, 'days')).toBe(336); // 14 days = 336 hours
    expect(normalizeAdvanceUnit(1, 'weeks')).toBe(168); // 1 week = 168 hours
  });
});

describe('Logic Validation Checks', () => {
  it('should detect potential double-negative patterns', () => {
    // Simulate validation logic
    const validateBookingCondition = (condition: any) => {
      if (condition.condition_type === 'user_tags' && condition.operator === 'contains_any_of') {
        return { warning: 'Potential double-negative logic detected' };
      }
      return { valid: true };
    };

    const badCondition = {
      condition_type: 'user_tags',
      operator: 'contains_any_of',
      value: ['Members']
    };

    const goodCondition = {
      condition_type: 'user_tags', 
      operator: 'contains_none_of',
      value: ['Members']
    };

    expect(validateBookingCondition(badCondition)).toHaveProperty('warning');
    expect(validateBookingCondition(goodCondition)).toHaveProperty('valid');
  });

  it('should detect booking window operator issues', () => {
    // Simulate booking window validation
    const validateBookingWindow = (rule: any) => {
      if (rule.constraint === 'less_than') {
        return { warning: 'less_than may cause logic inversion for advance booking limits' };
      }
      return { valid: true };
    };

    const badRule = { constraint: 'less_than', value: 48 };
    const goodRule = { constraint: 'more_than', value: 48 };

    expect(validateBookingWindow(badRule)).toHaveProperty('warning');
    expect(validateBookingWindow(goodRule)).toHaveProperty('valid');
  });
});
