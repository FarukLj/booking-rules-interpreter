
import { BookingCondition, BookingConditionRule } from "@/types/RuleResult";

export function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function getLogicText(condition: BookingCondition | BookingConditionRule): string {
  switch (condition.condition_type) {
    case "duration":
      return "its duration";
    case "interval_start":
      return "the interval from start time to its start";
    case "interval_end":
      return "the interval from its end to end time";
    case "user_tags":
      return "the holder's set of tags";
    default:
      return "its duration";
  }
}

export function getAvailableOperators(conditionType: string): string[] {
  switch (conditionType) {
    case "user_tags":
      return ["contains any of", "contains none of"];
    case "duration":
    case "interval_start":
    case "interval_end":
      return ["is less than", "is greater than"];
    default:
      return ["is less than", "is greater than"];
  }
}

export function getOperatorDisplayText(operator: string): string {
  switch (operator) {
    case "contains_any_of":
      return "contains any of";
    case "contains_none_of":
      return "contains none of";
    case "is_less_than":
      return "is less than";
    case "is_greater_than":
      return "is greater than";
    default:
      return operator;
  }
}

export function getOperatorValue(displayText: string): string {
  switch (displayText) {
    case "contains any of":
      return "contains_any_of";
    case "contains none of":
      return "contains_none_of";
    case "is less than":
      return "is_less_than";
    case "is greater than":
      return "is_greater_than";
    default:
      return displayText;
  }
}
