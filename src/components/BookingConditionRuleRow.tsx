
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { ConditionTypeSelector } from "./ConditionTypeSelector";
import { OperatorSelector } from "./OperatorSelector";
import { BookingConditionRule } from "@/types/RuleResult";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookingConditionRuleRowProps {
  rule: BookingConditionRule;
  index: number;
  tagOptions: string[];
  durationValues: string[];
  canDelete: boolean;
  onRuleChange: (index: number, field: keyof BookingConditionRule, value: any) => void;
  onDelete: (index: number) => void;
}

export function BookingConditionRuleRow({
  rule,
  index,
  tagOptions,
  durationValues,
  canDelete,
  onRuleChange,
  onDelete
}: BookingConditionRuleRowProps) {
  const updateRule = (field: keyof BookingConditionRule, value: any) => {
    onRuleChange(index, field, value);
  };

  return (
    <div className="flex flex-col md:flex-row items-start gap-2 p-3 bg-white rounded border">
      <div className="flex-1 min-w-0">
        <div className="flex flex-col md:flex-row items-center gap-2 text-sm">
          <div className="w-full md:flex-1">
            <ConditionTypeSelector
              condition={rule}
              onConditionChange={updateRule}
            />
          </div>
          
          <div className="w-full md:flex-1">
            <OperatorSelector
              condition={rule}
              onOperatorChange={(operator) => updateRule('operator', operator)}
            />
          </div>
          
          <div className="w-full md:flex-1">
            {rule.condition_type === "user_tags" ? (
              <MultiSelect
                options={tagOptions}
                selected={Array.isArray(rule.value) ? rule.value : []}
                onSelectionChange={(selected) => updateRule('value', selected)}
                placeholder="Select tags"
                className="w-full"
              />
            ) : (
              <Select 
                value={Array.isArray(rule.value) ? rule.value[0] : rule.value || '30min'} 
                onValueChange={(value) => updateRule('value', value)}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue>
                    {Array.isArray(rule.value) ? rule.value[0] : rule.value || '30min'}
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
      </div>
      
      {canDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(index)}
          className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
