
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

  // Safe time range parsing with defensive checks
  const getTimeRangeParts = (timeRange: string | undefined) => {
    if (!timeRange || typeof timeRange !== 'string') {
      console.warn('[BookingConditionRow] Invalid time_range:', timeRange);
      return { startTime: '09:00', endTime: '17:00' };
    }
    
    const parts = timeRange.split('–');
    if (parts.length === 2) {
      return { startTime: parts[0] || '09:00', endTime: parts[1] || '17:00' };
    }
    
    console.warn('[BookingConditionRow] Could not parse time_range:', timeRange);
    return { startTime: '09:00', endTime: '17:00' };
  };

  const { startTime, endTime } = getTimeRangeParts(condition.time_range);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm mb-3">
        <span className="text-slate-600">For</span>
        <MultiSelect
          triggerVariant="link"
          options={spaceOptions.filter(option => typeof option === 'string')}
          selected={(condition.space || []).filter(space => typeof space === 'string')}
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
          options={dayOptions.filter(option => typeof option === 'string')}
          selected={(condition.days || []).filter(day => typeof day === 'string')}
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
                  options={tagOptions.filter(option => typeof option === 'string')}
                  selected={Array.isArray(condition.value) ? condition.value.filter(v => typeof v === 'string') : []}
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
