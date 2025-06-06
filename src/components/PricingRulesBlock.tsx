
import { useState, useEffect } from "react";
import { PricingRule } from "@/types/RuleResult";
import { Info, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingRuleItem } from "./pricing/PricingRuleItem";

interface PricingRulesBlockProps {
  initialRules?: PricingRule[];
}

export function PricingRulesBlock({ initialRules = [] }: PricingRulesBlockProps) {
  // Sort rules: fixed rates first, then per-period rates
  const sortedInitialRules = initialRules.sort((a, b) => {
    if (a.rate?.unit === "fixed" && b.rate?.unit !== "fixed") return -1;
    if (a.rate?.unit !== "fixed" && b.rate?.unit === "fixed") return 1;
    return 0;
  });
  
  const [rules, setRules] = useState<PricingRule[]>(
    sortedInitialRules.length > 0 ? sortedInitialRules : [{
      space: ["Space 1"],
      time_range: "09:00–17:00",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      rate: { amount: 25, unit: "per_hour" },
      condition_type: "duration",
      operator: "is_greater_than",
      value: "1h",
      explanation: "Default pricing rule"
    }]
  );
  
  const [logicOperators, setLogicOperators] = useState<string[]>(
    new Array(Math.max(0, rules.length - 1)).fill("AND")
  );

  // Validation for positive pricing logic
  useEffect(() => {
    rules.forEach((rule, index) => {
      if (rule.condition_type === "user_tags" && 
          rule.operator === "contains_none_of" && 
          Array.isArray(rule.value) && 
          rule.value.length === 1) {
        console.warn(`PricingRule ${index}: Logic appears double-negative. "contains none of" with single tag may be incorrect for pricing.`);
      }
    });
  }, [rules]);

  const updateRule = (index: number, field: keyof PricingRule, value: any) => {
    setRules(rules.map((rule, i) => i === index ? { ...rule, [field]: value } : rule));
  };

  const updateRateField = (index: number, field: 'amount' | 'unit', value: any) => {
    setRules(rules.map((rule, i) => 
      i === index ? { 
        ...rule, 
        rate: { 
          ...rule.rate, 
          [field]: field === 'amount' ? parseFloat(value) || 0 : value 
        } 
      } : rule
    ));
  };

  const addSubCondition = (ruleIndex: number) => {
    setRules(rules.map((rule, i) => 
      i === ruleIndex ? {
        ...rule,
        sub_conditions: [
          ...(rule.sub_conditions || []),
          {
            condition_type: "duration",
            operator: "is_greater_than",
            value: "1h",
            logic: "AND"
          }
        ]
      } : rule
    ));
  };

  const updateSubCondition = (ruleIndex: number, subIndex: number, field: string, value: any) => {
    setRules(rules.map((rule, i) => 
      i === ruleIndex ? {
        ...rule,
        sub_conditions: rule.sub_conditions?.map((sub, j) => 
          j === subIndex ? { ...sub, [field]: value } : sub
        )
      } : rule
    ));
  };

  const removeSubCondition = (ruleIndex: number, subIndex: number) => {
    setRules(rules.map((rule, i) => 
      i === ruleIndex ? {
        ...rule,
        sub_conditions: rule.sub_conditions?.filter((_, j) => j !== subIndex)
      } : rule
    ));
  };

  const updateLogicOperator = (index: number, operator: string) => {
    const newLogicOperators = [...logicOperators];
    newLogicOperators[index] = operator;
    setLogicOperators(newLogicOperators);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-800">Pricing Rules</h3>
        <div className="flex items-center gap-1 text-xs text-slate-500 bg-green-50 px-2 py-1 rounded">
          <Info className="w-3 h-3" />
          <span>Define rates and conditions for charging</span>
        </div>
      </div>
      
      {rules.map((rule, index) => (
        <div key={index}>
          <PricingRuleItem
            rule={rule}
            onRuleUpdate={(field, value) => updateRule(index, field, value)}
            onRateFieldUpdate={(field, value) => updateRateField(index, field, value)}
            onAddSubCondition={() => addSubCondition(index)}
            onUpdateSubCondition={(subIndex, field, value) => updateSubCondition(index, subIndex, field, value)}
            onRemoveSubCondition={(subIndex) => removeSubCondition(index, subIndex)}
          />
          
          {index < rules.length - 1 && (
            <div className="flex gap-2 mt-4">
              <Button
                type="button"
                size="sm"
                className="rounded-full bg-g400 text-white px-3 py-1.5 text-sm"
                onClick={() => updateLogicOperator(index, 'AND')}
              >
                <Plus className="h-3 w-3 mr-1" /> and
              </Button>

              <Button
                type="button"
                size="sm"
                className="rounded-full bg-g400 text-white px-3 py-1.5 text-sm"
                onClick={() => updateLogicOperator(index, 'OR')}
              >
                <Plus className="h-3 w-3 mr-1" /> or
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
