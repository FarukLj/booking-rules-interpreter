
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatTimeDisplay, getLogicText } from "@/utils/conditionFormatting";
import { BookingCondition, BookingConditionRule } from "@/types/RuleResult";

interface ConditionTypeSelectorProps {
  condition: BookingCondition | BookingConditionRule;
  onConditionChange: (field: keyof (BookingCondition | BookingConditionRule), value: any) => void;
}

export function ConditionTypeSelector({ condition, onConditionChange }: ConditionTypeSelectorProps) {
  // Handle time_range for legacy BookingCondition or default values for BookingConditionRule
  const timeRange = 'time_range' in condition ? condition.time_range : "09:00–17:00";
  
  return (
    <Select 
      value={getLogicText(condition)} 
      onValueChange={(value) => {
        if (value === "its duration") {
          onConditionChange('condition_type', 'duration');
        } else if (value.includes("start time to its start")) {
          onConditionChange('condition_type', 'interval_start');
        } else if (value.includes("its end to end time")) {
          onConditionChange('condition_type', 'interval_end');
        } else if (value === "the holder's set of tags") {
          onConditionChange('condition_type', 'user_tags');
        }
      }}
    >
      <SelectTrigger className="w-full h-10">
        <SelectValue>
          {getLogicText(condition)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-50">
        <SelectItem value="its duration">its duration</SelectItem>
        <SelectItem value="the interval from start time to its start">
          the interval from {formatTimeDisplay(timeRange?.split('–')[0] || '09:00')} to its start
        </SelectItem>
        <SelectItem value="the interval from its end to end time">
          the interval from its end to {formatTimeDisplay(timeRange?.split('–')[1] || '17:00')}
        </SelectItem>
        <SelectItem value="the holder's set of tags">the holder's set of tags</SelectItem>
      </SelectContent>
    </Select>
  );
}
