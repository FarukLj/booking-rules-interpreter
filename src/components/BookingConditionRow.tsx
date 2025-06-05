
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { LinkSelect } from "@/components/ui/LinkSelect";
import { ConditionTypeSelector } from "./ConditionTypeSelector";
import { OperatorSelector } from "./OperatorSelector";
import { formatTimeDisplay } from "@/utils/conditionFormatting";
import { BookingCondition } from "@/types/RuleResult";

interface BookingConditionRowProps {
  condition: BookingCondition;
  index: number;
  spaceOptions: string[];
  timeOptions: string[];
  dayOptions: string[];
  tagOptions: string[];
  durationValues: string[];
  onConditionChange: (index: number, field: keyof BookingCondition, value: any) => void;
}

export function BookingConditionRow({
  condition,
  index,
  spaceOptions,
  timeOptions,
  dayOptions,
  tagOptions,
  durationValues,
  onConditionChange
}: BookingConditionRowProps) {
  const updateCondition = (field: keyof BookingCondition, value: any) => {
    onConditionChange(index, field, value);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm mb-3">
        <span className="text-slate-600">For</span>
        <MultiSelect
          triggerVariant="link"
          options={spaceOptions}
          selected={condition.space || []}
          onSelectionChange={(selected) => updateCondition('space', selected)}
          placeholder="Select spaces"
        />
        
        <span className="text-slate-600">between</span>
        <LinkSelect 
          value={condition.time_range?.split('–')[0] || '09:00'}
          onValueChange={(value) => {
            const endTime = condition.time_range?.split('–')[1] || '17:00';
            updateCondition('time_range', `${value}–${endTime}`);
          }}
        >
          {timeOptions.map(time => (
            <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
          ))}
        </LinkSelect>
        
        <span className="text-slate-600">and</span>
        <LinkSelect 
          value={condition.time_range?.split('–')[1] || '17:00'}
          onValueChange={(value) => {
            const startTime = condition.time_range?.split('–')[0] || '09:00';
            updateCondition('time_range', `${startTime}–${value}`);
          }}
        >
          {timeOptions.map(time => (
            <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
          ))}
        </LinkSelect>
        
        <span className="text-slate-600">on</span>
        <MultiSelect
          triggerVariant="link"
          options={dayOptions}
          selected={condition.days || []}
          onSelectionChange={(selected) => updateCondition('days', selected)}
          placeholder="Select days"
          abbreviateDays={true}
        />
        
        <span className="text-slate-600">, a booking is not allowed if:</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm mb-3">
        <ConditionTypeSelector
          condition={condition}
          onConditionChange={updateCondition}
        />
        
        <OperatorSelector
          condition={condition}
          onOperatorChange={(operator) => updateCondition('operator', operator)}
        />
        
        {condition.condition_type === "user_tags" ? (
          <MultiSelect
            options={tagOptions}
            selected={Array.isArray(condition.value) ? condition.value : []}
            onSelectionChange={(selected) => updateCondition('value', selected)}
            placeholder="Select tags"
            className="min-w-0 max-w-[200px]"
          />
        ) : (
          <Select 
            value={Array.isArray(condition.value) ? condition.value[0] : condition.value || '30min'} 
            onValueChange={(value) => updateCondition('value', value)}
          >
            <SelectTrigger className="w-20 h-10">
              <SelectValue>
                {Array.isArray(condition.value) ? condition.value[0] : condition.value || '30min'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="z-50">
              {durationValues.map(value => (
                <SelectItem key={value} value={value}>{value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      
      {condition.explanation && (
        <div className="text-xs text-slate-600 bg-white p-2 rounded border">
          <strong>Explanation:</strong> {condition.explanation}
        </div>
      )}

      {/* Logic validation display */}
      {condition.condition_type === "user_tags" && (
        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border mt-2">
          <strong>Logic:</strong> {
            condition.operator === "contains_none_of" 
              ? `Blocks users whose tag set contains none of: ${Array.isArray(condition.value) ? condition.value.join(', ') : condition.value} (i.e., only those users CAN book)`
              : `Blocks users whose tag set contains any of: ${Array.isArray(condition.value) ? condition.value.join(', ') : condition.value} (i.e., those users CANNOT book)`
          }
        </div>
      )}
    </div>
  );
}
