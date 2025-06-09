
import { useState } from "react";
import { BookingWindowRule, RuleResult } from "@/types/RuleResult";
import { BookingWindowRuleItem } from "./BookingWindowRuleItem";
import { LogicOperatorToggle } from "./LogicOperatorToggle";
import { useSpaceOptions } from "@/hooks/useSpaceOptions";

interface BookingWindowRulesBlockProps {
  initialRules?: BookingWindowRule[];
  ruleResult?: RuleResult;
}

export function BookingWindowRulesBlock({ initialRules = [], ruleResult }: BookingWindowRulesBlockProps) {
  const [rules, setRules] = useState<BookingWindowRule[]>(
    initialRules.length > 0 ? initialRules : [{
      user_scope: "all_users",
      constraint: "less_than",
      value: 72,
      unit: "hours",
      spaces: ["Space 1"],
      explanation: "Default booking window rule"
    }]
  );
  
  const [logicOperators, setLogicOperators] = useState<string[]>(
    new Array(Math.max(0, rules.length - 1)).fill("AND")
  );

  // Use dynamic space options from the hook
  const { spaceOptions } = useSpaceOptions(ruleResult);
  const tagOptions = ["Public", "The Team", "Premium Members", "Gold Members", "Basic", "VIP", "Staff", "Instructor", "Pro Member", "Visitor"];

  const updateRule = (index: number, field: keyof BookingWindowRule, value: any) => {
    setRules(prev => prev.map((rule, i) => {
      if (i === index) {
        return { ...rule, [field]: value };
      }
      return rule;
    }));
  };

  const updateLogicOperator = (index: number, operator: string) => {
    setLogicOperators(prev => prev.map((op, i) => i === index ? operator : op));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Booking Window Rules</h3>
      
      {rules.map((rule, index) => (
        <div key={index}>
          <BookingWindowRuleItem
            rule={rule}
            onRuleUpdate={(field, value) => updateRule(index, field, value)}
            spaceOptions={spaceOptions}
            tagOptions={tagOptions}
          />
          
          {index < rules.length - 1 && (
            <LogicOperatorToggle
              operator={logicOperators[index]}
              onOperatorChange={(operator) => updateLogicOperator(index, operator)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
