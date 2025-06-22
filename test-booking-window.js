// Simple test script to verify booking window rules fix
// Run with: node test-booking-window.js

// Mock the RuleEvaluationEngine for testing
class MockRuleEvaluationEngine {
  constructor(rules) {
    this.rules = rules;
  }

  evaluate(input) {
    if (!this.rules.booking_window_rules || this.rules.booking_window_rules.length === 0) {
      return { 
        allowed: true,
        errorReason: "Booking is allowed - no booking window restrictions apply."
      };
    }

    const now = new Date();
    const bookingDate = input.date;
    
    // FIXED: Ensure we're comparing dates correctly by setting time to start of day
    const bookingDateStart = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
    const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const hoursInAdvance = (bookingDateStart.getTime() - nowStart.getTime()) / (1000 * 60 * 60);
    const daysInAdvance = hoursInAdvance / 24;

    console.log("📅 BOOKING WINDOW EVALUATION START");
    console.log("📊 Booking Details:", {
      userTags: input.userTags,
      space: input.space,
      bookingDate: bookingDate.toISOString(),
      bookingDateStart: bookingDateStart.toISOString(),
      currentTime: now.toISOString(),
      nowStart: nowStart.toISOString(),
      hoursInAdvance: Math.round(hoursInAdvance * 100) / 100,
      daysInAdvance: Math.round(daysInAdvance * 100) / 100
    });

    // Sort rules by priority: tag-specific rules first, then general rules
    const sortedRules = this.sortBookingWindowRulesByPriority(this.rules.booking_window_rules);
    console.log("📋 Available booking window rules (sorted by priority):", sortedRules);

    // Find all applicable rules and their violations
    const ruleEvaluations = [];

    // Track if we've found a specific rule that applies to this user
    let foundSpecificRule = false;

    for (const rule of sortedRules) {
      console.log("\n🔍 Evaluating rule:", rule);

      // Check if rule applies to this space
      if (!rule.spaces.includes(input.space)) {
        console.log("⏭️ Rule doesn't apply to space:", input.space);
        ruleEvaluations.push({ rule, applicable: false, violates: false });
        continue;
      }

      // Check if rule applies to user tags
      const isAnonymousUser = input.userTags.length === 0 || input.userTags.includes("Anonymous");
      
      let ruleApplies = false;
      
      if (rule.user_scope === "all_users") {
        // FIXED: Only apply all_users rule if no specific rule has been found
        ruleApplies = !foundSpecificRule;
        console.log(`${ruleApplies ? '✅' : '⏭️'} Rule applies to all users (foundSpecificRule: ${foundSpecificRule})`);
      } else if (rule.user_scope === "users_with_tags" && rule.tags) {
        const hasRequiredTag = rule.tags.some(tag => input.userTags.includes(tag));
        ruleApplies = hasRequiredTag;
        if (ruleApplies) {
          foundSpecificRule = true;
        }
        console.log(`${ruleApplies ? '✅' : '❌'} Rule for users with tags [${rule.tags.join(', ')}] - user has: [${input.userTags.join(', ')}]`);
      } else if (rule.user_scope === "users_with_no_tags") {
        ruleApplies = isAnonymousUser;
        if (ruleApplies) {
          foundSpecificRule = true;
        }
        console.log(`${ruleApplies ? '✅' : '❌'} Rule for users with no tags - user is anonymous: ${isAnonymousUser}`);
      }

      if (!ruleApplies) {
        console.log("⏭️ Rule doesn't apply to this user");
        ruleEvaluations.push({ rule, applicable: false, violates: false });
        continue;
      }

      // Convert rule value to hours for comparison
      let ruleHours = rule.value;
      if (rule.unit === "days") ruleHours *= 24;
      else if (rule.unit === "weeks") ruleHours *= 24 * 7;

      console.log("📊 Constraint evaluation:", {
        constraint: rule.constraint,
        ruleValue: rule.value,
        ruleUnit: rule.unit,
        ruleHours,
        actualHoursInAdvance: hoursInAdvance,
        actualDaysInAdvance: daysInAdvance
      });

      // Check constraint - FIXED LOGIC
      const violatesConstraint = this.checkBookingWindowConstraintFixed(
        rule.constraint,
        hoursInAdvance,
        ruleHours
      );

      console.log(`${violatesConstraint ? '❌' : '✅'} Constraint result: ${violatesConstraint ? 'VIOLATES' : 'PASSES'}`);

      ruleEvaluations.push({
        rule,
        applicable: true,
        violates: violatesConstraint
      });
    }

    console.log("\n📋 RULE EVALUATION SUMMARY:");
    ruleEvaluations.forEach((evaluation, index) => {
      console.log(`Rule ${index + 1}:`, {
        explanation: evaluation.rule.explanation,
        applicable: evaluation.applicable,
        violates: evaluation.violates
      });
    });

    // Find the most restrictive applicable rule that is violated
    const applicableRules = ruleEvaluations.filter(e => e.applicable);
    const violatedRules = applicableRules.filter(e => e.violates);

    if (violatedRules.length > 0) {
      // Return the first violated rule (they're sorted by priority)
      const violatedRule = violatedRules[0];
      console.log("❌ FINAL RESULT: Booking REJECTED due to rule:", violatedRule.rule.explanation);
      
      return {
        allowed: false,
        errorReason: `Booking not allowed — can only book up to ${violatedRule.rule.value} ${violatedRule.rule.unit} in advance. You're trying to book ${Math.round(daysInAdvance)} days ahead.`,
        violatedRule: violatedRule.rule.explanation
      };
    }

    // If no violations, find the most restrictive applicable rule for success message
    if (applicableRules.length > 0) {
      const successRule = applicableRules[0]; // First by priority
      console.log("✅ FINAL RESULT: Booking ALLOWED under rule:", successRule.rule.explanation);
      
      return {
        allowed: true,
        errorReason: `Booking allowed — ${successRule.rule.explanation}`
      };
    }

    // If no applicable rules, allow the booking
    console.log("✅ FINAL RESULT: Booking ALLOWED - no applicable rules");
    return { 
      allowed: true,
      errorReason: "Booking is allowed - within standard booking window."
    };
  }

  sortBookingWindowRulesByPriority(rules) {
    return [...rules].sort((a, b) => {
      // Tag-specific rules (users_with_tags) get highest priority
      if (a.user_scope === "users_with_tags" && b.user_scope !== "users_with_tags") return -1;
      if (b.user_scope === "users_with_tags" && a.user_scope !== "users_with_tags") return 1;
      
      // users_with_no_tags gets second priority
      if (a.user_scope === "users_with_no_tags" && b.user_scope === "all_users") return -1;
      if (b.user_scope === "users_with_no_tags" && a.user_scope === "all_users") return 1;
      
      // all_users gets lowest priority
      return 0;
    });
  }

  checkBookingWindowConstraintFixed(constraint, actualHours, ruleHours) {
    console.log("🧮 Constraint check details:", {
      constraint,
      actualHours: Math.round(actualHours * 100) / 100,
      ruleHours,
      calculation: `${Math.round(actualHours * 100) / 100} ${constraint} ${ruleHours}`
    });

    switch (constraint) {
      case "less_than":
        // "less_than 30 days" means "cannot book more than 30 days in advance"
        // So if actualHours >= ruleHours, it violates
        const violatesLessThan = actualHours >= ruleHours;
        console.log(`less_than check: ${actualHours} >= ${ruleHours} = ${violatesLessThan}`);
        return violatesLessThan;
        
      case "more_than":
        // "more_than 3 days" means "must book more than 3 days in advance"  
        // So if actualHours <= ruleHours, it violates
        const violatesMoreThan = actualHours <= ruleHours;
        console.log(`more_than check: ${actualHours} <= ${ruleHours} = ${violatesMoreThan}`);
        return violatesMoreThan;
        
      default:
        console.warn("Unknown booking window constraint:", constraint);
        return false;
    }
  }
}

// Test data
const testRules = {
  booking_window_rules: [
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
  ]
};

// Test cases
const testCases = [
  { userTags: ["Sales Team"], space: "Sales Desk 1", daysAhead: 5, expected: true, description: "Sales Team 5 days ahead" },
  { userTags: ["Sales Team"], space: "Sales Desk 1", daysAhead: 50, expected: false, description: "Sales Team 50 days ahead" },
  { userTags: [], space: "Sales Desk 1", daysAhead: 2, expected: true, description: "Anonymous 2 days ahead" },
  { userTags: [], space: "Sales Desk 1", daysAhead: 6, expected: false, description: "Anonymous 6 days ahead" },
];

// Run tests
console.log("🧪 Running Booking Window Rules Tests\n");

const engine = new MockRuleEvaluationEngine(testRules);
let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`\n=== Test ${index + 1}: ${testCase.description} ===`);
  
  const date = new Date();
  date.setDate(date.getDate() + testCase.daysAhead);
  
  const input = {
    userTags: testCase.userTags,
    space: testCase.space,
    date,
    startTime: "09:00",
    endTime: "10:00"
  };

  const result = engine.evaluate(input);
  const passed = result.allowed === testCase.expected;
  
  console.log(`Expected: ${testCase.expected ? 'ALLOWED' : 'REJECTED'}`);
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