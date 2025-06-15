
import { PricingRule, RuleResult } from "@/types/RuleResult";
import { PricingRuleHeader } from "./pricing/PricingRuleHeader";
import { PricingRuleForm } from "./pricing/PricingRuleForm";
import { LogicOperatorButtons } from "./pricing/LogicOperatorButtons";
import { usePricingRules } from "./pricing/usePricingRules";
import { useSpaceOptions } from "@/hooks/useSpaceOptions";
import { useTagOptions } from "@/hooks/useTagOptions";

interface PricingRulesBlockProps {
  initialRules?: PricingRule[];
  ruleResult?: RuleResult;
}

export function PricingRulesBlock({ initialRules = [], ruleResult }: PricingRulesBlockProps) {
  console.log('[PRICING RULES BLOCK] Component rendered with initialRules:', initialRules);
  console.log('[PRICING RULES BLOCK] initialRules count:', initialRules.length);
  console.log('[PRICING RULES BLOCK] ruleResult:', ruleResult);

  const {
    rules,
    logicOperators,
    updateRule,
    updateRateField,
    updateLogicOperator,
    addSubCondition,
    removeSubCondition,
    updateSubCondition
  } = usePricingRules(initialRules);

  console.log('[PRICING RULES BLOCK] Hook returned rules:', rules);
  console.log('[PRICING RULES BLOCK] Hook returned rules count:', rules.length);

  // Use dynamic space and tag options from the hooks
  const { spaceOptions } = useSpaceOptions(ruleResult);
  const { tagOptions } = useTagOptions(ruleResult);

  const timeOptions = Array.from({ length: 96 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });
  
  const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const rateUnitOptions = ["fixed", "per_15min", "per_30min", "per_hour", "per_2hours", "per_day"];
  
  // Enhanced duration operators including the missing "is greater than or equal to"
  const durationOperators = [
    "is less than",
    "is less than or equal to",
    "is greater than", 
    "is greater than or equal to",
    "is equal to",
    "is not equal to"
  ];
  const tagOperators = ["contains any of", "contains none of"];
  
  const durationValues = ["15min", "30min", "45min", "1h", "1h15min", "1h30min", "2h", "3h", "4h", "6h", "8h"];

  console.log('[PRICING RULES BLOCK] About to render, rules.length:', rules.length);

  return (
    <div className="space-y-4">
      <PricingRuleHeader />
      
      {rules.map((rule, index) => {
        console.log(`[PRICING RULES BLOCK] Rendering rule ${index}:`, rule);
        return (
          <div key={index}>
            <PricingRuleForm
              rule={rule}
              index={index}
              timeOptions={timeOptions}
              dayOptions={dayOptions}
              spaceOptions={spaceOptions}
              rateUnitOptions={rateUnitOptions}
              tagOptions={tagOptions}
              durationOperators={durationOperators}
              tagOperators={tagOperators}
              durationValues={durationValues}
              onUpdateRule={updateRule}
              onUpdateRateField={updateRateField}
              onAddSubCondition={addSubCondition}
              onRemoveSubCondition={removeSubCondition}
              onUpdateSubCondition={updateSubCondition}
            />
            
            <LogicOperatorButtons
              index={index}
              totalRules={rules.length}
              onUpdateLogicOperator={updateLogicOperator}
            />
          </div>
        );
      })}
    </div>
  );
}
