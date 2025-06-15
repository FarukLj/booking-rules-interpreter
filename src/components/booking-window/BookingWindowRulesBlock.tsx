
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
  // DEBUG: Add comprehensive logging to trace data flow
  console.log('[BookingWindowRulesBlock] Component initialized with:', {
    initialRulesLength: initialRules.length,
    initialRules: initialRules,
    ruleResult: ruleResult ? 'present' : 'missing'
  });

  // FIXED: Initialize rules state directly with initialRules without fallback to hardcoded default
  // This was the root cause - we were always falling back to a hardcoded "all_users" rule
  const [rules, setRules] = useState<BookingWindowRule[]>(initialRules);
  
  const [logicOperators, setLogicOperators] = useState<string[]>(
    new Array(Math.max(0, rules.length - 1)).fill("AND")
  );

  // DEBUG: Log the final rules state after initialization
  console.log('[BookingWindowRulesBlock] Rules state initialized:', {
    rulesLength: rules.length,
    rules: rules.map(rule => ({
      user_scope: rule.user_scope,
      tags: rule.tags,
      spaces: rule.spaces
    }))
  });

  // Use dynamic space and tag options from the hooks
  const { spaceOptions } = useSpaceOptions(ruleResult);
  const { tagOptions } = useTagOptions(ruleResult);

  // DEBUG: Log available options
  console.log('[BookingWindowRulesBlock] Available options:', {
    spaceOptions: spaceOptions,
    tagOptions: tagOptions
  });

  const updateRule = (index: number, field: keyof BookingWindowRule, value: any) => {
    console.log('[BookingWindowRulesBlock] Updating rule:', { index, field, value });
    setRules(prev => prev.map((rule, i) => {
      if (i === index) {
        const updatedRule = { ...rule, [field]: value };
        console.log('[BookingWindowRulesBlock] Rule updated:', { old: rule, new: updatedRule });
        return updatedRule;
      }
      return rule;
    }));
  };

  const updateLogicOperator = (index: number, operator: string) => {
    setLogicOperators(prev => prev.map((op, i) => i === index ? operator : op));
  };

  // Handle edge case where no rules are provided (shouldn't happen with AI-generated data)
  if (rules.length === 0) {
    console.warn('[BookingWindowRulesBlock] No rules provided - this should not happen with AI-generated data');
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Booking Window Rules</h3>
        <div className="text-sm text-slate-600 bg-yellow-50 border border-yellow-200 p-3 rounded">
          No booking window rules were generated. This typically indicates an issue with the AI rule generation.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Booking Window Rules</h3>
      
      {rules.map((rule, index) => {
        console.log('[BookingWindowRulesBlock] Rendering rule:', { index, rule });
        return (
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
        );
      })}
    </div>
  );
}
