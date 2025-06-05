
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatTimeDisplay, getLogicText } from "@/utils/conditionFormatting";
import { BookingCondition } from "@/types/RuleResult";

interface ConditionTypeSelectorProps {
  condition: BookingCondition;
  onConditionChange: (field: keyof BookingCondition, value: any) => void;
}

export function ConditionTypeSelector({ condition, onConditionChange }: ConditionTypeSelectorProps) {
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
      <SelectTrigger className="min-w-[180px] h-10">
        <SelectValue>
          {getLogicText(condition)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-50">
        <SelectItem value="its duration">its duration</SelectItem>
        <SelectItem value="the interval from start time to its start">
          the interval from {formatTimeDisplay(condition.time_range?.split('–')[0] || '09:00')} to its start
        </SelectItem>
        <SelectItem value="the interval from its end to end time">
          the interval from its end to {formatTimeDisplay(condition.time_range?.split('–')[1] || '17:00')}
        </SelectItem>
        <SelectItem value="the holder's set of tags">the holder's set of tags</SelectItem>
      </SelectContent>
    </Select>
  );
}
