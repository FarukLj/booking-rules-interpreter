
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BookingWindowRule } from "@/types/RuleResult";

interface BookingWindowRulesBlockProps {
  initialRules?: BookingWindowRule[];
}

export function BookingWindowRulesBlock({ initialRules = [] }: BookingWindowRulesBlockProps) {
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

  const userScopeOptions = ["all_users", "users_with_tags", "users_with_no_tags"];
  const constraintOptions = ["less_than", "more_than"];
  const unitOptions = ["hours", "days"];
  const spaceOptions = ["Space 1", "Space 2", "Conference Room A", "Studio 3", "Meeting Room B"];
  const tagOptions = ["Basic", "VIP", "Premium", "Member", "Staff"];

  const updateRule = (index: number, field: keyof BookingWindowRule, value: any) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, [field]: value } : rule
    ));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Booking Window Rules</h3>
      
      {rules.map((rule, index) => (
        <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Select value={rule.user_scope} onValueChange={(value) => updateRule(index, 'user_scope', value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {userScopeOptions.map(scope => (
                  <SelectItem key={scope} value={scope}>{scope.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(rule.user_scope === "users_with_tags" || rule.user_scope === "users_with_no_tags") && (
              <>
                <span className="text-slate-600">with tags</span>
                <Select 
                  value={rule.tags?.[0] || ""} 
                  onValueChange={(value) => updateRule(index, 'tags', [value])}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Select tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {tagOptions.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            
            <span className="text-slate-600">can book</span>
            
            <Select value={rule.constraint} onValueChange={(value) => updateRule(index, 'constraint', value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {constraintOptions.map(constraint => (
                  <SelectItem key={constraint} value={constraint}>{constraint.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input 
              type="number"
              value={rule.value} 
              onChange={(e) => updateRule(index, 'value', parseInt(e.target.value) || 0)}
              className="w-20"
              placeholder="72"
            />
            
            <Select value={rule.unit} onValueChange={(value) => updateRule(index, 'unit', value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unitOptions.map(unit => (
                  <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <span className="text-slate-600">in advance for</span>
            
            <Select 
              value={rule.spaces[0]} 
              onValueChange={(value) => updateRule(index, 'spaces', [value])}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {spaceOptions.map(space => (
                  <SelectItem key={space} value={space}>{space}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {rule.explanation && (
            <div className="mt-2 text-xs text-slate-600 bg-white p-2 rounded border">
              {rule.explanation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
