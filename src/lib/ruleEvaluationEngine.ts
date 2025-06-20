import { RuleResult, PricingRule, BookingCondition, QuotaRule, BookingWindowRule, BufferTimeRule } from "@/types/RuleResult";

export interface SimulationInput {
  userTags: string[];
  space: string;
  date: Date;
  startTime: string;
  endTime: string;
}

export interface SimulationResult {
  allowed: boolean;
  totalPrice?: number;
  hourlyRate?: number;
  rateLabel?: string;
  errorReason?: string;
  violatedRule?: string;
  duration?: number; // in hours
}

export class RuleEvaluationEngine {
  private rules: RuleResult;

  constructor(rules: RuleResult) {
    this.rules = rules;
  }

  evaluate(input: SimulationInput): SimulationResult {
    console.log("🎯 Starting evaluation for input:", input);

    // Calculate duration
    const duration = this.calculateDuration(input.startTime, input.endTime);
    if (duration <= 0) {
      return {
        allowed: false,
        errorReason: "End time must be after start time",
        violatedRule: "Time validation"
      };
    }

    // Check booking conditions first (access control)
    const conditionResult = this.evaluateBookingConditions(input, duration);
    if (!conditionResult.allowed) {
      return conditionResult;
    }

    // Check booking window rules
    const windowResult = this.evaluateBookingWindow(input);
    if (!windowResult.allowed) {
      return windowResult;
    }

    // Check quota rules
    const quotaResult = this.evaluateQuotaRules(input, duration);
    if (!quotaResult.allowed) {
      return quotaResult;
    }

    // Check buffer time rules (simplified for v1)
    const bufferResult = this.evaluateBufferRules(input);
    if (!bufferResult.allowed) {
      return bufferResult;
    }

    // Calculate pricing
    const pricingResult = this.evaluatePricing(input, duration);
    
    return {
      allowed: true,
      ...pricingResult,
      duration
    };
  }

  private calculateDuration(startTime: string, endTime: string): number {
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    return (end - start) / 60; // Return hours
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private evaluateBookingConditions(input: SimulationInput, duration: number): SimulationResult {
    if (!this.rules.booking_conditions) {
      return { allowed: true };
    }

    for (const condition of this.rules.booking_conditions) {
      // Check if this condition applies to the selected space
      if (!condition.space?.includes(input.space)) {
        continue;
      }

      // Check day of week
      const dayName = input.date.toLocaleDateString('en-US', { weekday: 'long' });
      if (condition.days && !condition.days.includes(dayName)) {
        continue;
      }

      // Debug: Log the condition being evaluated
      console.log("🔍 Evaluating condition for space:", input.space);
      console.log("Condition rules:", condition.rules);
      console.log("Duration:", duration);

      // Collect all violations for this condition
      const violations = this.collectAllViolations(condition, input, duration);
      if (violations.length > 0) {
        return {
          allowed: false,
          errorReason: violations.join(' '),
          violatedRule: condition.explanation
        };
      }
    }

    return { allowed: true };
  }

  private collectAllViolations(condition: any, input: SimulationInput, duration: number): string[] {
    const violations: string[] = [];

    // Process rules (multi-row conditions)
    if (condition.rules) {
      // Debug: Log all rules for this condition
      console.log("📋 Processing", condition.rules.length, "rules");
      
      // Apply defensive logic for duration rules
      const correctedRules = this.applyDefensiveDurationLogic(condition.rules);
      console.log("🔧 Applied defensive logic, corrected rules:", correctedRules);

      for (const rule of correctedRules) {
        const violation = this.checkConditionRule(rule, input, duration);
        if (violation) {
          violations.push(violation);
        }
      }
    } else if (condition.condition_type) {
      // Legacy single condition
      const violation = this.checkConditionRule(condition, input, duration);
      if (violation) {
        violations.push(violation);
      }
    }

    return violations;
  }

  private applyDefensiveDurationLogic(rules: any[]): any[] {
    const durationRules = rules.filter(rule => rule.condition_type === "duration");
    
    if (durationRules.length < 2) {
      return rules; // No need for correction if less than 2 duration rules
    }

    console.log("🛡️ Applying defensive logic for duration rules:", durationRules);

    // Sort duration rules by value to identify min/max
    const sortedDurationRules = [...durationRules].sort((a, b) => {
      const valueA = parseFloat(a.value.replace(/[^\d.]/g, ''));
      const valueB = parseFloat(b.value.replace(/[^\d.]/g, ''));
      return valueA - valueB;
    });

    console.log("📊 Sorted duration rules:", sortedDurationRules);

    const correctedRules = rules.map(rule => {
      if (rule.condition_type !== "duration") {
        return rule; // Keep non-duration rules as-is
      }

      const ruleValue = parseFloat(rule.value.replace(/[^\d.]/g, ''));
      const isSmallestValue = rule === sortedDurationRules[0];
      const isLargestValue = rule === sortedDurationRules[sortedDurationRules.length - 1];

      // Defensive correction logic
      let correctedRule = { ...rule };

      if (isSmallestValue) {
        // Smallest value should be a minimum constraint
        if (rule.operator === "is_less_than" || rule.operator === "is_less_than_or_equal_to") {
          console.log("🔄 Correcting minimum rule: changing", rule.operator, "to is_greater_than_or_equal_to");
          correctedRule.operator = "is_greater_than_or_equal_to";
        }
      }

      if (isLargestValue) {
        // Largest value should be a maximum constraint  
        if (rule.operator === "is_greater_than" || rule.operator === "is_greater_than_or_equal_to") {
          console.log("🔄 Correcting maximum rule: changing", rule.operator, "to is_less_than_or_equal_to");
          correctedRule.operator = "is_less_than_or_equal_to";
        }
      }

      return correctedRule;
    });

    return correctedRules;
  }

  private checkConditionRule(rule: any, input: SimulationInput, duration: number): string | null {
    // Check interval alignment rules first
    if (rule.condition_type === "interval_start" || rule.condition_type === "interval_end") {
      return this.checkIntervalAlignment(rule, input);
    }

    // Check duration rules
    if (rule.condition_type === "duration") {
      return this.checkDurationRule(rule, duration);
    }

    // Check user tag rules
    if (rule.condition_type === "user_tags") {
      return this.checkUserTagRule(rule, input);
    }

    return null;
  }

  private checkIntervalAlignment(rule: any, input: SimulationInput): string | null {
    if (rule.operator === "multiple_of") {
      const intervalValue = rule.value;
      let intervalMinutes = 0;

      // Parse interval value (e.g., "1h" -> 60 minutes)
      if (intervalValue.includes('h')) {
        intervalMinutes = parseFloat(intervalValue.replace('h', '')) * 60;
      } else if (intervalValue.includes('m')) {
        intervalMinutes = parseFloat(intervalValue.replace('m', ''));
      }

      if (intervalMinutes > 0) {
        const startMinutes = this.timeToMinutes(input.startTime);
        const endMinutes = this.timeToMinutes(input.endTime);

        // Check if start and end times align with the interval
        const startAligned = startMinutes % intervalMinutes === 0;
        const endAligned = endMinutes % intervalMinutes === 0;

        if (!startAligned || !endAligned) {
          if (intervalMinutes === 60) {
            return "Bookings must start and end on the hour (e.g., 9:00, 10:00).";
          } else {
            const intervalDisplay = intervalMinutes >= 60 
              ? `${intervalMinutes / 60}-hour` 
              : `${intervalMinutes}-minute`;
            return `Bookings must start and end on ${intervalDisplay} intervals.`;
          }
        }
      }
    }

    return null;
  }

  private checkDurationRule(rule: any, duration: number): string | null {
    const value = parseFloat(rule.value.replace(/[^\d.]/g, ''));
    const isHours = rule.value.includes('h');
    const ruleHours = isHours ? value : value / 60;

    console.log("⏱️ Checking duration rule:", {
      operator: rule.operator,
      ruleValue: rule.value,
      ruleHours,
      actualDuration: duration
    });

    switch (rule.operator) {
      case "is_greater_than":
        if (duration <= ruleHours) {
          return `Booking must be longer than ${rule.value}.`;
        }
        break;
      case "is_greater_than_or_equal_to":
        if (duration < ruleHours) {
          return `Booking must be at least ${rule.value}.`;
        }
        break;
      case "is_less_than":
        if (duration >= ruleHours) {
          return `Booking must be shorter than ${rule.value}.`;
        }
        break;
      case "is_less_than_or_equal_to":
        if (duration > ruleHours) {
          return `Booking cannot exceed ${rule.value}.`;
        }
        break;
      case "multiple_of":
        const remainder = duration % ruleHours;
        if (Math.abs(remainder) > 0.01) { // Allow for floating point precision
          return `Booking duration must be in ${rule.value} increments.`;
        }
        break;
    }

    console.log("✅ Duration rule passed");
    return null;
  }

  private checkUserTagRule(rule: any, input: SimulationInput): string | null {
    const requiredTags = Array.isArray(rule.value) ? rule.value : [rule.value];
    
    if (rule.operator === "contains_any_of") {
      const hasAnyTag = requiredTags.some(tag => input.userTags.includes(tag));
      if (!hasAnyTag) {
        return `Only users with tags: ${requiredTags.join(', ')} can book this space.`;
      }
    } else if (rule.operator === "contains_none_of") {
      const hasRestrictedTag = requiredTags.some(tag => input.userTags.includes(tag));
      if (hasRestrictedTag) {
        return `Users with tags: ${requiredTags.join(', ')} cannot book this space.`;
      }
    }

    return null;
  }

  private evaluateBookingWindow(input: SimulationInput): SimulationResult {
    if (!this.rules.booking_window_rules || this.rules.booking_window_rules.length === 0) {
      console.log("📅 No booking window rules found - allowing booking");
      return { 
        allowed: true,
        errorReason: "Booking is allowed - no booking window restrictions apply."
      };
    }

    const now = new Date();
    const bookingDate = input.date;
    const hoursInAdvance = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const daysInAdvance = hoursInAdvance / 24;

    console.log("📅 BOOKING WINDOW EVALUATION START");
    console.log("📊 Booking Details:", {
      userTags: input.userTags,
      space: input.space,
      bookingDate: bookingDate.toISOString(),
      currentTime: now.toISOString(),
      hoursInAdvance: Math.round(hoursInAdvance * 100) / 100,
      daysInAdvance: Math.round(daysInAdvance * 100) / 100
    });

    // Sort rules by priority: tag-specific rules first, then general rules
    const sortedRules = this.sortBookingWindowRulesByPriority(this.rules.booking_window_rules);
    console.log("📋 Available booking window rules (sorted by priority):", sortedRules);

    // Find all applicable rules and their violations
    const ruleEvaluations: Array<{
      rule: BookingWindowRule;
      applicable: boolean;
      violates: boolean;
      errorMessage?: string;
      successMessage?: string;
    }> = [];

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
        ruleApplies = true;
        console.log("✅ Rule applies to all users");
      } else if (rule.user_scope === "users_with_tags" && rule.tags) {
        const hasRequiredTag = rule.tags.some(tag => input.userTags.includes(tag));
        ruleApplies = hasRequiredTag;
        console.log(`${ruleApplies ? '✅' : '❌'} Rule for users with tags [${rule.tags.join(', ')}] - user has: [${input.userTags.join(', ')}]`);
      } else if (rule.user_scope === "users_with_no_tags") {
        ruleApplies = isAnonymousUser;
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

      const errorMessage = this.generateBookingWindowErrorMessage(rule, input.userTags, daysInAdvance);
      const successMessage = this.generateBookingWindowSuccessMessage(rule, input.userTags, daysInAdvance);

      console.log(`${violatesConstraint ? '❌' : '✅'} Constraint result: ${violatesConstraint ? 'VIOLATES' : 'PASSES'}`);

      ruleEvaluations.push({
        rule,
        applicable: true,
        violates: violatesConstraint,
        errorMessage,
        successMessage
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
        errorReason: violatedRule.errorMessage!,
        violatedRule: violatedRule.rule.explanation
      };
    }

    // If no violations, find the most restrictive applicable rule for success message
    if (applicableRules.length > 0) {
      const successRule = applicableRules[0]; // First by priority
      console.log("✅ FINAL RESULT: Booking ALLOWED under rule:", successRule.rule.explanation);
      
      return {
        allowed: true,
        errorReason: successRule.successMessage!
      };
    }

    // If no applicable rules, allow the booking
    console.log("✅ FINAL RESULT: Booking ALLOWED - no applicable rules");
    return { 
      allowed: true,
      errorReason: "Booking is allowed - within standard booking window."
    };
  }

  private checkBookingWindowConstraintFixed(constraint: string, actualHours: number, ruleHours: number): boolean {
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

  private sortBookingWindowRulesByPriority(rules: BookingWindowRule[]): BookingWindowRule[] {
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

  private generateBookingWindowErrorMessage(rule: BookingWindowRule, userTags: string[], daysInAdvance: number): string {
    const timeUnit = rule.unit === "hours" ? "hours" : rule.unit;
    const userContext = this.getUserContextForMessage(rule, userTags);
    
    if (rule.constraint === "less_than") {
      return `Booking not allowed — ${userContext} can only book up to ${rule.value} ${timeUnit} in advance. You're trying to book ${Math.round(daysInAdvance)} days ahead.`;
    } else if (rule.constraint === "more_than") {
      return `Booking not allowed — ${userContext} must book more than ${rule.value} ${timeUnit} in advance. You're trying to book ${Math.round(daysInAdvance)} days ahead.`;
    }
    
    return `Booking not allowed — violates booking window rule: ${rule.explanation}`;
  }

  private generateBookingWindowSuccessMessage(rule: BookingWindowRule, userTags: string[], daysInAdvance: number): string {
    const timeUnit = rule.unit === "hours" ? "hours" : rule.unit;
    const userContext = this.getUserContextForMessage(rule, userTags);
    
    if (rule.constraint === "less_than") {
      return `Booking is allowed — this falls within the ${rule.value}-${timeUnit} window for ${userContext}.`;
    } else if (rule.constraint === "more_than") {
      return `Booking is allowed — ${userContext} booking meets the ${rule.value} ${timeUnit} advance requirement.`;
    }
    
    return `Booking is allowed — meets booking window requirements.`;
  }

  private getUserContextForMessage(rule: BookingWindowRule, userTags: string[]): string {
    if (rule.user_scope === "users_with_tags" && rule.tags) {
      const matchingTags = rule.tags.filter(tag => userTags.includes(tag));
      if (matchingTags.length > 0) {
        return `${matchingTags.join(', ')} members`;
      }
      return `users with tags: ${rule.tags.join(', ')}`;
    } else if (rule.user_scope === "users_with_no_tags") {
      return "non-tagged users";
    }
    return "all users";
  }

  private evaluateQuotaRules(input: SimulationInput, duration: number): SimulationResult {
    if (!this.rules.quota_rules) {
      return { allowed: true };
    }

    for (const rule of this.rules.quota_rules) {
      // Check if rule applies to user tags
      if (rule.target === "individuals_with_tags" && rule.tags) {
        const hasRequiredTag = rule.tags.some(tag => input.userTags.includes(tag));
        if (!hasRequiredTag) continue;
      }

      // Check if rule applies to this space
      if (!rule.affected_spaces.includes(input.space)) {
        continue;
      }

      // For v1, we'll do basic validation without real usage data
      if (rule.quota_type === "time") {
        const quotaValue = typeof rule.value === 'string' ? parseFloat(rule.value) : rule.value;
        if (duration > quotaValue) {
          return {
            allowed: false,
            errorReason: `Booking duration (${duration}h) exceeds quota limit of ${quotaValue}h per ${rule.period}`,
            violatedRule: rule.explanation
          };
        }
      }
    }

    return { allowed: true };
  }

  private evaluateBufferRules(input: SimulationInput): SimulationResult {
    // For v1, we'll skip complex buffer validation since it requires checking other bookings
    // In a real system, this would check for conflicts with existing bookings + buffer time
    return { allowed: true };
  }

  private evaluatePricing(input: SimulationInput, duration: number): Partial<SimulationResult> {
    if (!this.rules.pricing_rules || this.rules.pricing_rules.length === 0) {
      return {
        totalPrice: 0,
        hourlyRate: 0,
        rateLabel: "No pricing rules found"
      };
    }

    // Find the best matching pricing rule
    let bestRule: PricingRule | null = null;
    let bestMatch = -1;

    for (const rule of this.rules.pricing_rules) {
      let matchScore = 0;

      // Check space match
      if (!rule.space?.includes(input.space)) {
        continue;
      }
      matchScore += 10;

      // Check day match
      const dayName = input.date.toLocaleDateString('en-US', { weekday: 'long' });
      if (rule.days.includes(dayName)) {
        matchScore += 5;
      }

      // Check user tags match
      if (rule.condition_type === "user_tags" && Array.isArray(rule.value)) {
        if (rule.operator === "contains_any_of") {
          const hasTag = rule.value.some(tag => input.userTags.includes(tag));
          if (hasTag) matchScore += 20; // Higher priority for tag-specific rules
        } else if (rule.operator === "contains_none_of") {
          const hasRestrictedTag = rule.value.some(tag => input.userTags.includes(tag));
          if (!hasRestrictedTag) matchScore += 15;
        }
      }

      if (matchScore > bestMatch) {
        bestMatch = matchScore;
        bestRule = rule;
      }
    }

    if (!bestRule) {
      return {
        totalPrice: 0,
        hourlyRate: 0,
        rateLabel: "No applicable pricing rule found"
      };
    }

    // Calculate price based on rate unit
    let totalPrice = 0;
    let hourlyRate = 0;
    let rateLabel = "";

    if (bestRule.rate.unit === "fixed") {
      totalPrice = bestRule.rate.amount;
      hourlyRate = duration > 0 ? bestRule.rate.amount / duration : 0;
      rateLabel = `$${bestRule.rate.amount} fixed rate`;
    } else if (bestRule.rate.unit === "per_hour") {
      hourlyRate = bestRule.rate.amount;
      totalPrice = hourlyRate * duration;
      rateLabel = `$${hourlyRate}/hour`;
    } else if (bestRule.rate.unit === "per_day") {
      const dayRate = bestRule.rate.amount;
      totalPrice = dayRate; // Assume any booking in a day gets day rate
      hourlyRate = duration > 0 ? dayRate / duration : 0;
      rateLabel = `$${dayRate}/day`;
    }

    // Add tag context to label if applicable
    if (bestRule.condition_type === "user_tags" && input.userTags.length > 0) {
      rateLabel += ` (${input.userTags.join(', ')})`;
    }

    return {
      totalPrice: Math.round(totalPrice * 100) / 100, // Round to 2 decimal places
      hourlyRate: Math.round(hourlyRate * 100) / 100,
      rateLabel
    };
  }
}
