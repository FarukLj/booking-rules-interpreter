
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
  console.log('[BookingWindowRulesBlock] Received ruleResult:', ruleResult);
  console.log('[BookingWindowRulesBlock] Initial rules:', initialRules);

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

  // Use dynamic space and tag options from the hooks
  const { spaceOptions } = useSpaceOptions(ruleResult);
  const { tagOptions } = useTagOptions(ruleResult);

  console.log('[BookingWindowRulesBlock] Tag options from hook:', tagOptions);
  console.log('[BookingWindowRulesBlock] Current rules with tags:', rules.map(r => ({ 
    user_scope: r.user_scope, 
    tags: r.tags,
    constraint: r.constraint,
    value: r.value,
    unit: r.unit
  })));

  const updateRule = (index: number, field: keyof BookingWindowRule, value: any) => {
    console.log(`[BookingWindowRulesBlock] Updating rule ${index}, field ${field}, value:`, value);
    setRules(prev => prev.map((rule, i) => {
      if (i === index) {
        const updatedRule = { ...rule, [field]: value };
        console.log(`[BookingWindowRulesBlock] Updated rule ${index}:`, updatedRule);
        return updatedRule;
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
