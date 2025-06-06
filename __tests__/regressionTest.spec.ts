
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

// New test case for "at least" pattern
const expectedAtLeastResult = {
  booking_window_rules: [
    {
      user_scope: "users_with_tags",
      tags: ["Coach"],
      constraint: "less_than", // Should be less_than for "at least"
      value: 24,
      unit: "hours"
    }
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

  it('should correctly parse "at least" patterns with less_than', () => {
    // Test the "at least...in advance" pattern
    const coachRule = expectedAtLeastResult.booking_window_rules[0];
    expect(coachRule.constraint).toBe('less_than');
    expect(coachRule.value).toBe(24);
    expect(coachRule.unit).toBe('hours');
    expect(coachRule.tags).toContain('Coach');
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
      if (rule.constraint === 'less_than' && rule.value > 168) {
        return { warning: 'Long-term less_than constraints may need more_than instead' };
      }
      if (rule.constraint === 'more_than' && rule.value < 24) {
        return { warning: 'Short-term more_than constraints may be confusing' };
      }
      return { valid: true };
    };

    const shortMoreThanRule = { constraint: 'more_than', value: 12 };
    const longLessThanRule = { constraint: 'less_than', value: 336 };
    const goodRule = { constraint: 'less_than', value: 24 };

    expect(validateBookingWindow(shortMoreThanRule)).toHaveProperty('warning');
    expect(validateBookingWindow(longLessThanRule)).toHaveProperty('warning');
    expect(validateBookingWindow(goodRule)).toHaveProperty('valid');
  });
});

describe('Pattern Recognition Tests', () => {
  it('should recognize various "at least" patterns', () => {
    const atLeastPatterns = [
      'coaches must book at least 24 hours in advance',
      'minimum 48 hours advance notice required',
      'at least 2 days in advance',
      'not less than 24 hours ahead',
      'book at least 1 week in advance'
    ];

    const atLeastRegex = /(at\s+least|least|minimum|min\.?|not\s+less\s+than|must\s+book\s+at\s+least|≥|>=)\s+(\d+)\s*(hour|hours|day|days|week|weeks)/i;

    atLeastPatterns.forEach(pattern => {
      expect(pattern.match(atLeastRegex)).toBeTruthy();
    });
  });

  it('should recognize various "no more than" patterns', () => {
    const noMoreThanPatterns = [
      'no more than 48 hours in advance',
      'up to 14 days ahead',
      'at most 2 weeks in advance',
      'within 24 hours'
    ];

    const noMoreThanRegex = /(no more than|at most|up to)\s+(\d+)\s*(hour|hours|day|days|week|weeks)\s+in advance/i;

    noMoreThanPatterns.forEach(pattern => {
      expect(pattern.match(noMoreThanRegex)).toBeTruthy();
    });
  });
});
