
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { SubCondition } from "@/types/RuleResult";
import { durationOperators, tagOperators, durationValues, tagOptions } from "@/types/pricingTypes";

interface PricingSubConditionProps {
  subCondition: SubCondition;
  onUpdate: (field: string, value: any) => void;
  onRemove: () => void;
}

export function PricingSubCondition({ subCondition, onUpdate, onRemove }: PricingSubConditionProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm mb-2 ml-4 pl-4 border-l-2 border-slate-300">
      <Select 
        value={subCondition.logic} 
        onValueChange={(value) => onUpdate('logic', value)}
      >
        <SelectTrigger className="w-16 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-50">
          <SelectItem value="AND">AND</SelectItem>
          <SelectItem value="OR">OR</SelectItem>
        </SelectContent>
      </Select>
      
      <Select 
        value={subCondition.condition_type} 
        onValueChange={(value) => onUpdate('condition_type', value)}
      >
        <SelectTrigger className="w-32 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-50">
          <SelectItem value="duration">it's duration</SelectItem>
          <SelectItem value="user_tags">the holder's set of tags</SelectItem>
        </SelectContent>
      </Select>
      
      <Select 
        value={subCondition.operator} 
        onValueChange={(value) => onUpdate('operator', value)}
      >
        <SelectTrigger className="min-w-[150px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-50">
          {(subCondition.condition_type === "duration" ? durationOperators : tagOperators).map(operator => (
            <SelectItem key={operator} value={operator.replace(/\s/g, '_')}>{operator}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {subCondition.condition_type === "duration" ? (
        <Select 
          value={Array.isArray(subCondition.value) ? subCondition.value[0] : subCondition.value || '1h'} 
          onValueChange={(value) => onUpdate('value', value)}
        >
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
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
          selected={Array.isArray(subCondition.value) ? subCondition.value : []}
          onSelectionChange={(selected) => onUpdate('value', selected)}
          placeholder="Select tags"
        />
      )}
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-8 w-8 p-0"
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}
