
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Toggle } from "@/components/ui/toggle";
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
  
  const [logicOperators, setLogicOperators] = useState<string[]>(
    new Array(Math.max(0, rules.length - 1)).fill("AND")
  );

  const userScopeOptions = [
    "All users",
    "Users with any of the tags",
    "Users with none of the tags"
  ];
  
  const constraintOptions = ["less than", "more than"];
  const spaceOptions = ["Space 1", "Space 2", "Conference Room A", "Studio 1", "Studio 2", "Studio 3", "Meeting Room B", "Court A", "Gym"];
  const tagOptions = ["Basic", "VIP", "Premium", "Member", "Staff", "The Team", "Gold Members", "Instructor", "Pro Member", "Public", "Visitor"];

  const updateRule = (index: number, field: keyof BookingWindowRule, value: any) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, [field]: value } : rule
    ));
  };

  const updateLogicOperator = (index: number, operator: string) => {
    setLogicOperators(prev => prev.map((op, i) => i === index ? operator : op));
  };

  const getSelectedSpaces = (spaces: string[]) => {
    if (spaces.length === 0) return "Select spaces";
    if (spaces.length <= 2) return spaces.join(", ");
    return `${spaces.slice(0, 2).join(", ")} +${spaces.length - 2}`;
  };

  const getSelectedTags = (tags: string[] = []) => {
    if (tags.length === 0) return "Select tags";
    if (tags.length <= 2) return tags.join(", ");
    return `${tags.slice(0, 2).join(", ")} +${tags.length - 2}`;
  };

  const getUserScopeValue = (scope: string) => {
    switch(scope) {
      case "all_users": return "All users";
      case "users_with_tags": return "Users with any of the tags";
      case "users_with_no_tags": return "Users with none of the tags";
      default: return "All users";
    }
  };

  const toggleSpace = (ruleIndex: number, space: string) => {
    const rule = rules[ruleIndex];
    const newSpaces = rule.spaces.includes(space)
      ? rule.spaces.filter(s => s !== space)
      : [...rule.spaces, space];
    updateRule(ruleIndex, 'spaces', newSpaces);
  };

  const toggleTag = (ruleIndex: number, tag: string) => {
    const rule = rules[ruleIndex];
    const currentTags = rule.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    updateRule(ruleIndex, 'tags', newTags);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Booking Window Rules</h3>
      
      {rules.map((rule, index) => (
        <div key={index}>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Select value={getUserScopeValue(rule.user_scope)} onValueChange={(value) => {
                const scopeMap: Record<string, string> = {
                  "All users": "all_users",
                  "Users with any of the tags": "users_with_tags",
                  "Users with none of the tags": "users_with_no_tags"
                };
                updateRule(index, 'user_scope', scopeMap[value] || 'all_users');
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {userScopeOptions.map(scope => (
                    <SelectItem key={scope} value={scope}>{scope}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {(rule.user_scope === "users_with_tags" || rule.user_scope === "users_with_no_tags") && (
                <Select value={getSelectedTags(rule.tags)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Select tags">{getSelectedTags(rule.tags)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tagOptions.map(tag => (
                      <div key={tag} className="flex items-center space-x-2 p-2 cursor-pointer hover:bg-slate-100" onClick={() => toggleTag(index, tag)}>
                        <Checkbox 
                          checked={rule.tags?.includes(tag)}
                        />
                        <span>{tag}</span>
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <span className="text-slate-600">cannot make a booking for</span>
              
              <Select value={getSelectedSpaces(rule.spaces)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select spaces">{getSelectedSpaces(rule.spaces)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {spaceOptions.map(space => (
                    <div key={space} className="flex items-center space-x-2 p-2 cursor-pointer hover:bg-slate-100" onClick={() => toggleSpace(index, space)}>
                      <Checkbox 
                        checked={rule.spaces.includes(space)}
                      />
                      <span>{space}</span>
                    </div>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={rule.constraint} onValueChange={(value) => updateRule(index, 'constraint', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {constraintOptions.map(constraint => (
                    <SelectItem key={constraint} value={constraint.replace(' ', '_')}>{constraint}</SelectItem>
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
              
              <span className="text-slate-600">hours in advance</span>
            </div>
            
            {rule.explanation && (
              <div className="mt-3 text-xs text-slate-600 bg-white p-2 rounded border">
                <strong>Explanation:</strong> {rule.explanation}
              </div>
            )}
          </div>
          
          {index < rules.length - 1 && (
            <div className="flex justify-center my-2">
              <div className="flex items-center space-x-2">
                <Toggle
                  pressed={logicOperators[index] === "AND"}
                  onPressedChange={(pressed) => updateLogicOperator(index, pressed ? "AND" : "OR")}
                  className="w-12 h-8"
                >
                  AND
                </Toggle>
                <Toggle
                  pressed={logicOperators[index] === "OR"}
                  onPressedChange={(pressed) => updateLogicOperator(index, pressed ? "OR" : "AND")}
                  className="w-12 h-8"
                >
                  OR
                </Toggle>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
