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
    console.log("Evaluating simulation input:", input);

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
      for (const rule of condition.rules) {
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
    if (!this.rules.booking_window_rules) {
      return { allowed: true };
    }

    const now = new Date();
    const bookingDate = input.date;
    const hoursInAdvance = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    for (const rule of this.rules.booking_window_rules) {
      // Check if rule applies to user tags
      if (rule.user_scope === "users_with_tags" && rule.tags) {
        const hasRequiredTag = rule.tags.some(tag => input.userTags.includes(tag));
        if (!hasRequiredTag) continue;
      } else if (rule.user_scope === "users_with_no_tags" && input.userTags.length > 0) {
        continue;
      }

      // Check if rule applies to this space
      if (!rule.spaces.includes(input.space)) {
        continue;
      }

      // Convert rule value to hours
      let ruleHours = rule.value;
      if (rule.unit === "days") ruleHours *= 24;
      else if (rule.unit === "weeks") ruleHours *= 24 * 7;

      // Check constraint
      if (rule.constraint === "less_than" && hoursInAdvance >= ruleHours) {
        return {
          allowed: false,
          errorReason: `Booking must be made less than ${rule.value} ${rule.unit} in advance`,
          violatedRule: rule.explanation
        };
      } else if (rule.constraint === "more_than" && hoursInAdvance <= ruleHours) {
        return {
          allowed: false,
          errorReason: `Booking must be made more than ${rule.value} ${rule.unit} in advance`,
          violatedRule: rule.explanation
        };
      }
    }

    return { allowed: true };
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
