
import { Info } from "lucide-react";

export function PricingRuleHeader() {
  return (
    <div className="flex items-center gap-2">
      <h3 className="text-lg font-semibold text-slate-800">Pricing Rules</h3>
      <div className="flex items-center gap-1 text-xs text-slate-500 bg-green-50 px-2 py-1 rounded">
        <Info className="w-3 h-3" />
        <span>Define rates and conditions for charging</span>
      </div>
    </div>
  );
}
</tml-write>

<lov-write file_path="src/components/pricing/PricingRuleForm.tsx">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { LinkSelect } from "@/components/ui/LinkSelect";
import { Plus, X } from "lucide-react";
import { PricingRule } from "@/types/RuleResult";
import { formatTimeDisplay, formatRateUnit, getPricingLogicText } from "@/utils/pricingFormatters";

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
  return (
    <div className="bg-[#F1F3F5] p-4 sm:p-3 rounded-lg dark:bg-slate-800">
      {/* Row 1: Extended Natural Language Flow with Price */}
      <div className="flex flex-wrap items-center gap-1 text-sm font-medium mb-3 leading-6">
        <span>Between</span>

        <LinkSelect 
          value={rule.time_range?.split('–')[0] || '09:00'}
          onValueChange={(v) => onUpdateRule(index, 'time_range', `${v}–${rule.time_range?.split('–')[1] || '17:00'}`)}
        >
          {timeOptions.map(t => 
            <SelectItem key={t} value={t}>{formatTimeDisplay(t)}</SelectItem>
          )}
        </LinkSelect>

        <span>and</span>

        <LinkSelect 
          value={rule.time_range?.split('–')[1] || '17:00'}
          onValueChange={(v) => onUpdateRule(index, 'time_range', `${rule.time_range?.split('–')[0] || '09:00'}–${v}`)}
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

        {/* Price Input Inline */}
        <div className="flex items-center gap-1">
          <span className="text-lg font-semibold text-blue-700">$</span>
          <Input
            type="number"
            value={rule.rate?.amount || 25}
            onChange={e => onUpdateRateField(index, 'amount', e.target.value)}
            className="border-0 p-0 h-auto w-16 text-blue-700 font-semibold focus:ring-0 bg-transparent"
          />
          
          <LinkSelect 
            value={rule.rate?.unit || 'per_hour'}
            onValueChange={v => onUpdateRateField(index, 'unit', v)}
          >
            {rateUnitOptions.map(u => 
              <SelectItem key={u} value={u}>{formatRateUnit(u)}</SelectItem>
            )}
          </LinkSelect>
        </div>

        <span>for a booking if</span>
      </div>
      
      {/* Row 2: Simplified 3-Component Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        {/* Condition Type */}
        <Select value={rule.condition_type || 'duration'} onValueChange={(value) => {
          onUpdateRule(index, 'condition_type', value);
          if (value === 'duration') {
            onUpdateRule(index, 'value', '1h');
          } else {
            onUpdateRule(index, 'value', []);
          }
        }}>
          <SelectTrigger className="h-10">
            <SelectValue>
              {rule.condition_type === "duration" ? "duration" : "the holder's set of tags"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="duration">duration</SelectItem>
            <SelectItem value="user_tags">the holder's set of tags</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Operator */}
        <Select value={rule.operator || 'is_greater_than'} onValueChange={(value) => onUpdateRule(index, 'operator', value)}>
          <SelectTrigger className="h-10">
            <SelectValue>
              {rule.operator?.replace(/_/g, ' ') || 'is greater than'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(rule.condition_type === "duration" ? durationOperators : tagOperators).map(operator => (
              <SelectItem key={operator} value={operator.replace(/\s/g, '_')}>{operator}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Value */}
        {rule.condition_type === "duration" ? (
          <Select 
            value={Array.isArray(rule.value) ? rule.value[0] : rule.value || '1h'} 
            onValueChange={(value) => onUpdateRule(index, 'value', value)}
          >
            <SelectTrigger className="h-10">
              <SelectValue>
                {Array.isArray(rule.value) ? rule.value[0] : rule.value || '1h'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {durationValues.map(value => (
                <SelectItem key={value} value={value}>{value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="h-10">
            <MultiSelect
              options={tagOptions}
              selected={Array.isArray(rule.value) ? rule.value : []}
              onSelectionChange={(selected) => onUpdateRule(index, 'value', selected)}
              placeholder="Select tags"
            />
          </div>
        )}
      </div>

      {/* Add Condition Button */}
      <div className="mb-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAddSubCondition(index)}
          className="h-8 px-2"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add condition
        </Button>
      </div>

      {/* Sub-conditions */}
      {rule.sub_conditions && rule.sub_conditions.map((subCondition, subIndex) => (
        <div key={subIndex} className="flex flex-wrap items-center gap-2 text-sm mb-2 ml-4 pl-4 border-l-2 border-slate-300">
          <Select 
            value={subCondition.logic} 
            onValueChange={(value) => onUpdateSubCondition(index, subIndex, 'logic', value)}
          >
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
            </SelectContent>
          </Select>
          
          <Select 
            value={subCondition.condition_type} 
            onValueChange={(value) => onUpdateSubCondition(index, subIndex, 'condition_type', value)}
          >
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="duration">it's duration</SelectItem>
              <SelectItem value="user_tags">the holder's set of tags</SelectItem>
            </SelectContent>
          </Select>
          
          <Select 
            value={subCondition.operator} 
            onValueChange={(value) => onUpdateSubCondition(index, subIndex, 'operator', value)}
          >
            <SelectTrigger className="min-w-[150px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(subCondition.condition_type === "duration" ? durationOperators : tagOperators).map(operator => (
                <SelectItem key={operator} value={operator.replace(/\s/g, '_')}>{operator}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {subCondition.condition_type === "duration" ? (
            <Select 
              value={Array.isArray(subCondition.value) ? subCondition.value[0] : subCondition.value || '1h'} 
              onValueChange={(value) => onUpdateSubCondition(index, subIndex, 'value', value)}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durationValues.map(value => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <MultiSelect
              options={tagOptions}
              selected={Array.isArray(subCondition.value) ? subCondition.value : []}
              onSelectionChange={(selected) => onUpdateSubCondition(index, subIndex, 'value', selected)}
              placeholder="Select tags"
            />
          )}
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemoveSubCondition(index, subIndex)}
            className="h-8 w-8 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ))}
      
      {rule.condition_type === "user_tags" && (
        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border mb-2 dark:bg-blue-900/20 dark:text-blue-400">
          <strong>Logic:</strong> {getPricingLogicText(rule)}
        </div>
      )}
      
      {rule.explanation && (
        <div className="text-xs text-slate-600 bg-white p-2 rounded border dark:bg-slate-700 dark:text-slate-300">
          <strong>Explanation:</strong> {rule.explanation}
        </div>
      )}
    </div>
  );
}
