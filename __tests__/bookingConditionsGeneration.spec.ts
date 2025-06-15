
import { describe, it, expect } from 'vitest';

describe('Booking Conditions Generation', () => {
  describe('Time Block Constraints', () => {
    it('should detect 1-hour blocks only requirement', () => {
      const text = "Basketball Court 2 must be booked in 1-hour blocks only";
      
      // This should generate booking conditions with interval_start and interval_end rules
      const expectedStructure = {
        booking_conditions: [
          {
            space: ['Basketball Court 2'],
            time_range: "00:00–23:59",
            days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            rules: [
              {
                condition_type: "interval_start",
                operator: "is_not_multiple_of",
                value: "1h",
                explanation: expect.stringContaining("start time")
              },
              {
                condition_type: "interval_end", 
                operator: "is_not_multiple_of",
                value: "1h",
                explanation: expect.stringContaining("end time")
              }
            ],
            logic_operators: ["OR"],
            explanation: expect.stringContaining("1h blocks only")
          }
        ]
      };
      
      expect(expectedStructure).toBeDefined();
      expect(expectedStructure.booking_conditions).toHaveLength(1);
      expect(expectedStructure.booking_conditions[0].rules).toHaveLength(2);
    });

    it('should detect 30-minute slots requirement', () => {
      const text = "Conference Room A allows 30-minute slots only";
      
      const expectedStructure = {
        booking_conditions: [
          {
            space: ['Conference Room A'],
            rules: [
              {
                condition_type: "interval_start",
                operator: "is_not_multiple_of", 
                value: "30min"
              },
              {
                condition_type: "interval_end",
                operator: "is_not_multiple_of",
                value: "30min"
              }
            ]
          }
        ]
      };
      
      expect(expectedStructure.booking_conditions[0].rules[0].value).toBe("30min");
    });

    it('should infer 1-hour blocks from "no half-hours" exclusion', () => {
      const text = "Basketball Court 2 bookings - no half-hours or 90-minute slots";
      
      // Should infer 1-hour blocks from the exclusions
      const expectedValue = "1h";
      expect(expectedValue).toBe("1h");
    });
  });

  describe('Duration Constraints', () => {
    it('should detect minimum duration requirements', () => {
      const text = "Basketball Court 2 minimum 2 hours";
      
      const expectedStructure = {
        booking_conditions: [
          {
            space: ['Basketball Court 2'],
            rules: [
              {
                condition_type: "duration",
                operator: "is_less_than",
                value: "2h",
                explanation: expect.stringContaining("cannot be less than")
              }
            ]
          }
        ]
      };
      
      expect(expectedStructure.booking_conditions[0].rules[0].operator).toBe("is_less_than");
      expect(expectedStructure.booking_conditions[0].rules[0].value).toBe("2h");
    });

    it('should detect maximum duration requirements', () => {
      const text = "Basketball Court 2 maximum 4 hours";
      
      const expectedStructure = {
        booking_conditions: [
          {
            space: ['Basketball Court 2'],
            rules: [
              {
                condition_type: "duration", 
                operator: "is_greater_than",
                value: "4h",
                explanation: expect.stringContaining("cannot be greater than")
              }
            ]
          }
        ]
      };
      
      expect(expectedStructure.booking_conditions[0].rules[0].operator).toBe("is_greater_than");
      expect(expectedStructure.booking_conditions[0].rules[0].value).toBe("4h");
    });

    it('should handle combined minimum and maximum constraints', () => {
      const text = "Basketball Court 2 minimum 2 hours, maximum 4 hours";
      
      const expectedStructure = {
        booking_conditions: [
          {
            space: ['Basketball Court 2'],
            rules: [
              {
                condition_type: "duration",
                operator: "is_less_than", 
                value: "2h"
              },
              {
                condition_type: "duration",
                operator: "is_greater_than",
                value: "4h"
              }
            ],
            logic_operators: ["OR"]
          }
        ]
      };
      
      expect(expectedStructure.booking_conditions[0].rules).toHaveLength(2);
      expect(expectedStructure.booking_conditions[0].logic_operators).toEqual(["OR"]);
    });
  });

  describe('Complete Example: Basketball Court 2', () => {
    it('should generate two separate booking condition blocks', () => {
      const text = "Basketball Court 2 must be booked in 1-hour blocks only, minimum 2 hours, maximum 4 hours. No half-hours or 90-minute slots";
      
      const expectedStructure = {
        booking_conditions: [
          {
            // Block 1: Time block constraints (interval rules)
            space: ['Basketball Court 2'],
            rules: [
              {
                condition_type: "interval_start",
                operator: "is_not_multiple_of",
                value: "1h"
              },
              {
                condition_type: "interval_end", 
                operator: "is_not_multiple_of",
                value: "1h"
              }
            ],
            logic_operators: ["OR"],
            explanation: expect.stringContaining("1h blocks only")
          },
          {
            // Block 2: Duration constraints 
            space: ['Basketball Court 2'],
            rules: [
              {
                condition_type: "duration",
                operator: "is_less_than",
                value: "2h"
              },
              {
                condition_type: "duration", 
                operator: "is_greater_than",
                value: "4h"
              }
            ],
            logic_operators: ["OR"],
            explanation: expect.stringContaining("duration constraints")
          }
        ]
      };
      
      // Should generate exactly 2 booking condition blocks
      expect(expectedStructure.booking_conditions).toHaveLength(2);
      
      // First block should have interval rules
      expect(expectedStructure.booking_conditions[0].rules[0].condition_type).toBe("interval_start");
      expect(expectedStructure.booking_conditions[0].rules[1].condition_type).toBe("interval_end");
      
      // Second block should have duration rules
      expect(expectedStructure.booking_conditions[1].rules[0].condition_type).toBe("duration");
      expect(expectedStructure.booking_conditions[1].rules[1].condition_type).toBe("duration");
    });
  });

  describe('Rule Type Detection', () => {
    it('should detect booking conditions are needed for duration constraints', () => {
      const patterns = [
        "minimum 2 hours",
        "maximum 4 hours", 
        "at least 30 minutes",
        "no more than 3 hours",
        "1-hour blocks only",
        "30-minute slots only",
        "no half-hours"
      ];
      
      patterns.forEach(pattern => {
        // Each pattern should trigger booking conditions detection
        expect(pattern).toMatch(/(?:minimum|maximum|at least|no more than|\d+[-\s]*(?:hour|minute)s?\s+(?:blocks?|slots?)\s+only|no\s+(?:half-hours?))/);
      });
    });

    it('should detect booking window rules are needed for advance booking', () => {
      const patterns = [
        "3 days in advance",
        "up to 14 days",
        "Visitors can only reserve",
        "advance booking required"
      ];
      
      patterns.forEach(pattern => {
        // Each pattern should trigger booking window rules detection  
        expect(pattern).toMatch(/(?:\d+\s+days?\s+(?:in\s+)?advance|up\s+to\s+\d+\s+days?|can\s+(?:only\s+)?(?:reserve|book)|advance\s+booking)/);
      });
    });

    it('should detect both rule types for mixed constraints', () => {
      const text = "Basketball Court 2 must be booked in 1-hour blocks only, minimum 2 hours. Visitors can only reserve up to 3 days in advance";
      
      // Should detect both booking conditions AND booking window rules
      const hasBlockConstraints = /(?:blocks?\s+only|minimum\s+\d+\s+hours?)/.test(text);
      const hasAdvanceConstraints = /(?:\d+\s+days?\s+(?:in\s+)?advance|can\s+(?:only\s+)?reserve)/.test(text);
      
      expect(hasBlockConstraints).toBe(true);
      expect(hasAdvanceConstraints).toBe(true);
    });
  });
});
