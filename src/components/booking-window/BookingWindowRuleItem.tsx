import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { BookingWindowRule } from "@/types/RuleResult";
import { getUserGroupText, getConstraintText } from "./utils/textHelpers";
import { getLogicValidation, getConstraintExplanation } from "./utils/validation";
import { getTimeDisplayHelper } from "./utils/unitConversion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";

interface BookingWindowRuleItemProps {
  rule: BookingWindowRule;
  onChange: (rule: BookingWindowRule) => void;
  availableTagOptions?: string[];
}

export function BookingWindowRuleItem({ 
  rule, 
  onChange, 
  availableTagOptions = [] 
}: BookingWindowRuleItemProps) {
  const updateRule = (updates: Partial<BookingWindowRule>) => {
    const updatedRule = { ...rule, ...updates };
    
    // Auto-adjust user_scope based on tags
    if ('tags' in updates) {
      if (updates.tags && updates.tags.length > 0) {
        updatedRule.user_scope = "users_with_tags";
      } else {
        updatedRule.user_scope = "all_users";
        updatedRule.tags = [];
      }
    }
    
    // Auto-adjust tags based on user_scope
    if ('user_scope' in updates) {
      if (updates.user_scope === "all_users") {
        updatedRule.tags = [];
      } else if (updates.user_scope === "users_with_tags" && (!updatedRule.tags || updatedRule.tags.length === 0)) {
        // Keep existing tags or initialize empty array for user to select
        updatedRule.tags = rule.tags || [];
      }
    }
    
    onChange(updatedRule);
  };

  const validation = getLogicValidation(rule);
  const timeDisplay = getTimeDisplayHelper(rule.value || 0, rule.unit || 'hours');

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        {/* User Group Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Who does this apply to?</Label>
          <Select
            value={rule.user_scope || "all_users"}
            onValueChange={(value) => updateRule({ user_scope: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_users">All users</SelectItem>
              <SelectItem value="users_with_tags">Users with any of the tags</SelectItem>
              <SelectItem value="users_with_no_tags">Users with none of the tags</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tag Selection - Show when user_scope requires tags */}
        {rule.user_scope && rule.user_scope !== "all_users" && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Tags</Label>
            <MultiSelect
              options={availableTagOptions}
              selected={rule.tags || []}
              onSelectionChange={(tags) => updateRule({ tags })}
              placeholder="Select tags..."
              className="w-full"
            />
            {rule.tags && rule.tags.length > 0 && (
              <div className="text-xs text-slate-600">
                Selected: {rule.tags.join(", ")}
              </div>
            )}
          </div>
        )}

        {/* Constraint Logic */}
        <div className="grid grid-cols-3 gap-2 items-end">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cannot book</Label>
            <Select
              value={rule.constraint || "less_than"}
              onValueChange={(value) => updateRule({ constraint: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="less_than">less than</SelectItem>
                <SelectItem value="more_than">more than</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Time Value</Label>
            <Input
              type="number"
              value={rule.value || ""}
              onChange={(e) => updateRule({ value: parseInt(e.target.value) || 0 })}
              placeholder="24"
              min="1"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Unit</Label>
            <Select
              value={rule.unit || "hours"}
              onValueChange={(value) => updateRule({ unit: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">hours</SelectItem>
                <SelectItem value="days">days</SelectItem>
                <SelectItem value="weeks">weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Time Display Helper */}
        {timeDisplay && (
          <div className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded">
            {timeDisplay}
          </div>
        )}

        {/* Spaces Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Applies to spaces</Label>
          <MultiSelect
            options={["all"]}
            selected={rule.spaces || ["all"]}
            onSelectionChange={(spaces) => updateRule({ spaces })}
            placeholder="Select spaces..."
            className="w-full"
          />
        </div>

        {/* Rule Description */}
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-700">
            <strong>{getUserGroupText(rule.user_scope || "all_users")}</strong>
            {rule.user_scope !== "all_users" && rule.tags && rule.tags.length > 0 && (
              <span className="text-blue-600 font-medium"> ({rule.tags.join(", ")})</span>
            )}
            {" "}cannot make a booking for {" "}
            <strong>{getConstraintText(rule.constraint || "less_than")} {rule.value} {rule.unit}</strong> in advance.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {getConstraintExplanation(rule.constraint || "less_than")}
          </p>
        </div>

        {/* Validation Warnings */}
        {validation && (
          <Alert variant={validation.type === 'warning' ? 'destructive' : 'default'}>
            {validation.type === 'warning' ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Info className="h-4 w-4" />
            )}
            <AlertDescription className="text-sm">
              {validation.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
