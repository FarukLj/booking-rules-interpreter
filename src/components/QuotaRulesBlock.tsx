
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
      value: "5h",
      period: "week",
      affected_spaces: ["Space 1"],
      consideration_time: "any_time",
      explanation: "Default quota rule"
    }]
  );
  
  const [logicOperators, setLogicOperators] = useState<string[]>(
    new Array(Math.max(0, rules.length - 1)).fill("AND")
  );

  const targetOptions = [
    "Individuals",
    "Individuals with any of the tags", 
    "Individuals with none of the tags",
    "Group of users with the tag"
  ];
  
  const quotaTypeOptions = [
    { label: "time-usage maximum", value: "time" },
    { label: "booking-count maximum", value: "count" }
  ];
  
  const periodOptions = ["day", "week", "calendar month", "at any given moment"];
  const spaceOptions = ["Space 1", "Space 2", "Conference Room A", "Studio 1", "Studio 2", "Studio 3", "Meeting Room B", "Court A", "Gym"];
  const considerationTimeOptions = ["any time of the week", "only the specific times"];
  const tagOptions = ["Member", "VIP", "Premium", "Basic", "Staff", "The Team", "Gold Members", "Instructor", "Pro Member", "Public", "Visitor"];
  
  const hourOptions = Array.from({ length: 101 }, (_, i) => `${i}h`);
  const minuteOptions = ["0m", "15m", "30m", "45m"];
  
  const timeOptions = Array.from({ length: 96 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });
  
  const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const updateRule = (index: number, field: keyof QuotaRule, value: any) => {
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
    return `${spaces.slice(0, 2).join(", ")}...`;
  };

  const getSelectedTags = (tags: string[] = []) => {
    if (tags.length === 0) return "Select tags";
    if (tags.length <= 2) return tags.join(", ");
    return `${tags.slice(0, 2).join(", ")}...`;
  };

  const getSelectedDays = (days: string[] = dayOptions) => {
    if (days.length === 0) return "Select days";
    if (days.length === 7) return "All days";
    if (days.length <= 2) return days.join(", ");
    return `${days.slice(0, 2).join(", ")}...`;
  };

  const getTargetValue = (target: string) => {
    switch(target) {
      case "individuals": return "Individuals";
      case "individuals_with_tags": return "Individuals with any of the tags";
      case "group_with_tag": return "Group of users with the tag";
      default: return "Individuals";
    }
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
              <span className="text-slate-600">Limit</span>
              
              <Select value={getTargetValue(rule.target)} onValueChange={(value) => {
                const targetMap: Record<string, string> = {
                  "Individuals": "individuals",
                  "Individuals with any of the tags": "individuals_with_tags",
                  "Individuals with none of the tags": "individuals_with_tags",
                  "Group of users with the tag": "group_with_tag"
                };
                updateRule(index, 'target', targetMap[value] || 'individuals');
              }}>
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {targetOptions.map(target => (
                    <SelectItem key={target} value={target}>{target}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {(rule.target === "individuals_with_tags" || rule.target === "group_with_tag") && (
                <Select>
                  <SelectTrigger className="w-32">
                    <SelectValue>{getSelectedTags(rule.tags)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tagOptions.map(tag => (
                      <div key={tag} className="flex items-center space-x-2 p-2">
                        <Checkbox 
                          checked={rule.tags?.includes(tag)}
                          onCheckedChange={(checked) => {
                            const newTags = checked 
                              ? [...(rule.tags || []), tag]
                              : (rule.tags || []).filter(t => t !== tag);
                            updateRule(index, 'tags', newTags);
                          }}
                        />
                        <span>{tag}</span>
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <span className="text-slate-600">to a per-user</span>
              
              <Select value={rule.quota_type} onValueChange={(value) => updateRule(index, 'quota_type', value)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quotaTypeOptions.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-slate-600">of</span>
              
              {rule.quota_type === 'time' ? (
                <>
                  <Select value={rule.value.toString().split('h')[0]} onValueChange={(value) => {
                    const minutes = rule.value.toString().includes('m') ? rule.value.toString().split('h')[1]?.replace('m', '') || '0' : '0';
                    updateRule(index, 'value', `${value}h${minutes}m`);
                  }}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hourOptions.map(hour => (
                        <SelectItem key={hour} value={hour.replace('h', '')}>{hour}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={rule.value.toString().includes('m') ? rule.value.toString().split('h')[1] || '0m' : '0m'} onValueChange={(value) => {
                    const hours = rule.value.toString().split('h')[0] || '0';
                    updateRule(index, 'value', `${hours}h${value}`);
                  }}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {minuteOptions.map(minute => (
                        <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <Input 
                  type="number"
                  value={rule.value.toString()} 
                  onChange={(e) => updateRule(index, 'value', parseInt(e.target.value) || 0)}
                  className="w-20"
                  placeholder="3"
                />
              )}
              
              <span className="text-slate-600">per</span>
              
              <Select value={rule.period} onValueChange={(value) => updateRule(index, 'period', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map(period => (
                    <SelectItem key={period} value={period.replace(' ', '_')}>{period}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select>
                <SelectTrigger className="w-32">
                  <SelectValue>{getSelectedSpaces(rule.affected_spaces)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {spaceOptions.map(space => (
                    <div key={space} className="flex items-center space-x-2 p-2">
                      <Checkbox 
                        checked={rule.affected_spaces.includes(space)}
                        onCheckedChange={(checked) => {
                          const newSpaces = checked 
                            ? [...rule.affected_spaces, space]
                            : rule.affected_spaces.filter(s => s !== space);
                          updateRule(index, 'affected_spaces', newSpaces);
                        }}
                      />
                      <span>{space}</span>
                    </div>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-slate-600">and considering bookings scheduled at</span>
              
              <Select value={rule.consideration_time} onValueChange={(value) => updateRule(index, 'consideration_time', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {considerationTimeOptions.map(time => (
                    <SelectItem key={time} value={time.replace(' ', '_')}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {rule.consideration_time === 'specific_time' && (
                <>
                  <span className="text-slate-600">between</span>
                  <Select value={rule.time_range?.split('–')[0]} onValueChange={(value) => {
                    const endTime = rule.time_range?.split('–')[1] || '17:00';
                    updateRule(index, 'time_range', `${value}–${endTime}`);
                  }}>
                    <SelectTrigger className="w-24">
                      <SelectValue>{rule.time_range ? formatTimeDisplay(rule.time_range.split('–')[0]) : 'From'}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <span className="text-slate-600">and</span>
                  
                  <Select value={rule.time_range?.split('–')[1]} onValueChange={(value) => {
                    const startTime = rule.time_range?.split('–')[0] || '09:00';
                    updateRule(index, 'time_range', `${startTime}–${value}`);
                  }}>
                    <SelectTrigger className="w-24">
                      <SelectValue>{rule.time_range ? formatTimeDisplay(rule.time_range.split('–')[1]) : 'To'}</SelectValue>
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
                      <SelectValue>{getSelectedDays()}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {dayOptions.map(day => (
                        <div key={day} className="flex items-center space-x-2 p-2">
                          <Checkbox defaultChecked={true} />
                          <span>{day}</span>
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
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
