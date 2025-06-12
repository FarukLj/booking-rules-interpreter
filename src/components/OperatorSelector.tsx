
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAvailableOperators, getOperatorDisplayText, getOperatorValue } from "@/utils/conditionFormatting";
import { BookingCondition, BookingConditionRule } from "@/types/RuleResult";

interface OperatorSelectorProps {
  condition: BookingCondition | BookingConditionRule;
  onOperatorChange: (operator: string) => void;
}

export function OperatorSelector({ condition, onOperatorChange }: OperatorSelectorProps) {
  return (
    <Select 
      value={getOperatorDisplayText(condition.operator || 'is_less_than')} 
      onValueChange={(value) => onOperatorChange(getOperatorValue(value))}
    >
      <SelectTrigger className="w-full h-10">
        <SelectValue>
          {getOperatorDisplayText(condition.operator || 'is_less_than')}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-50">
        {getAvailableOperators(condition.condition_type || 'duration').map(operator => (
          <SelectItem key={operator} value={operator}>{operator}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
