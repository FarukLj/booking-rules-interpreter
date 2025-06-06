
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PricingRule } from "@/types/RuleResult";
import { durationOperators, tagOperators, durationValues, tagOptions } from "@/types/pricingTypes";
import { PricingSubCondition } from "./PricingSubCondition";

interface PricingRuleConditionProps {
  rule: PricingRule;
  onRuleUpdate: (field: keyof PricingRule, value: any) => void;
  onAddSubCondition: () => void;
  onUpdateSubCondition: (subIndex: number, field: string, value: any) => void;
  onRemoveSubCondition: (subIndex: number) => void;
}

export function PricingRuleCondition({ 
  rule, 
  onRuleUpdate, 
  onAddSubCondition, 
  onUpdateSubCondition, 
  onRemoveSubCondition 
}: PricingRuleConditionProps) {
  const getPricingLogicText = (rule: PricingRule) => {
    if (rule.condition_type === "user_tags") {
      const operator = rule.operator === "contains_any_of" ? "with" : "without";
      const tags = Array.isArray(rule.value) ? rule.value.join(", ") : "";
      return `Price applies to users ${operator} tags: ${tags}`;
    }
    return "";
  };

  return (
    <>
      <div className="grid grid-cols-[1fr_auto] gap-2 text-sm mb-3">
        <span className="text-slate-600">for a booking if</span>
        <Select value={rule.condition_type || 'duration'} onValueChange={(value) => {
          onRuleUpdate('condition_type', value);
          // Clear tag list when switching to duration
          if (value === 'duration') {
            onRuleUpdate('value', '1h');
          } else {
            onRuleUpdate('value', []);
          }
        }}>
          <SelectTrigger className="w-32 h-10">
            <SelectValue>
              {rule.condition_type === "duration" ? "it's duration" : "the holder's set of tags"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="z-50">
            <SelectItem value="duration">it's duration</SelectItem>
            <SelectItem value="user_tags">the holder's set of tags</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={rule.operator || 'is_greater_than'} onValueChange={(value) => onRuleUpdate('operator', value)}>
          <SelectTrigger className="min-w-[150px] h-10">
            <SelectValue>
              {rule.operator?.replace(/_/g, ' ') || 'is greater than'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="z-50">
            {(rule.condition_type === "duration" ? durationOperators : tagOperators).map(operator => (
              <SelectItem key={operator} value={operator.replace(/\s/g, '_')}>{operator}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {rule.condition_type === "duration" ? (
          <Select 
            value={Array.isArray(rule.value) ? rule.value[0] : rule.value || '1h'} 
            onValueChange={(value) => onRuleUpdate('value', value)}
          >
            <SelectTrigger className="w-20 h-10">
              <SelectValue>
                {Array.isArray(rule.value) ? rule.value[0] : rule.value || '1h'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="z-50">
              {durationValues.map(value => (
                <SelectItem key={value} value={value}>{value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <MultiSelect
            options={tagOptions}
            selected={Array.isArray(rule.value) ? rule.value : []}
            onSelectionChange={(selected) => onRuleUpdate('value', selected)}
            placeholder="Select tags"
          />
        )}
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddSubCondition}
          className="h-8 px-2"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add condition
        </Button>
      </div>

      {/* Sub-conditions */}
      {rule.sub_conditions && rule.sub_conditions.map((subCondition, subIndex) => (
        <PricingSubCondition
          key={subIndex}
          subCondition={subCondition}
          onUpdate={(field, value) => onUpdateSubCondition(subIndex, field, value)}
          onRemove={() => onRemoveSubCondition(subIndex)}
        />
      ))}
      
      {rule.condition_type === "user_tags" && (
        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border mb-2">
          <strong>Logic:</strong> {getPricingLogicText(rule)}
        </div>
      )}
    </>
  );
}
