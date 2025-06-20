
// Test runner utility for booking window constraints
// This can be used to validate the logic in the browser console

import { RuleEvaluationEngine } from './ruleEvaluationEngine';
import { RuleResult, BookingWindowRule } from '@/types/RuleResult';

export class BookingWindowTestRunner {
  static runSalesTeamScenarioTests() {
    console.log("🧪 Running Sales Team Booking Window Tests");
    
    const rules: BookingWindowRule[] = [
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
    ];

    const ruleResult: RuleResult = { booking_window_rules: rules };
    const engine = new RuleEvaluationEngine(ruleResult);

    const getFutureDate = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date;
    };

    const testCases = [
      {
        name: "Sales Team: 5 days ahead",
        input: {
          userTags: ["Sales Team"],
          space: "Sales Desk 1",
          date: getFutureDate(5),
          startTime: "09:00",
          endTime: "10:00"
        },
        expectedAllowed: true,
        expectedContext: "Sales Team"
      },
      {
        name: "Sales Team: 50 days ahead", 
        input: {
          userTags: ["Sales Team"],
          space: "Sales Desk 1",
          date: getFutureDate(50),
          startTime: "09:00",
          endTime: "10:00"
        },
        expectedAllowed: false,
        expectedContext: "Sales Team"
      },
      {
        name: "Anonymous: 2 days ahead",
        input: {
          userTags: ["Anonymous"],
          space: "Sales Desk 1", 
          date: getFutureDate(2),
          startTime: "09:00",
          endTime: "10:00"
        },
        expectedAllowed: true,
        expectedContext: "general"
      },
      {
        name: "Anonymous: 6 days ahead",
        input: {
          userTags: ["Anonymous"],
          space: "Sales Desk 1",
          date: getFutureDate(6), 
          startTime: "09:00",
          endTime: "10:00"
        },
        expectedAllowed: false,
        expectedContext: "general"
      }
    ];

    console.log("\n📋 Test Results:");
    let passedTests = 0;
    let totalTests = testCases.length;

    testCases.forEach((testCase, index) => {
      console.log(`\n🧪 Test ${index + 1}: ${testCase.name}`);
      
      const result = engine.evaluate(testCase.input);
      
      const passed = result.allowed === testCase.expectedAllowed;
      
      console.log(`Expected: ${testCase.expectedAllowed ? 'ALLOWED' : 'REJECTED'}`);
      console.log(`Actual: ${result.allowed ? 'ALLOWED' : 'REJECTED'}`);
      console.log(`Message: ${result.errorReason}`);
      console.log(`Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
      
      if (passed) passedTests++;
    });

    console.log(`\n🎯 Summary: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log("🎉 All tests passed! Booking window logic is working correctly.");
    } else {
      console.log("⚠️ Some tests failed. Check the constraint logic.");
    }

    return { passedTests, totalTests };
  }

  // Utility to test a single booking scenario
  static testBookingScenario(userTags: string[], space: string, daysAhead: number) {
    console.log(`\n🧪 Testing: User [${userTags.join(', ')}] booking ${space} ${daysAhead} days ahead`);
    
    // Using the standard Sales Team scenario rules
    const rules: BookingWindowRule[] = [
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
    ];

    const ruleResult: RuleResult = { booking_window_rules: rules };
    const engine = new RuleEvaluationEngine(ruleResult);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const result = engine.evaluate({
      userTags,
      space,
      date: futureDate,
      startTime: "09:00",
      endTime: "10:00"
    });

    console.log(`Result: ${result.allowed ? '✅ ALLOWED' : '❌ REJECTED'}`);
    console.log(`Message: ${result.errorReason}`);
    
    return result;
  }
}

// Make it available globally for testing in browser console
if (typeof window !== 'undefined') {
  (window as any).BookingWindowTestRunner = BookingWindowTestRunner;
}
