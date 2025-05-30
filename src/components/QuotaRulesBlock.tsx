
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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

  const targetOptions = ["individuals", "individuals_with_tags", "group_with_tag"];
  const quotaTypeOptions = ["time", "count"];
  const periodOptions = ["day", "week", "month", "at_any_time"];
  const spaceOptions = ["Space 1", "Space 2", "Conference Room A", "Studio 3", "Meeting Room B"];
  const considerationTimeOptions = ["any_time", "specific_time"];
  const tagOptions = ["Member", "VIP", "Premium", "Basic", "Staff"];

  const updateRule = (index: number, field: keyof QuotaRule, value: any) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, [field]: value } : rule
    ));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Quota Rules</h3>
      
      {rules.map((rule, index) => (
        <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Select value={rule.target} onValueChange={(value) => updateRule(index, 'target', value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targetOptions.map(target => (
                  <SelectItem key={target} value={target}>{target.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(rule.target === "individuals_with_tags" || rule.target === "group_with_tag") && (
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
            
            <span className="text-slate-600">can</span>
            
            <Select value={rule.quota_type} onValueChange={(value) => updateRule(index, 'quota_type', value)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quotaTypeOptions.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <span className="text-slate-600">up to</span>
            
            <Input 
              value={rule.value.toString()} 
              onChange={(e) => updateRule(index, 'value', rule.quota_type === 'time' ? e.target.value : parseInt(e.target.value) || 0)}
              className="w-20"
              placeholder={rule.quota_type === 'time' ? '5h' : '3'}
            />
            
            <span className="text-slate-600">per</span>
            
            <Select value={rule.period} onValueChange={(value) => updateRule(index, 'period', value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map(period => (
                  <SelectItem key={period} value={period}>{period.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <span className="text-slate-600">in</span>
            
            <Select 
              value={rule.affected_spaces[0]} 
              onValueChange={(value) => updateRule(index, 'affected_spaces', [value])}
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
            
            <span className="text-slate-600">during</span>
            
            <Select value={rule.consideration_time} onValueChange={(value) => updateRule(index, 'consideration_time', value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {considerationTimeOptions.map(time => (
                  <SelectItem key={time} value={time}>{time.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {rule.consideration_time === 'specific_time' && (
              <Input 
                value={rule.time_range || ''} 
                onChange={(e) => updateRule(index, 'time_range', e.target.value)}
                className="w-32"
                placeholder="9am - 5pm"
              />
            )}
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
