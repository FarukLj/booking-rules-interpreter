
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BookingWindowRule } from "@/types/RuleResult";
import { HelpCircle, AlertTriangle } from "lucide-react";
import { normalizeAdvanceUnit, convertFromHours, getTimeDisplayHelper } from "./utils/unitConversion";
import { getLogicValidation, getConstraintExplanation } from "./utils/validation";
import { getUserGroupText, getConstraintText } from "./utils/textHelpers";
import { BookingWindowRow } from "./BookingWindowRow";
import { normalizeTagsToNames, validateSelectedTags } from "@/utils/tagHelpers";

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
  const validation = getLogicValidation(rule);

  console.log('[BookingWindowRuleItem] Rendering rule:', rule);
  console.log('[BookingWindowRuleItem] Available tag options:', tagOptions);
  console.log('[BookingWindowRuleItem] Rule tags raw:', rule.tags);

  // Normalize tags to string names and validate them
  const normalizedTags = rule.tags ? normalizeTagsToNames(rule.tags) : [];
  const validatedTags = validateSelectedTags(normalizedTags, tagOptions);
  
  console.log('[BookingWindowRuleItem] Normalized tags:', normalizedTags);
  console.log('[BookingWindowRuleItem] Validated tags:', validatedTags);

  const handleUnitChange = (newUnit: "hours" | "days" | "weeks") => {
    // Convert current value to hours, then to new unit
    const valueInHours = normalizeAdvanceUnit(rule.value || 72, rule.unit || 'hours');
    const newValue = convertFromHours(valueInHours, newUnit);
    
    console.log(`[Unit Conversion] ${rule.value} ${rule.unit} -> ${newValue} ${newUnit} (${valueInHours}h internal)`);
    
    onRuleUpdate('value', newValue);
    onRuleUpdate('unit', newUnit);
  };

  const handleTagSelectionChange = (selected: string[]) => {
    console.log('[BookingWindowRuleItem] Tag selection changed:', selected);
    onRuleUpdate('tags', selected);
  };

  // Row 1 Content: User scope selector and tags (if applicable)
  const row1Content = (
    <div className="flex gap-2 items-center">
      <Select value={rule.user_scope || 'all_users'} onValueChange={(value) => onRuleUpdate('user_scope', value)}>
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
          selected={validatedTags}
          onSelectionChange={handleTagSelectionChange}
          placeholder="Select tags"
          className="min-w-0 max-w-[200px]"
        />
      )}
    </div>
  );

  // Row 3 Content: All 4 components in a single flex container with equal width
  const row3Content = (
    <div className="flex gap-2 items-center w-full">
      {/* Spaces selector */}
      <div className="flex-1">
        <MultiSelect
          options={spaceOptions}
          selected={rule.spaces || []}
          onSelectionChange={(selected) => onRuleUpdate('spaces', selected)}
          placeholder="Select spaces"
          className="min-w-0 w-full"
        />
      </div>
      
      {/* Operator selector with help icon */}
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

      {/* Number input with time helper */}
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

      {/* Unit selector */}
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

      {/* Enhanced validation feedback */}
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

      {/* Semantic explanation */}
      <div className="text-xs text-slate-500 bg-slate-100 p-2 rounded border mt-2">
        <strong>Rule Logic:</strong> {getConstraintExplanation(rule.constraint || 'less_than')}
      </div>

      {/* Debug information for missing tags */}
      {normalizedTags.length !== validatedTags.length && (
        <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border mt-2">
          <strong>Debug:</strong> Some tags were not found in options. Raw tags: {JSON.stringify(rule.tags)}, Available: {JSON.stringify(tagOptions)}
        </div>
      )}
    </div>
  );
}
