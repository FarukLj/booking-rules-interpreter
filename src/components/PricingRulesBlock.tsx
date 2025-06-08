
import { PricingRule } from "@/types/RuleResult";
import { PricingRuleHeader } from "./pricing/PricingRuleHeader";
import { PricingRuleForm } from "./pricing/PricingRuleForm";
import { LogicOperatorButtons } from "./pricing/LogicOperatorButtons";
import { usePricingRules } from "./pricing/usePricingRules";

interface PricingRulesBlockProps {
  initialRules?: PricingRule[];
}

export function PricingRulesBlock({ initialRules = [] }: PricingRulesBlockProps) {
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

  const timeOptions = Array.from({ length: 96 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });
  
  const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const spaceOptions = ["Space 1", "Space 2", "Conference Room A", "Studio 1", "Studio 2", "Studio 3", "Meeting Room B", "Court A", "Gym"];
  const rateUnitOptions = ["fixed", "per_15min", "per_30min", "per_hour", "per_2hours", "per_day"];
  const tagOptions = ["Public", "The Team", "Premium Members", "Gold Members", "Basic", "VIP", "Staff", "Instructor", "Pro Member", "Visitor", "Coaches"];
  
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

  return (
    <div className="space-y-4">
      <PricingRuleHeader />
      
      {rules.map((rule, index) => (
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
      ))}
    </div>
  );
}
