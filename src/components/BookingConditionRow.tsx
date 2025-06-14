
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
  hideConditionLogic?: boolean;
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
  hideConditionLogic = false,
  onConditionChange
}: BookingConditionRowProps) {
  const updateCondition = (field: keyof BookingCondition, value: any) => {
    // Defensive validation for booking conditions
    if (field === 'operator' && condition.condition_type === 'user_tags') {
      if (value === 'contains_any_of') {
        console.warn('[BookingCondition] Warning: contains_any_of may create double-negative logic for "only...can book" rules. Consider contains_none_of.');
      }
    }
    
    onConditionChange(index, field, value);
  };

  // Use actual condition data or provide sensible defaults
  const selectedSpaces = condition.space || [];
  const selectedDays = condition.days || [];
  const startTime = condition.time_range?.split('–')[0] || '09:00';
  const endTime = condition.time_range?.split('–')[1] || '17:00';

  console.log('[BookingConditionRow] Rendering condition:', {
    spaces: selectedSpaces,
    days: selectedDays,
    timeRange: condition.time_range,
    conditionType: condition.condition_type
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm mb-3">
        <span className="text-slate-600">For</span>
        <MultiSelect
          triggerVariant="link"
          options={spaceOptions}
          selected={selectedSpaces}
          onSelectionChange={(selected) => updateCondition('space', selected)}
          placeholder="Select spaces"
        />
        
        <span className="text-slate-600">between</span>
        <LinkSelect 
          value={startTime}
          onValueChange={(value) => {
            updateCondition('time_range', `${value}–${endTime}`);
          }}
        >
          {timeOptions.map(time => (
            <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
          ))}
        </LinkSelect>
        
        <span className="text-slate-600">and</span>
        <LinkSelect 
          value={endTime}
          onValueChange={(value) => {
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
          selected={selectedDays}
          onSelectionChange={(selected) => updateCondition('days', selected)}
          placeholder="Select days"
          abbreviateDays={true}
        />
        
        <span className="text-slate-600">, a booking is not allowed if:</span>
      </div>

      {!hideConditionLogic && (
        <>
          <div className="flex flex-col md:flex-row items-center gap-0 text-sm mb-3">
            <div className="w-full md:flex-1">
              <ConditionTypeSelector
                condition={condition}
                onConditionChange={updateCondition}
              />
            </div>
            
            <div className="w-full md:flex-1">
              <OperatorSelector
                condition={condition}
                onOperatorChange={(operator) => updateCondition('operator', operator)}
              />
            </div>
            
            <div className="w-full md:flex-1">
              {condition.condition_type === "user_tags" ? (
                <MultiSelect
                  options={tagOptions}
                  selected={Array.isArray(condition.value) ? condition.value : []}
                  onSelectionChange={(selected) => updateCondition('value', selected)}
                  placeholder="Select tags"
                  className="w-full"
                />
              ) : (
                <Select 
                  value={Array.isArray(condition.value) ? condition.value[0] : condition.value || '30min'} 
                  onValueChange={(value) => updateCondition('value', value)}
                >
                  <SelectTrigger className="w-full h-10">
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
          </div>
          
          {condition.explanation && (
            <div className="text-xs text-slate-600 bg-white p-2 rounded border">
              <strong>Explanation:</strong> {condition.explanation}
            </div>
          )}

          {/* Enhanced logic validation display */}
          {condition.condition_type === "user_tags" && (
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border mt-2">
              <strong>Logic:</strong> {
                condition.operator === "contains_none_of" 
                  ? `Allows only users whose tag set contains any of: ${Array.isArray(condition.value) ? condition.value.join(', ') : condition.value} (blocks everyone else)`
                  : condition.operator === "contains_any_of"
                  ? `Blocks users whose tag set contains any of: ${Array.isArray(condition.value) ? condition.value.join(', ') : condition.value} (those users CANNOT book)`
                  : `Uses operator "${condition.operator}" with tags: ${Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}`
              }
            </div>
          )}

          {/* Validation warning for potential logic inversions */}
          {condition.condition_type === "user_tags" && condition.operator === "contains_any_of" && (
            <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border mt-2">
              <strong>Logic Warning:</strong> If this is for "only [users] can book" rules, consider using "contains none of" instead to create proper allowlist logic.
            </div>
          )}
        </>
      )}
    </div>
  );
}
