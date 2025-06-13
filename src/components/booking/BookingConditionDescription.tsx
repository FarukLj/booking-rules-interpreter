
import { BookingCondition, BookingRule } from '@/types/BookingCondition';

interface BookingConditionDescriptionProps {
  condition: BookingCondition;
}

export function BookingConditionDescription({ condition }: BookingConditionDescriptionProps) {
  const formatValue = (rule: BookingRule): string => {
    if (typeof rule.value === 'number') {
      return `${rule.value}${rule.unit ? ` ${rule.unit}` : ''}`;
    }
    if (typeof rule.value === 'object' && rule.value.value !== undefined) {
      return `${rule.value.value} ${rule.value.unit}`;
    }
    return String(rule.value);
  };

  const formatOperator = (operator: string): string => {
    const operatorMap: Record<string, string> = {
      'less_than': 'less than',
      'less_than_or_equal': 'less than or equal to',
      'greater_than': 'greater than',
      'greater_than_or_equal': 'greater than or equal to',
      'equals': 'equals',
      'not_equals': 'not equals',
      'multiple_of': 'is a multiple of'
    };
    return operatorMap[operator] || operator;
  };

  const formatRuleType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'duration': 'booking duration',
      'time_interval': 'time interval',
      'start_time': 'start time',
      'end_time': 'end time'
    };
    return typeMap[type] || type;
  };

  const formatRuleDescription = (rule: BookingRule): string => {
    return `${formatRuleType(rule.type)} ${formatOperator(rule.operator)} ${formatValue(rule)}`;
  };

  const spaceText = condition.spaceIds.length === 1 
    ? condition.spaceIds[0] 
    : `${condition.spaceIds.length} spaces`;

  const daysText = condition.days.length === 7 
    ? 'all days' 
    : condition.days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ');

  const rulesText = condition.rules.length === 1
    ? formatRuleDescription(condition.rules[0])
    : condition.rules.map(formatRuleDescription).join(` ${condition.condition} `);

  return (
    <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
      <p>
        <span className="font-medium">Restriction for {spaceText}</span> on {daysText}:
      </p>
      <p className="mt-1">
        Bookings are <span className="font-medium text-red-600">not allowed</span> when {rulesText}
      </p>
      {!condition.isActive && (
        <p className="mt-1 text-amber-600 font-medium">
          ⚠️ This condition is currently inactive
        </p>
      )}
    </div>
  );
}
