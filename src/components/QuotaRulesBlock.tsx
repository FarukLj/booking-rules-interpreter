
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Toggle } from "@/components/ui/toggle";
import { QuotaRule } from "@/types/RuleResult";
import { LinkSelect } from "@/components/ui/LinkSelect";

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

  const hourOptions = Array.from({ length: 101 }, (_, i) => `${i}h`);
  const minuteOptions = ["0m", "15m", "30m", "45m"];

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

  const getUserSelectorText = (target: string) => {
    switch (target) {
      case "individuals": return "individuals";
      case "individuals_with_tags": return "individuals with any of the tags";
      case "individuals_with_no_tags": return "individuals with none of the tags";
      case "group_with_tag": return "group of users with the tag";
      default: return "individuals";
    }
  };

  const shouldShowTagsDropdown = (target: string) => {
    return target === "individuals_with_tags" || target === "individuals_with_no_tags" || target === "group_with_tag";
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Quota Rules</h3>
      
      {rules.map((rule, index) => (
        <div key={index}>
          <div className="bg-[#F1F3F5] p-4 sm:p-3 rounded-lg dark:bg-slate-800">
            {/* Row 1: "Limit" string - full width */}
            <div className="flex items-center text-sm text-slate-600 mb-3">
              <span>Limit</span>
            </div>

            {/* Row 2: User target selector and tags dropdown - full width, equal distribution */}
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <Select value={rule.target || 'individuals'} onValueChange={(value) => updateRule(index, 'target', value)}>
                <SelectTrigger className="flex-1 h-10">
                  <SelectValue>
                    {getUserSelectorText(rule.target || 'individuals')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="individuals">individuals</SelectItem>
                  <SelectItem value="individuals_with_tags">individuals with any of the tags</SelectItem>
                  <SelectItem value="individuals_with_no_tags">individuals with none of the tags</SelectItem>
                  <SelectItem value="group_with_tag">group of users with the tag</SelectItem>
                </SelectContent>
              </Select>
              
              {shouldShowTagsDropdown(rule.target || 'individuals') && (
                <div className="flex-1">
                  <MultiSelect
                    options={tagOptions}
                    selected={rule.tags || []}
                    onSelectionChange={(selected) => updateRule(index, 'tags', selected)}
                    placeholder="Select tags"
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Row 3: "to a per-user" string - full width */}
            <div className="flex items-center text-sm text-slate-600 mb-3">
              <span>to a per-user</span>
            </div>

            {/* Row 4: Quota type selector - max-width 320px */}
            <div className="flex items-center mb-3">
              <Select value={rule.quota_type || 'time'} onValueChange={(value) => updateRule(index, 'quota_type', value)}>
                <SelectTrigger className="max-w-[320px] h-10">
                  <SelectValue>
                    {rule.quota_type === "time" ? "time-usage maximum" : "booking-count maximum"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="time">time-usage maximum</SelectItem>
                  <SelectItem value="count">booking-count maximum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 5: "of" string - full width */}
            <div className="flex items-center text-sm text-slate-600 mb-3">
              <span>of</span>
            </div>

            {/* Row 6: Hour, minute, period, and space selectors - full width, equal distribution */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {rule.quota_type === "time" ? (
                <>
                  <Select 
                    value={typeof rule.value === 'string' && rule.value.includes('h') ? rule.value.split('h')[0] + 'h' : '2h'} 
                    onValueChange={(hours) => {
                      const currentMinutes = typeof rule.value === 'string' && rule.value.includes('m') ? 
                        rule.value.split('h')[1] || '0m' : '0m';
                      updateRule(index, 'value', `${hours}${currentMinutes !== '0m' ? currentMinutes : ''}`);
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue>
                        {typeof rule.value === 'string' && rule.value.includes('h') ? 
                          rule.value.split('h')[0] + 'h' : '2h'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      {hourOptions.map(hour => (
                        <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select 
                    value={typeof rule.value === 'string' && rule.value.includes('m') ? 
                      rule.value.split('h')[1] || '0m' : '0m'} 
                    onValueChange={(minutes) => {
                      const currentHours = typeof rule.value === 'string' && rule.value.includes('h') ? 
                        rule.value.split('h')[0] + 'h' : '2h';
                      updateRule(index, 'value', `${currentHours}${minutes !== '0m' ? minutes : ''}`);
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue>
                        {typeof rule.value === 'string' && rule.value.includes('m') ? 
                          rule.value.split('h')[1] || '0m' : '0m'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      {minuteOptions.map(minute => (
                        <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <>
                  <input 
                    type="number" 
                    value={typeof rule.value === 'number' ? rule.value : 5} 
                    onChange={(e) => updateRule(index, 'value', parseInt(e.target.value) || 0)}
                    className="px-2 py-2 border border-input rounded-md text-sm h-10"
                    placeholder="5"
                  />
                  <div></div>
                </>
              )}
              
              <Select value={rule.period || 'day'} onValueChange={(value) => updateRule(index, 'period', value)}>
                <SelectTrigger className="h-10">
                  <SelectValue>
                    {rule.period === 'day' ? 'per day' :
                     rule.period === 'week' ? 'per week' :
                     rule.period === 'month' ? 'per calendar month' :
                     'at any given moment'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="day">per day</SelectItem>
                  <SelectItem value="week">per week</SelectItem>
                  <SelectItem value="month">per calendar month</SelectItem>
                  <SelectItem value="at_any_time">at any given moment</SelectItem>
                </SelectContent>
              </Select>
              
              <MultiSelect
                options={spaceOptions}
                selected={rule.affected_spaces || []}
                onSelectionChange={(selected) => updateRule(index, 'affected_spaces', selected)}
                placeholder="Select spaces"
                className="w-full"
              />
            </div>

            {/* Row 7: "and considering bookings scheduled at" string - full width */}
            <div className="flex items-center text-sm text-slate-600 mb-3">
              <span>and considering bookings scheduled at</span>
            </div>

            {/* Row 8: Consideration time selector - max-width 320px */}
            <div className="flex items-center mb-3">
              <Select value={rule.consideration_time || 'any_time'} onValueChange={(value) => updateRule(index, 'consideration_time', value)}>
                <SelectTrigger className="max-w-[320px] h-10">
                  <SelectValue>
                    {rule.consideration_time === "any_time" ? "any time of week" : "only specific time"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="any_time">any time of week</SelectItem>
                  <SelectItem value="specific_time">only specific time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {rule.consideration_time === "specific_time" && (
              <div className="flex flex-wrap items-center gap-2 text-sm mb-3">
                <LinkSelect 
                  value={rule.time_range?.split('–')[0] || '09:00'}
                  onValueChange={(value) => {
                    const endTime = rule.time_range?.split('–')[1] || '17:00';
                    updateRule(index, 'time_range', `${value}–${endTime}`);
                  }}
                >
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
                  ))}
                </LinkSelect>
                
                <span className="text-slate-600">to</span>
                <LinkSelect 
                  value={rule.time_range?.split('–')[1] || '17:00'}
                  onValueChange={(value) => {
                    const startTime = rule.time_range?.split('–')[0] || '09:00';
                    updateRule(index, 'time_range', `${startTime}–${value}`);
                  }}
                >
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
                  ))}
                </LinkSelect>
                
                <span className="text-slate-600">on</span>
                <MultiSelect
                  options={dayOptions}
                  selected={rule.days || []}
                  onSelectionChange={(selected) => updateRule(index, 'days', selected)}
                  placeholder="Select days"
                  className="min-w-0 max-w-[200px]"
                  abbreviateDays={true}
                />
              </div>
            )}
            
            {rule.explanation && (
              <div className="text-xs text-slate-600 bg-white p-2 rounded border dark:bg-slate-700 dark:text-slate-300">
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
