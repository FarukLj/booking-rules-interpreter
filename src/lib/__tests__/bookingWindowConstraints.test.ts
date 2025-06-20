
import { RuleEvaluationEngine } from '../ruleEvaluationEngine';
import { RuleResult, BookingWindowRule } from '@/types/RuleResult';

describe('Booking Window Constraint Logic', () => {
  // Helper to create a rule evaluation engine with booking window rules
  const createEngine = (rules: BookingWindowRule[]) => {
    const ruleResult: RuleResult = {
      booking_window_rules: rules
    };
    return new RuleEvaluationEngine(ruleResult);
  };

  // Helper to create a future date
  const getFutureDate = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  };

  describe('Sales Team Scenario: 30 days vs Everyone Else: 3 days', () => {
    const rules: BookingWindowRule[] = [
      {
        user_scope: "users_with_tags",
        tags: ["Sales Team"],
        constraint: "less_than",
        value: 30,
        unit: "days",
        spaces: ["Sales Desk 1", "Sales Desk 2"],
        explanation: "Sales team can book up to 30 days in advance"
      },
      {
        user_scope: "all_users",
        constraint: "less_than", 
        value: 3,
        unit: "days",
        spaces: ["Sales Desk 1", "Sales Desk 2"],
        explanation: "Everyone else can book up to 3 days in advance"
      }
    ];

    test('Sales Team: 5 days ahead should be ALLOWED', () => {
      const engine = createEngine(rules);
      const result = engine.evaluate({
        userTags: ["Sales Team"],
        space: "Sales Desk 1",
        date: getFutureDate(5),
        startTime: "09:00",
        endTime: "10:00"
      });

      expect(result.allowed).toBe(true);
      expect(result.errorReason).toContain("Sales Team");
      expect(result.errorReason).toContain("30-day");
    });

    test('Sales Team: 45 days ahead should be REJECTED', () => {
      const engine = createEngine(rules);
      const result = engine.evaluate({
        userTags: ["Sales Team"],
        space: "Sales Desk 1", 
        date: getFutureDate(45),
        startTime: "09:00",
        endTime: "10:00"
      });

      expect(result.allowed).toBe(false);
      expect(result.errorReason).toContain("Sales Team");
      expect(result.errorReason).toContain("30 days");
    });

    test('Anonymous User: 2 days ahead should be ALLOWED', () => {
      const engine = createEngine(rules);
      const result = engine.evaluate({
        userTags: ["Anonymous"],
        space: "Sales Desk 1",
        date: getFutureDate(2),
        startTime: "09:00", 
        endTime: "10:00"
      });

      expect(result.allowed).toBe(true);
    });

    test('Anonymous User: 6 days ahead should be REJECTED', () => {
      const engine = createEngine(rules);
      const result = engine.evaluate({
        userTags: ["Anonymous"],
        space: "Sales Desk 1",
        date: getFutureDate(6),
        startTime: "09:00",
        endTime: "10:00"
      });

      expect(result.allowed).toBe(false);
      expect(result.errorReason).toContain("3 days");
    });

    test('No tags (empty array): 2 days ahead should be ALLOWED', () => {
      const engine = createEngine(rules);
      const result = engine.evaluate({
        userTags: [],
        space: "Sales Desk 1",
        date: getFutureDate(2),
        startTime: "09:00",
        endTime: "10:00"
      });

      expect(result.allowed).toBe(true);
    });

    test('Boundary Test: Sales Team exactly 30 days should be REJECTED', () => {
      const engine = createEngine(rules);
      const result = engine.evaluate({
        userTags: ["Sales Team"],
        space: "Sales Desk 1",
        date: getFutureDate(30),
        startTime: "09:00",
        endTime: "10:00"
      });

      // "less_than 30 days" means exactly 30 days should be rejected
      expect(result.allowed).toBe(false);
    });

    test('Boundary Test: Anonymous exactly 3 days should be REJECTED', () => {
      const engine = createEngine(rules);
      const result = engine.evaluate({
        userTags: ["Anonymous"],
        space: "Sales Desk 1", 
        date: getFutureDate(3),
        startTime: "09:00",
        endTime: "10:00"
      });

      // "less_than 3 days" means exactly 3 days should be rejected
      expect(result.allowed).toBe(false);
    });
  });

  describe('Constraint Logic Edge Cases', () => {
    test('Same day booking (0 days ahead)', () => {
      const rules: BookingWindowRule[] = [{
        user_scope: "all_users",
        constraint: "less_than",
        value: 1,
        unit: "days", 
        spaces: ["Test Space"],
        explanation: "Must book within 1 day"
      }];

      const engine = createEngine(rules);
      const result = engine.evaluate({
        userTags: [],
        space: "Test Space",
        date: new Date(), // Today
        startTime: "09:00",
        endTime: "10:00"
      });

      expect(result.allowed).toBe(true);
    });

    test('Multiple applicable rules - most restrictive wins', () => {
      const rules: BookingWindowRule[] = [
        {
          user_scope: "users_with_tags",
          tags: ["VIP"],
          constraint: "less_than",
          value: 60,
          unit: "days",
          spaces: ["Premium Room"],
          explanation: "VIP users can book 60 days ahead"
        },
        {
          user_scope: "all_users", 
          constraint: "less_than",
          value: 7,
          unit: "days",
          spaces: ["Premium Room"],
          explanation: "General users can book 7 days ahead"
        }
      ];

      const engine = createEngine(rules);
      
      // VIP user booking 30 days ahead - should be allowed under VIP rule
      const vipResult = engine.evaluate({
        userTags: ["VIP"],
        space: "Premium Room",
        date: getFutureDate(30),
        startTime: "09:00", 
        endTime: "10:00"
      });

      expect(vipResult.allowed).toBe(true);
      expect(vipResult.errorReason).toContain("VIP");
    });
  });
});
