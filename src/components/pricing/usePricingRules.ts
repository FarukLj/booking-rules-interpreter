import { useState, useEffect } from "react";
import { PricingRule } from "@/types/RuleResult";
import { handleSmartTimeRange, timeRangeFromKeyword, normaliseTimeRange } from "@/utils/pricingFormatters";

export function usePricingRules(initialRules: PricingRule[] = []) {
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

  // ───────────────────────────────────────────────────────────
//  Updates a single field **or** handles our special keyword
//  “after 18:00” → time_range = "18:00–24:00"
import { normaliseTimeRange } from "@/utils/pricingFormatters";   //  add this to the imports at the top

const updateRule = (
  index: number,
  field: keyof PricingRule | "time_keyword",
  value: any
) => {
  // ••• 1) keyword branch — run before we touch state •••
  if (field === "time_keyword") {
    const range = normaliseTimeRange(String(value));
    if (range) {
      setRules(prev =>
        prev.map((rule, i) =>
          i === index ? { ...rule, time_range: range } : rule
        )
      );
    }
    return;                           // nothing else to do
  }

  // ••• 2) regular field update •••
  setRules(prev =>
    prev.map((rule, i) =>
      i === index ? { ...rule, [field]: value } : rule
    )
  );
};

  const updateRateField = (index: number, field: 'amount' | 'unit', value: any) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { 
        ...rule, 
        rate: { ...rule.rate, [field]: field === 'amount' ? parseFloat(value) || 0 : value }
      } : rule
    ));
  };

  const updateLogicOperator = (index: number, operator: string) => {
    setLogicOperators(prev => prev.map((op, i) => i === index ? operator : op));
  };

  const addSubCondition = (ruleIndex: number) => {
    setRules(prev => prev.map((rule, i) => 
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

  const removeSubCondition = (ruleIndex: number, subIndex: number) => {
    setRules(prev => prev.map((rule, i) => 
      i === ruleIndex ? { 
        ...rule, 
        sub_conditions: rule.sub_conditions?.filter((_, si) => si !== subIndex)
      } : rule
    ));
  };

  const updateSubCondition = (ruleIndex: number, subIndex: number, field: string, value: any) => {
    setRules(prev => prev.map((rule, i) => 
      i === ruleIndex ? { 
        ...rule, 
        sub_conditions: rule.sub_conditions?.map((sub, si) => 
          si === subIndex ? { ...sub, [field]: value } : sub
        )
      } : rule
    ));
  };

  return {
    rules,
    logicOperators,
    updateRule,
    updateRateField,
    updateLogicOperator,
    addSubCondition,
    removeSubCondition,
    updateSubCondition
  };
}
