
// Force rebuild after GitHub commit - 2025-06-13 14:35:00
import { useState } from "react";
import { BookingWindowRule, RuleResult } from "@/types/RuleResult";
import { BookingWindowRuleItem } from "./BookingWindowRuleItem";
import { LogicOperatorToggle } from "./LogicOperatorToggle";
import { useSpaceOptions } from "@/hooks/useSpaceOptions";
import { useTagOptions } from "@/hooks/useTagOptions";

interface BookingWindowRulesBlockProps {
  initialRules?: BookingWindowRule[];
  ruleResult?: RuleResult;
}

export function BookingWindowRulesBlock({ initialRules = [], ruleResult }: BookingWindowRulesBlockProps) {
  // Add debugging to see what we receive
  console.log("BookingWindowRulesBlock - initialRules:", initialRules);
  
  // Improved state initialization - preserve the exact data from backend
  const [rules, setRules] = useState<BookingWindowRule[]>(() => {
    if (initialRules.length > 0) {
      // Validate and correct any inconsistent data from backend
      return initialRules.map(rule => {
        // If rule has tags but incorrect user_scope, fix it
        if (rule.tags && rule.tags.length > 0 && rule.user_scope === "all_users") {
          console.log("Correcting user_scope for rule with tags:", rule);
          return {
            ...rule,
            user_scope: "users_with_tags"
          };
        }
        return rule;
      });
    }
    
    return [{
      user_scope: "all_users",
      constraint: "less_than",
      value: 72,
      unit: "hours",
      spaces: ["Space 1"],
      explanation: "Default booking window rule"
    }];
  });
  
  const [logicOperators, setLogicOperators] = useState<string[]>(
    new Array(Math.max(0, rules.length - 1)).fill("AND")
  );

  // Use dynamic space and tag options from the hooks
  const { spaceOptions } = useSpaceOptions(ruleResult);
  const { tagOptions } = useTagOptions(ruleResult);

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
