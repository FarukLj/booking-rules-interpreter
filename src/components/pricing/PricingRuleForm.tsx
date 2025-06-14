
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { LinkSelect } from "@/components/ui/LinkSelect";
import { Plus, X } from "lucide-react";
import { PricingRule } from "@/types/RuleResult";
import { formatTimeDisplay, formatUnit, getPricingLogicText } from "@/utils/pricingFormatters";
import { getOperatorDisplayText, getOperatorValue } from "@/utils/conditionFormatting";

interface PricingRuleFormProps {
  rule: PricingRule;
  index: number;
  timeOptions: string[];
  dayOptions: string[];
  spaceOptions: string[];
  rateUnitOptions: string[];
  tagOptions: string[];
  durationOperators: string[];
  tagOperators: string[];
  durationValues: string[];
  onUpdateRule: (index: number, field: keyof PricingRule, value: any) => void;
  onUpdateRateField: (index: number, field: 'amount' | 'unit', value: any) => void;
  onAddSubCondition: (ruleIndex: number) => void;
  onRemoveSubCondition: (ruleIndex: number, subIndex: number) => void;
  onUpdateSubCondition: (ruleIndex: number, subIndex: number, field: string, value: any) => void;
}

export function PricingRuleForm({
  rule,
  index,
  timeOptions,
  dayOptions,
  spaceOptions,
  rateUnitOptions,
  tagOptions,
  durationOperators,
  tagOperators,
  durationValues,
  onUpdateRule,
  onUpdateRateField,
  onAddSubCondition,
  onRemoveSubCondition,
  onUpdateSubCondition
}: PricingRuleFormProps) {
  // Safely handle time_range splitting with fallbacks
  const timeRange = typeof rule.time_range === 'string' ? rule.time_range : '09:00–24:00';
  const [startTime, endTime] = timeRange.includes('–') 
    ? timeRange.split('–') 
    : ['09:00', '24:00'];

  console.log('PricingRuleForm - rule data:', {
    rate: rule.rate,
    operator: rule.operator,
    value: rule.value,
    condition_type: rule.condition_type
  });

  return (
    <div className="bg-[#F1F3F5] p-4 sm:p-3 rounded-lg dark:bg-slate-800">
      <div className="flex flex-wrap items-center gap-1 text-sm font-medium mb-3 leading-6">
        <span>Between</span>

        <LinkSelect 
          value={startTime}
          onValueChange={(v) => onUpdateRule(index, 'time_range', `${v}–${endTime}`)}
        >
          {timeOptions.map(t => 
            <SelectItem key={t} value={t}>{formatTimeDisplay(t)}</SelectItem>
          )}
        </LinkSelect>

        <span>and</span>

        <LinkSelect 
          value={endTime}
          onValueChange={(v) => onUpdateRule(index, 'time_range', `${startTime}–${v}`)}
        >
          {timeOptions.map(t => 
            <SelectItem key={t} value={t}>{formatTimeDisplay(t)}</SelectItem>
          )}
        </LinkSelect>

        <span>on</span>

        <MultiSelect
          triggerVariant="link"
          options={dayOptions}
          selected={rule.days || []}
          onSelectionChange={sel => onUpdateRule(index, 'days', sel)}
          abbreviateDays={true}
        />
        ,

        <MultiSelect
          triggerVariant="link"
          options={spaceOptions}
          selected={rule.space || []}
          onSelectionChange={sel => onUpdateRule(index, 'space', sel)}
        />

        <span>is priced</span>

        <span>$</span>
        <Input
          type="number"
          value={rule.rate?.amount ?? ''}
          onChange={e => onUpdateRateField(index, 'amount', e.target.value)}
          className="w-20 h-6 px-1 text-right"
        />

        <span>per</span>

        <LinkSelect
          value={rule.rate?.unit || 'per_hour'}
          onValueChange={v => onUpdateRateField(index, 'unit', v)}
        >
          {rateUnitOptions.map(unit => (
            <SelectItem key={unit} value={unit}>
              {formatUnit(unit)}
            </SelectItem>
          ))}
        </LinkSelect>

        {rule.condition_type === 'duration' && (
          <>
            <span>if the duration</span>
            <Select
              value={getOperatorDisplayText(rule.operator || 'is_greater_than_or_equal_to')}
              onValueChange={v => onUpdateRule(index, 'operator', getOperatorValue(v))}
            >
              <SelectTrigger className="w-auto h-6 px-2 text-sm border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durationOperators.map(op => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={rule.value as string || '15min'}
              onValueChange={v => onUpdateRule(index, 'value', v)}
            >
              <SelectTrigger className="w-auto h-6 px-2 text-sm border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durationValues.map(val => (
                  <SelectItem key={val} value={val}>
                    {val}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {rule.condition_type === 'user_tags' && (
          <>
            <span>for users with</span>
            <Select
              value={getOperatorDisplayText(rule.operator || 'contains_any_of')}
              onValueChange={v => onUpdateRule(index, 'operator', getOperatorValue(v))}
            >
              <SelectTrigger className="w-auto h-6 px-2 text-sm border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tagOperators.map(op => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <MultiSelect
              triggerVariant="link"
              options={tagOptions}
              selected={Array.isArray(rule.value) ? rule.value : []}
              onSelectionChange={sel => onUpdateRule(index, 'value', sel)}
            />
          </>
        )}
      </div>
    </div>
  );
}
