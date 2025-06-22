import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEvaluationEngine } from '../src/lib/ruleEvaluationEngine';
import { RuleResult, BookingWindowRule } from '../src/types/RuleResult';

describe('Booking Window Rules', () => {
  let engine: RuleEvaluationEngine;
  
  const createTestRules = (bookingWindowRules: BookingWindowRule[]): RuleResult => ({
    booking_window_rules: bookingWindowRules
  });

  const createTestInput = (userTags: string[], space: string, daysAhead: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return {
      userTags,
      space,
      date,
      startTime: "09:00",
      endTime: "10:00"
    };
  };

  describe('Sales Team Scenario', () => {
    beforeEach(() => {
      const rules = createTestRules([
        {
          user_scope: "users_with_tags",
          tags: ["Sales Team"],
          constraint: "less_than",
          value: 30,
          unit: "days",
          spaces: ["Sales Desk 1", "Sales Desk 2", "Sales Desk 3", "Sales Desk 4", "Sales Desk 5", "Sales Desk 6", "Sales Desk 7", "Sales Desk 8", "Sales Desk 9", "Sales Desk 10"],
          explanation: "Sales team can book up to 30 days in advance"
        },
        {
          user_scope: "all_users",
          constraint: "less_than",
          value: 3,
          unit: "days", 
          spaces: ["Sales Desk 1", "Sales Desk 2", "Sales Desk 3", "Sales Desk 4", "Sales Desk 5", "Sales Desk 6", "Sales Desk 7", "Sales Desk 8", "Sales Desk 9", "Sales Desk 10"],
          explanation: "Everyone else can book up to 3 days in advance"
        }
      ]);
      
      engine = new RuleEvaluationEngine(rules);
    });

    it('Sales Team booking 5 days ahead should be allowed', () => {
      const input = createTestInput(["Sales Team"], "Sales Desk 1", 5);
      const result = engine.evaluate(input);
      
      expect(result.allowed).toBe(true);
      expect(result.errorReason).toContain("Sales team can book up to 30 days in advance");
    });

    it('Sales Team booking 50 days ahead should be rejected', () => {
      const input = createTestInput(["Sales Team"], "Sales Desk 1", 50);
      const result = engine.evaluate(input);
      
      expect(result.allowed).toBe(false);
      expect(result.errorReason).toContain("can only book up to 30 days in advance");
    });

    it('Anonymous user booking 2 days ahead should be allowed', () => {
      const input = createTestInput([], "Sales Desk 1", 2);
      const result = engine.evaluate(input);
      
      expect(result.allowed).toBe(true);
      expect(result.errorReason).toContain("can book up to 3 days in advance");
    });

    it('Anonymous user booking 6 days ahead should be rejected', () => {
      const input = createTestInput([], "Sales Desk 1", 6);
      const result = engine.evaluate(input);
      
      expect(result.allowed).toBe(false);
      expect(result.errorReason).toContain("can only book up to 3 days in advance");
    });

    it('User with different space should not be affected by rules', () => {
      const input = createTestInput(["Sales Team"], "Conference Room A", 50);
      const result = engine.evaluate(input);
      
      expect(result.allowed).toBe(true);
      expect(result.errorReason).toContain("no booking window restrictions apply");
    });
  });

  describe('Edge Cases', () => {
    it('Booking exactly on the limit should be handled correctly', () => {
      const rules = createTestRules([
        {
          user_scope: "all_users",
          constraint: "less_than",
          value: 7,
          unit: "days",
          spaces: ["Test Space"],
          explanation: "Can book up to 7 days in advance"
        }
      ]);
      
      engine = new RuleEvaluationEngine(rules);
      
      // 7 days ahead should be rejected (less_than means < 7, not <= 7)
      const input = createTestInput([], "Test Space", 7);
      const result = engine.evaluate(input);
      
      expect(result.allowed).toBe(false);
    });

    it('Booking one day before limit should be allowed', () => {
      const rules = createTestRules([
        {
          user_scope: "all_users",
          constraint: "less_than",
          value: 7,
          unit: "days",
          spaces: ["Test Space"],
          explanation: "Can book up to 7 days in advance"
        }
      ]);
      
      engine = new RuleEvaluationEngine(rules);
      
      // 6 days ahead should be allowed
      const input = createTestInput([], "Test Space", 6);
      const result = engine.evaluate(input);
      
      expect(result.allowed).toBe(true);
    });
  });

  describe('More Than Constraint', () => {
    it('More than constraint should work correctly', () => {
      const rules = createTestRules([
        {
          user_scope: "all_users",
          constraint: "more_than",
          value: 2,
          unit: "days",
          spaces: ["Test Space"],
          explanation: "Must book more than 2 days in advance"
        }
      ]);
      
      engine = new RuleEvaluationEngine(rules);
      
      // 1 day ahead should be rejected
      const input1 = createTestInput([], "Test Space", 1);
      const result1 = engine.evaluate(input1);
      expect(result1.allowed).toBe(false);
      
      // 3 days ahead should be allowed
      const input2 = createTestInput([], "Test Space", 3);
      const result2 = engine.evaluate(input2);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('No Rules', () => {
    it('Should allow booking when no booking window rules exist', () => {
      const rules = createTestRules([]);
      engine = new RuleEvaluationEngine(rules);
      
      const input = createTestInput(["Sales Team"], "Sales Desk 1", 50);
      const result = engine.evaluate(input);
      
      expect(result.allowed).toBe(true);
      expect(result.errorReason).toContain("no booking window restrictions apply");
    });
  });
}); 