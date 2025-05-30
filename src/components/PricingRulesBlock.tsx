
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Toggle } from "@/components/ui/toggle";
import { PricingRule } from "@/types/RuleResult";

interface PricingRulesBlockProps {
  initialRules?: PricingRule[];
}

export function PricingRulesBlock({ initialRules = [] }: PricingRulesBlockProps) {
  const [rules, setRules] = useState<PricingRule[]>(
    initialRules.length > 0 ? initialRules : [{
      space: ["Space 1"],
      time_range: "09:00–17:00",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      rate: { amount: 25, unit: "per_hour" },
      condition_type: "duration",
      operator: "is_greater_than",
      value: "1h",
      explanation: "Default pricing rule"
    }]
  );
  
  const [logicOperators, setLogicOperators] = useState<string[]>(
    new Array(Math.max(0, rules.length - 1)).fill("AND")
  );

  const timeOptions = Array.from({ length: 96 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });
  
  const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const spaceOptions = ["Space 1", "Space 2", "Conference Room A", "Studio 1", "Studio 2", "Studio 3", "Meeting Room B", "Court A", "Gym"];
  const rateUnitOptions = ["fixed", "per_15min", "per_30min", "per_hour", "per_2hours", "per_day"];
  const tagOptions = ["Public", "The Team", "Premium Members", "Gold Members", "Basic", "VIP", "Staff", "Instructor", "Pro Member", "Visitor"];
  
  const durationOperators = ["is_less_than", "is_less_than_or_equal_to", "is_greater_than", "is_greater_than_or_equal_to", "is_equal_to", "is_not_equal_to"];
  const tagOperators = ["contains_any_of", "contains_none_of"];
  
  const durationValues = ["15min", "30min", "45min", "1h", "1h15min", "1h30min", "2h", "3h", "4h", "6h", "8h"];

  const updateRule = (index: number, field: keyof PricingRule, value: any) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, [field]: value } : rule
    ));
  };

  const updateRateField = (index: number, field: 'amount' | 'unit', value: any) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { 
        ...rule, 
        rate: { ...rule.rate, [field]: field === 'amount' ? parseFloat(value) || 0 : value }
      } : rule
    ));
  };

  const updateLogicOperator = (index: number, operator: string) => {
    setLogicOperators(prev => prev.map((op, i) => i === index ? operator : op));
  };

  const getSelectedSpaces = (spaces: string[]) => {
    if (spaces.length === 0) return "Select spaces";
    if (spaces.length <= 2) return spaces.join(", ");
    return `${spaces.slice(0, 2).join(", ")}...`;
  };

  const getSelectedDays = (days: string[]) => {
    if (days.length === 0) return "Select days";
    if (days.length === 7) return "All days";
    if (days.length <= 2) return days.join(", ");
    return `${days.slice(0, 2).join(", ")}...`;
  };

  const getSelectedTags = (tags: string[] = []) => {
    if (tags.length === 0) return "Select tags";
    if (tags.length <= 2) return tags.join(", ");
    return `${tags.slice(0, 2).join(", ")}...`;
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
      <h3 className="text-lg font-semibold text-slate-800">Pricing Rules</h3>
      
      {rules.map((rule, index) => (
        <div key={index}>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-600">For</span>
              
              <Select>
                <SelectTrigger className="w-40">
                  <SelectValue>{getSelectedSpaces(rule.space)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {spaceOptions.map(space => (
                    <div key={space} className="flex items-center space-x-2 p-2">
                      <Checkbox 
                        checked={rule.space.includes(space)}
                        onCheckedChange={(checked) => {
                          const newSpaces = checked 
                            ? [...rule.space, space]
                            : rule.space.filter(s => s !== space);
                          updateRule(index, 'space', newSpaces);
                        }}
                      />
                      <span>{space}</span>
                    </div>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-slate-600">from</span>
              
              <Select value={rule.time_range.split('–')[0]} onValueChange={(value) => {
                const endTime = rule.time_range.split('–')[1] || '17:00';
                updateRule(index, 'time_range', `${value}–${endTime}`);
              }}>
                <SelectTrigger className="w-24">
                  <SelectValue>{formatTimeDisplay(rule.time_range.split('–')[0])}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-slate-600">to</span>
              
              <Select value={rule.time_range.split('–')[1]} onValueChange={(value) => {
                const startTime = rule.time_range.split('–')[0] || '09:00';
                updateRule(index, 'time_range', `${startTime}–${value}`);
              }}>
                <SelectTrigger className="w-24">
                  <SelectValue>{formatTimeDisplay(rule.time_range.split('–')[1] || '17:00')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-slate-600">on</span>
              
              <Select>
                <SelectTrigger className="w-32">
                  <SelectValue>{getSelectedDays(rule.days)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map(day => (
                    <div key={day} className="flex items-center space-x-2 p-2">
                      <Checkbox 
                        checked={rule.days.includes(day)}
                        onCheckedChange={(checked) => {
                          const newDays = checked 
                            ? [...rule.days, day]
                            : rule.days.filter(d => d !== day);
                          updateRule(index, 'days', newDays);
                        }}
                      />
                      <span>{day}</span>
                    </div>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-slate-600">, charge</span>
              
              <div className="flex items-center">
                <span className="text-lg font-semibold mr-1">$</span>
                <Input 
                  type="number" 
                  value={rule.rate.amount} 
                  onChange={(e) => updateRateField(index, 'amount', e.target.value)}
                  className="w-20"
                  placeholder="25"
                />
              </div>
              
              <Select value={rule.rate.unit} onValueChange={(value) => updateRateField(index, 'unit', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rateUnitOptions.map(unit => (
                    <SelectItem key={unit} value={unit}>{unit.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-slate-600">for a booking if</span>
              
              <Select value={rule.condition_type} onValueChange={(value) => updateRule(index, 'condition_type', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="duration">it's duration</SelectItem>
                  <SelectItem value="user_tags">the holder's set of tags</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={rule.operator} onValueChange={(value) => updateRule(index, 'operator', value)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(rule.condition_type === "duration" ? durationOperators : tagOperators).map(operator => (
                    <SelectItem key={operator} value={operator}>{operator.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={Array.isArray(rule.value) ? rule.value[0] : rule.value} 
                onValueChange={(value) => updateRule(index, 'value', rule.condition_type === "duration" ? value : [value])}
              >
                <SelectTrigger className="w-32">
                  <SelectValue>
                    {rule.condition_type === "duration" 
                      ? rule.value 
                      : getSelectedTags(Array.isArray(rule.value) ? rule.value : [])
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {rule.condition_type === "duration" ? (
                    durationValues.map(value => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))
                  ) : (
                    tagOptions.map(tag => (
                      <div key={tag} className="flex items-center space-x-2 p-2">
                        <Checkbox defaultChecked={Array.isArray(rule.value) && rule.value.includes(tag)} />
                        <span>{tag}</span>
                      </div>
                    ))
                  )}
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
