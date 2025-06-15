
import { useState, useEffect } from "react";
import { PricingRule } from "@/types/RuleResult";
import { handleSmartTimeRange, timeRangeFromKeyword, normaliseTimeRange } from "@/utils/pricingFormatters";

export function usePricingRules(initialRules: PricingRule[] = []) {
  console.log('[PRICING RULES HOOK] Received initialRules:', initialRules);
  console.log('[PRICING RULES HOOK] Initial rules count:', initialRules.length);
  
  const [rules, setRules] = useState<PricingRule[]>([]);
  
  const [logicOperators, setLogicOperators] = useState<string[]>([]);

  // Enhanced initialization from parseRule response
  useEffect(() => {
    console.log('[PRICING RULES HOOK] useEffect triggered with initialRules:', initialRules);
    console.log('[PRICING RULES HOOK] initialRules.length:', initialRules.length);
    
    if (initialRules.length > 0) {
      console.log('Initializing pricing rules from parseRule:', initialRules);
      
      // Ensure all rules have proper defaults and normalize units
      const processedRules = initialRules.map((rule, index) => {
        console.log(`[PRICING RULES HOOK] Processing rule ${index}:`, rule);
        
        // Normalize unit: "hour" -> "per_hour"
        let normalizedUnit = rule.rate?.unit || "per_hour";
        if (normalizedUnit === "hour") {
          normalizedUnit = "per_hour";
          console.log(`[PRICING RULES HOOK] Normalized unit from "hour" to "per_hour" for rule ${index}`);
        }
        
        const processedRule = {
          ...rule,
          // Ensure all 7 days are selected if not specified
          days: rule.days && rule.days.length > 0 ? rule.days : 
            ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          // Ensure space is an array
          space: Array.isArray(rule.space) ? rule.space : [rule.space || "Space 1"],
          // Ensure rate has amount set with normalized unit
          rate: {
            amount: rule.rate?.amount || 0,
            unit: normalizedUnit
          },
          // Ensure proper defaults for conditions with fallback to 15min
          condition_type: rule.condition_type || "duration",
          operator: rule.operator || "is_greater_than_or_equal_to",
          value: rule.value || "15min"
        };
        
        console.log(`[PRICING RULES HOOK] Processed rule ${index}:`, processedRule);
        return processedRule;
      });
      
      console.log('[PRICING RULES HOOK] All processed rules:', processedRules);
      console.log('[PRICING RULES HOOK] Setting rules count:', processedRules.length);
      
      setRules(processedRules);
      setLogicOperators(new Array(Math.max(0, processedRules.length - 1)).fill("AND"));
    } else {
      // Default rule when no initialRules provided
      console.log('[PRICING RULES HOOK] No initial rules, setting default rule');
      const defaultRule = {
        space: ["Space 1"],
        time_range: "09:00–17:00",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        rate: { amount: 25, unit: "per_hour" },
        condition_type: "duration",
        operator: "is_greater_than_or_equal_to",
        value: "15min",
        explanation: "Default pricing rule"
      };
      setRules([defaultRule]);
      setLogicOperators([]);
    }
  }, [initialRules]);

  // Additional useEffect to log when rules state changes
  useEffect(() => {
    console.log('[PRICING RULES HOOK] Rules state updated:', rules);
    console.log('[PRICING RULES HOOK] Current rules count in state:', rules.length);
  }, [rules]);

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
