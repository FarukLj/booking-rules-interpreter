import { BookingCondition, BookingConditionRule } from "@/types/RuleResult";

export function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function getLogicText(condition: any): string {
  const conditionType = condition.condition_type || 'duration';
  const timeRange = condition.time_range || "09:00–17:00";
  const startTime = timeRange.split('–')[0] || '09:00';
  const endTime = timeRange.split('–')[1] || '17:00';
  
  switch (conditionType) {
    case 'duration':
      return 'its duration';
    case 'interval_start':
      return `the interval from ${formatTimeDisplay(startTime)} to its start`;
    case 'interval_end':
      return `the interval from its end to ${formatTimeDisplay(endTime)}`;
    case 'user_tags':
      return "the holder's set of tags";
    default:
      return 'its duration';
  }
}

export function getAvailableOperators(conditionType: string): string[] {
  switch (conditionType) {
    case 'duration':
      return ['is less than', 'is greater than', 'is equal to', 'multiple of'];
    case 'interval_start':
    case 'interval_end':
      return ['multiple of', 'is less than', 'is greater than'];
    case 'user_tags':
      return ['contains any of', 'contains none of'];
    default:
      return ['is less than', 'is greater than', 'is equal to'];
  }
}

export function getOperatorDisplayText(operator: string): string {
  const operatorMap: { [key: string]: string } = {
    'is_less_than': 'is less than',
    'is_greater_than': 'is greater than', 
    'is_equal_to': 'is equal to',
    'multiple_of': 'multiple of',
    'contains_any_of': 'contains any of',
    'contains_none_of': 'contains none of'
  };
  
  return operatorMap[operator] || operator;
}

export function getOperatorValue(displayText: string): string {
  const reverseMap: { [key: string]: string } = {
    'is less than': 'is_less_than',
    'is greater than': 'is_greater_than',
    'is equal to': 'is_equal_to', 
    'multiple of': 'multiple_of',
    'contains any of': 'contains_any_of',
    'contains none of': 'contains_none_of'
  };
  
  return reverseMap[displayText] || displayText;
}
