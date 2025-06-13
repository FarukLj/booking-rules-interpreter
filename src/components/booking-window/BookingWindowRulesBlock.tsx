
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Info, Plus, X } from "lucide-react";
import { BookingWindowRule } from "@/types/RuleResult";
import { BookingWindowRuleItem } from "./BookingWindowRuleItem";
import { useTagOptions } from "@/hooks/useTagOptions";

interface BookingWindowRulesBlockProps {
  rules?: BookingWindowRule[];
  onRulesChange?: (rules: BookingWindowRule[]) => void;
  ruleResult?: any;
}

export function BookingWindowRulesBlock({
  rules = [],
  onRulesChange,
  ruleResult
}: BookingWindowRulesBlockProps) {
  const { tagOptions } = useTagOptions(ruleResult);

  // Auto-correct user_scope when rules are loaded from AI
  useEffect(() => {
    if (rules.length > 0 && onRulesChange) {
      let needsUpdate = false;
      const correctedRules = rules.map(rule => {
        // If rule has tags but user_scope is not set correctly, fix it
        if (rule.tags && rule.tags.length > 0 && rule.user_scope !== "users_with_tags") {
          console.log('[BookingWindowRulesBlock] Auto-correcting user_scope for rule with tags:', rule.tags);
          needsUpdate = true;
          return { ...rule, user_scope: "users_with_tags" };
        }
        // If rule has no tags but user_scope is not all_users, fix it
        if ((!rule.tags || rule.tags.length === 0) && rule.user_scope !== "all_users") {
          console.log('[BookingWindowRulesBlock] Auto-correcting user_scope for rule without tags');
          needsUpdate = true;
          return { ...rule, user_scope: "all_users" };
        }
        return rule;
      });

      if (needsUpdate) {
        console.log('[BookingWindowRulesBlock] Applying user_scope corrections');
        onRulesChange(correctedRules);
      }
    }
  }, [rules, onRulesChange]);

  const addRule = () => {
    const newRule: BookingWindowRule = {
      constraint: "less_than",
      value: 24,
      unit: "hours",
      user_scope: "all_users",
      tags: [],
      spaces: ["all"]
    };

    if (onRulesChange) {
      onRulesChange([...rules, newRule]);
    }
  };

  const updateRule = (index: number, updatedRule: BookingWindowRule) => {
    if (onRulesChange) {
      const newRules = [...rules];
      newRules[index] = updatedRule;
      onRulesChange(newRules);
    }
  };

  const removeRule = (index: number) => {
    if (onRulesChange) {
      const newRules = rules.filter((_, i) => i !== index);
      onRulesChange(newRules);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-800">Booking Window Rules</h3>
          <div className="flex items-center gap-1 text-xs text-slate-500 bg-blue-50 px-2 py-1 rounded">
            <Info className="w-3 h-3" />
            <span>Control how far in advance users can book</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="mb-4">No booking window rules configured</p>
            <Button onClick={addRule} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {rules.map((rule, index) => (
                <div key={index} className="relative">
                  <BookingWindowRuleItem
                    rule={rule}
                    onChange={(updatedRule) => updateRule(index, updatedRule)}
                    availableTagOptions={tagOptions}
                  />
                  {onRulesChange && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                      onClick={() => removeRule(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {onRulesChange && (
              <Button onClick={addRule} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Another Rule
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
