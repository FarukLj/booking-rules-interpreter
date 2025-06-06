
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { PricingRule } from "@/types/RuleResult";
import { dayOptions, spaceOptions, timeOptions, rateUnitOptions, formatTimeDisplay } from "@/types/pricingTypes";
import { LinkSelect } from "@/components/ui/LinkSelect";
import { PricingRuleCondition } from "./PricingRuleCondition";

interface PricingRuleItemProps {
  rule: PricingRule;
  onRuleUpdate: (field: keyof PricingRule, value: any) => void;
  onRateFieldUpdate: (field: 'amount' | 'unit', value: any) => void;
  onAddSubCondition: () => void;
  onUpdateSubCondition: (subIndex: number, field: string, value: any) => void;
  onRemoveSubCondition: (subIndex: number) => void;
}

export function PricingRuleItem({ 
  rule, 
  onRuleUpdate, 
  onRateFieldUpdate, 
  onAddSubCondition, 
  onUpdateSubCondition, 
  onRemoveSubCondition 
}: PricingRuleItemProps) {
  const timeSelectOptions = timeOptions.map(time => ({
    value: time,
    label: formatTimeDisplay(time)
  }));

  const rateUnitSelectOptions = rateUnitOptions.map(unit => ({
    value: unit,
    label: unit.replace('_', ' ')
  }));

  return (
    <div className="bg-[#F1F3F5] p-6 sm:p-3 rounded">
      <div className="flex flex-wrap items-center gap-1 text-base font-medium mb-3 leading-6">
        <span>Between</span>

        {/* FROM time */}
        <LinkSelect 
          value={rule.time_range?.split('–')[0] || '09:00'}
          onValueChange={(v) => onRuleUpdate('time_range', `${v}–${rule.time_range?.split('–')[1]}`)}
          options={timeSelectOptions}
        />

        <span>and</span>

        {/* TO time */}
        <LinkSelect 
          value={rule.time_range?.split('–')[1] || '17:00'}
          onValueChange={(v) => onRuleUpdate('time_range', `${rule.time_range?.split('–')[0]}–${v}`)}
          options={timeSelectOptions}
        />

        <span>on</span>

        {/* DAYS */}
        <MultiSelect
          triggerVariant="link"
          options={dayOptions}
          selected={rule.days || []}
          onSelectionChange={sel => onRuleUpdate('days', sel)}
          abbreviateDays={true}
        />
        ,

        {/* SPACES */}
        <MultiSelect
          triggerVariant="link"
          options={spaceOptions}
          selected={rule.space || []}
          onSelectionChange={sel => onRuleUpdate('space', sel)}
        />

        <span>is priced</span>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-2xl font-semibold">$</span>
        <Input
          type="number"
          value={rule.rate?.amount || 25}
          onChange={e => onRateFieldUpdate('amount', e.target.value)}
          className="w-20 h-9 border-0 border-b border-slate-300 rounded-none px-0 text-right"
        />
        <LinkSelect 
          value={rule.rate?.unit || 'per_hour'}
          onValueChange={v => onRateFieldUpdate('unit', v)}
          options={rateUnitSelectOptions}
        />
      </div>

      <PricingRuleCondition
        rule={rule}
        onRuleUpdate={onRuleUpdate}
        onAddSubCondition={onAddSubCondition}
        onUpdateSubCondition={onUpdateSubCondition}
        onRemoveSubCondition={onRemoveSubCondition}
      />
      
      {rule.explanation && (
        <div className="text-xs text-slate-600 bg-white p-2 rounded border">
          <strong>Explanation:</strong> {rule.explanation}
        </div>
      )}
    </div>
  );
}
