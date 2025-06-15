
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
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      rate: { amount: 25, unit: "per_hour" },
      condition_type: "duration",
      operator: "is_greater_than_or_equal_to",
      value: "15min",
      explanation: "Default pricing rule"
    }]
  );
  
  const [logicOperators, setLogicOperators] = useState<string[]>(
    new Array(Math.max(0, rules.length - 1)).fill("AND")
  );

  // Enhanced initialization from parseRule response
  useEffect(() => {
    if (initialRules.length > 0) {
      console.log('Initializing pricing rules from parseRule:', initialRules);
      
      // Ensure all rules have proper defaults
      const processedRules = initialRules.map(rule => ({
        ...rule,
        // Ensure all 7 days are selected if not specified
        days: rule.days && rule.days.length > 0 ? rule.days : 
          ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        // Ensure space is an array
        space: Array.isArray(rule.space) ? rule.space : [rule.space || "Space 1"],
        // Ensure rate has amount set
        rate: {
          amount: rule.rate?.amount || 0,
          unit: rule.rate?.unit || "per_hour"
        },
        // Ensure proper defaults for conditions with fallback to 15min
        condition_type: rule.condition_type || "duration",
        operator: rule.operator || "is_greater_than_or_equal_to",
        value: rule.value || "15min"
      }));
      
      setRules(processedRules);
      console.log('Processed pricing rules:', processedRules);
    }
  }, [initialRules]);

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

  const updateRule = (
    index: number,
    field: keyof PricingRule | "time_keyword",
    value: any
  ) => {
    console.log(`Updating rule ${index}, field: ${field}, value:`, value);
    
    // keyword branch — run before we touch state
    if (field === "time_keyword") {
      const range = normaliseTimeRange(String(value));
      if (range) {
        setRules(prev =>
          prev.map((rule, i) =>
            i === index ? { ...rule, time_range: range } : rule
          )
        );
      }
      return;
    }

    // regular field update
    setRules(prev =>
      prev.map((rule, i) =>
        i === index ? { ...rule, [field]: value } : rule
      )
    );
  };

  const updateRateField = (index: number, field: 'amount' | 'unit', value: any) => {
    console.log(`Updating rate field ${field} for rule ${index}:`, value);
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
