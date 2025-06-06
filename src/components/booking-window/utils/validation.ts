
import { normalizeAdvanceUnit } from './unitConversion';
import { BookingWindowRule } from '@/types/RuleResult';

export interface ValidationResult {
  type: 'warning' | 'info';
  message: string;
}

export const getLogicValidation = (rule: BookingWindowRule): ValidationResult | null => {
  const hours = normalizeAdvanceUnit(rule.value || 0, rule.unit || 'hours');
  
  if (rule.constraint === 'more_than' && hours < 24) {
    return {
      type: 'warning',
      message: 'Short-term "more than" constraints may be confusing. Consider "less than" for minimum advance notice.'
    };
  }
  
  if (rule.constraint === 'less_than' && hours > 168) {
    return {
      type: 'info',
      message: 'Long-term "less than" constraints typically use "more than" to limit advance booking.'
    };
  }
  
  return null;
};

export const getConstraintExplanation = (constraint: string) => {
  if (constraint === 'less_than') {
    return 'Blocks bookings made too close to the event time (enforces minimum advance notice)';
  } else {
    return 'Blocks bookings made too far in advance (limits how far ahead users can book)';
  }
};
