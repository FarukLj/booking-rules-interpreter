
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Toggle } from "@/components/ui/toggle";
import { QuotaRule } from "@/types/RuleResult";

interface QuotaRulesBlockProps {
  initialRules?: QuotaRule[];
}

export function QuotaRulesBlock({ initialRules = [] }: QuotaRulesBlockProps) {
  const [rules, setRules] = useState<QuotaRule[]>(
    initialRules.length > 0 ? initialRules : [{
      target: "individuals",
      quota_type: "time",
      value: "2h",
      period: "day",
      affected_spaces: ["Space 1"],
      consideration_time: "any_time",
      time_range: "09:00–17:00",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      explanation: "Default quota rule"
    }]
  );
  
  const [logicOperators, setLogicOperators] = useState<string[]>(
    new Array(Math.max(0, rules.length - 1)).fill("AND")
  );

  const spaceOptions = ["Space 1", "Space 2", "Conference Room A", "Studio 1", "Studio 2", "Studio 3", "Meeting Room B", "Court A", "Gym"];
  const tagOptions = ["Public", "The Team", "Premium Members", "Gold Members", "Basic", "VIP", "Staff", "Instructor", "Pro Member", "Visitor"];
  const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  const timeOptions = Array.from({ length: 96 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  const updateRule = (index: number, field: keyof QuotaRule, value: any) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, [field]: value } : rule
    ));
  };

  const updateLogicOperator = (index: number, operator: string) => {
    setLogicOperators(prev => prev.map((op, i) => i === index ? operator : op));
  };

  const formatTimeDisplay = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    const minute = time.split(':')[1];
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute} ${period}`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Quota Rules</h3>
      
      {rules.map((rule, index) => (
        <div key={index}>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Select value={rule.target} onValueChange={(value) => updateRule(index, 'target', value)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individuals">Individuals</SelectItem>
                  <SelectItem value="individuals_with_tags">Individuals with tags</SelectItem>
                  <SelectItem value="group_with_tag">Group with tag</SelectItem>
                </SelectContent>
              </Select>
              
              {(rule.target === "individuals_with_tags" || rule.target === "group_with_tag") && (
                <>
                  <span className="text-slate-600">with tags</span>
                  <MultiSelect
                    options={tagOptions}
                    selected={rule.tags || []}
                    onSelectionChange={(selected) => updateRule(index, 'tags', selected)}
                    placeholder="Select tags"
                    className="w-32"
                  />
                </>
              )}
              
              <span className="text-slate-600">can book</span>
              
              {rule.quota_type === "time" ? (
                <Input 
                  type="text" 
                  value={rule.value} 
                  onChange={(e) => updateRule(index, 'value', e.target.value)}
                  className="w-20"
                  placeholder="2h"
                />
              ) : (
                <Input 
                  type="number" 
                  value={rule.value} 
                  onChange={(e) => updateRule(index, 'value', parseInt(e.target.value) || 0)}
                  className="w-20"
                  placeholder="5"
                />
              )}
              
              <Select value={rule.quota_type} onValueChange={(value) => updateRule(index, 'quota_type', value)}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time">time</SelectItem>
                  <SelectItem value="count">bookings</SelectItem>
                </SelectContent>
              </Select>
              
              <span className="text-slate-600">per</span>
              
              <Select value={rule.period} onValueChange={(value) => updateRule(index, 'period', value)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">day</SelectItem>
                  <SelectItem value="week">week</SelectItem>
                  <SelectItem value="month">month</SelectItem>
                  <SelectItem value="at_any_time">at any time</SelectItem>
                </SelectContent>
              </Select>
              
              <span className="text-slate-600">in</span>
              
              <MultiSelect
                options={spaceOptions}
                selected={rule.affected_spaces}
                onSelectionChange={(selected) => updateRule(index, 'affected_spaces', selected)}
                placeholder="Select spaces"
                className="w-40"
              />
              
              {rule.consideration_time === "specific_time" && (
                <>
                  <span className="text-slate-600">from</span>
                  
                  <Select value={rule.time_range?.split('–')[0] || '09:00'} onValueChange={(value) => {
                    const endTime = rule.time_range?.split('–')[1] || '17:00';
                    updateRule(index, 'time_range', `${value}–${endTime}`);
                  }}>
                    <SelectTrigger className="w-24">
                      <SelectValue>{formatTimeDisplay(rule.time_range?.split('–')[0] || '09:00')}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <span className="text-slate-600">to</span>
                  
                  <Select value={rule.time_range?.split('–')[1] || '17:00'} onValueChange={(value) => {
                    const startTime = rule.time_range?.split('–')[0] || '09:00';
                    updateRule(index, 'time_range', `${startTime}–${value}`);
                  }}>
                    <SelectTrigger className="w-24">
                      <SelectValue>{formatTimeDisplay(rule.time_range?.split('–')[1] || '17:00')}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <span className="text-slate-600">on</span>
                  
                  <MultiSelect
                    options={dayOptions}
                    selected={rule.days || dayOptions}
                    onSelectionChange={(selected) => updateRule(index, 'days', selected)}
                    placeholder="Select days"
                    className="w-32"
                  />
                </>
              )}
            </div>
            
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-slate-600">Consideration time:</span>
              <Select value={rule.consideration_time} onValueChange={(value) => updateRule(index, 'consideration_time', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any_time">Any time</SelectItem>
                  <SelectItem value="specific_time">Specific time</SelectItem>
                </SelectContent>
              </Select>
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
