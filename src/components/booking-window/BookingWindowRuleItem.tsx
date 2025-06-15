
import { normalizeTags } from "@/utils/tagHelpers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BookingWindowRule } from "@/types/RuleResult";
import { HelpCircle, AlertTriangle } from "lucide-react";
import { normalizeAdvanceUnit, convertFromHours, getTimeDisplayHelper } from "./utils/unitConversion";
import { getLogicValidation, getConstraintExplanation } from "./utils/validation";
import { getUserGroupText, getConstraintText } from "./utils/textHelpers";
import { BookingWindowRow } from "./BookingWindowRow";
import { useEffect, useState, useRef } from "react";

interface BookingWindowRuleItemProps {
  rule: BookingWindowRule;
  onRuleUpdate: (field: keyof BookingWindowRule, value: any) => void;
  spaceOptions: string[];
  tagOptions: string[];
}

export function BookingWindowRuleItem({ 
  rule, 
  onRuleUpdate, 
  spaceOptions, 
  tagOptions 
}: BookingWindowRuleItemProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const validation = getLogicValidation(rule);
  
  // Track if the user manually changed the scope
  const manualScopeChangeRef = useRef(false);
  const previousTagsRef = useRef<string[]>([]);

  // Update selected tags when rule.tags or tagOptions changes
  useEffect(() => {
    console.log('[BookingWindowRuleItem] useEffect triggered:', {
      ruleTags: rule.tags,
      ruleUserScope: rule.user_scope,
      tagOptionsLength: tagOptions.length,
      manualScopeChange: manualScopeChangeRef.current
    });

    if (rule.tags && rule.tags.length > 0) {
      const normalized = normalizeTags(rule.tags);
      const validTags = normalized.filter(tag => 
        tagOptions.some(option => 
          typeof option === 'string' && option.toLowerCase() === tag.toLowerCase()
        )
      );
      setSelectedTags(validTags);
      
      // If we have valid tags but the scope is not set to users_with_tags, update it
      // BUT only if this wasn't a manual scope change
      if (validTags.length > 0 && rule.user_scope !== 'users_with_tags' && !manualScopeChangeRef.current) {
        console.log('[BookingWindowRuleItem] Auto-updating scope to users_with_tags due to valid tags');
        onRuleUpdate('user_scope', 'users_with_tags');
      }
      
      // If we have invalid tags, update the rule
      if (validTags.length !== normalized.length) {
        console.log('[BookingWindowRuleItem] Updating rule with valid tags only');
        onRuleUpdate('tags', validTags);
      }
    } else {
      setSelectedTags([]);
      
      // Only auto-revert to all_users if:
      // 1. The user had tags before and they were just cleared (not a manual scope change)
      // 2. OR if the scope was programmatically set to a tag-based scope but there are no tags
      const hadTagsBefore = previousTagsRef.current.length > 0;
      const isTagBasedScope = rule.user_scope === 'users_with_tags' || rule.user_scope === 'users_with_no_tags';
      
      if (hadTagsBefore && !manualScopeChangeRef.current && isTagBasedScope) {
        console.log('[BookingWindowRuleItem] Auto-reverting scope to all_users due to cleared tags');
        onRuleUpdate('user_scope', 'all_users');
      }
    }

    // Update the previous tags reference
    previousTagsRef.current = rule.tags || [];
    
    // Reset manual scope change flag after processing
    if (manualScopeChangeRef.current) {
      manualScopeChangeRef.current = false;
    }
  }, [rule.tags, tagOptions, onRuleUpdate, rule.user_scope]);

  const handleTagSelection = (selected: string[]) => {
    console.log('[BookingWindowRuleItem] Tag selection changed:', selected);
    setSelectedTags(selected);
    onRuleUpdate('tags', selected);
  };

  const handleScopeChange = (newScope: string) => {
    console.log('[BookingWindowRuleItem] Manual scope change:', newScope);
    // Mark this as a manual scope change
    manualScopeChangeRef.current = true;
    onRuleUpdate('user_scope', newScope);
  };

  const handleUnitChange = (newUnit: "hours" | "days" | "weeks") => {
    const valueInHours = normalizeAdvanceUnit(rule.value || 72, rule.unit || 'hours');
    const newValue = convertFromHours(valueInHours, newUnit);
    onRuleUpdate('value', newValue);
    onRuleUpdate('unit', newUnit);
  };

  // Row 1 Content: User scope selector and tags (if applicable)
  const row1Content = (
    <div className="flex gap-2 items-center">
      <Select value={rule.user_scope || 'all_users'} onValueChange={handleScopeChange}>
        <SelectTrigger className="min-w-[160px] h-10">
          <SelectValue>
            {getUserGroupText(rule.user_scope || 'all_users')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="z-50">
          <SelectItem value="all_users">all users</SelectItem>
          <SelectItem value="users_with_tags">users with any of the tags</SelectItem>
          <SelectItem value="users_with_no_tags">users with none of the tags</SelectItem>
        </SelectContent>
      </Select>
      
      {(rule.user_scope === "users_with_tags" || rule.user_scope === "users_with_no_tags") && (
        <MultiSelect
          options={tagOptions}
          selected={selectedTags}
          onSelectionChange={handleTagSelection}
          placeholder="Select tags"
          className="min-w-0 max-w-[200px] flex-1"
        />
      )}
    </div>
  );

  // Rest of the component remains the same...
  const row3Content = (
    <div className="flex gap-2 items-center w-full">
      <div className="flex-1">
        <MultiSelect
          options={spaceOptions}
          selected={rule.spaces || []}
          onSelectionChange={(selected) => onRuleUpdate('spaces', selected)}
          placeholder="Select spaces"
          className="min-w-0 w-full"
        />
      </div>
      
      <div className="flex-1 flex items-center gap-1">
        <Select value={rule.constraint || 'less_than'} onValueChange={(value) => onRuleUpdate('constraint', value)}>
          <SelectTrigger className="w-full h-10">
            <SelectValue>
              {getConstraintText(rule.constraint || 'less_than')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="z-50">
            <SelectItem value="less_than">less than</SelectItem>
            <SelectItem value="more_than">more than</SelectItem>
          </SelectContent>
        </Select>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-slate-400 hover:text-slate-600 flex-shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[350px]">
              <div className="text-xs space-y-2">
                <div><strong>less than:</strong> {getConstraintExplanation('less_than')}</div>
                <div><strong>more than:</strong> {getConstraintExplanation('more_than')}</div>
                <div className="pt-1 border-t border-slate-200">
                  <div><strong>Example:</strong> "Coaches must book at least 24h in advance" = less than 24h</div>
                  <div><strong>Example:</strong> "No more than 48h in advance" = more than 48h</div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex-1 flex items-center gap-1">
        <input 
          type="number" 
          value={rule.value || 72} 
          onChange={(e) => onRuleUpdate('value', parseInt(e.target.value) || 0)}
          className="w-full px-2 py-2 border border-input rounded-md text-sm h-10 text-right"
          placeholder="72"
        />
        
        {getTimeDisplayHelper(rule.value || 72, rule.unit || 'hours') && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-slate-500 cursor-help flex-shrink-0">
                  {getTimeDisplayHelper(rule.value || 72, rule.unit || 'hours')}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="text-xs">
                  Time conversion helper
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="flex-1">
        <Select 
          value={rule.unit || 'hours'} 
          onValueChange={(value: "hours" | "days" | "weeks") => handleUnitChange(value)}
        >
          <SelectTrigger className="w-full h-10">
            <SelectValue>
              {rule.unit || 'hours'} in advance
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="z-50">
            <SelectItem value="hours">hours in advance</SelectItem>
            <SelectItem value="days">days in advance</SelectItem>
            <SelectItem value="weeks">weeks in advance</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
      <BookingWindowRow
        row1Content={row1Content}
        row3Content={row3Content}
      />
      
      {rule.explanation && (
        <div className="text-xs text-slate-600 bg-white p-2 rounded border mt-3">
          <strong>Explanation:</strong> {rule.explanation}
        </div>
      )}

      {validation && (
        <div className={`text-xs p-2 rounded border mt-2 flex items-center gap-2 ${
          validation.type === 'warning' 
            ? 'text-orange-600 bg-orange-50 border-orange-200' 
            : 'text-blue-600 bg-blue-50 border-blue-200'
        }`}>
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          <span><strong>Logic Check:</strong> {validation.message}</span>
        </div>
      )}

      <div className="text-xs text-slate-500 bg-slate-100 p-2 rounded border mt-2">
        <strong>Rule Logic:</strong> {getConstraintExplanation(rule.constraint || 'less_than')}
      </div>
    </div>
  );
}
