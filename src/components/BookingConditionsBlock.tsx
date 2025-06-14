
import { useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { BookingCondition, BookingConditionRule, RuleResult } from "@/types/RuleResult";
import { Info, Plus } from "lucide-react";
import { BookingConditionRow } from "./BookingConditionRow";
import { BookingConditionRuleRow } from "./BookingConditionRuleRow";
import { LogicOperatorButtons } from "./pricing/LogicOperatorButtons";
import { useConditionValidation } from "@/hooks/useConditionValidation";
import { useSpaceOptions } from "@/hooks/useSpaceOptions";
import { useTagOptions } from "@/hooks/useTagOptions";

interface BookingConditionsBlockProps {
  initialConditions?: BookingCondition[];
  ruleResult?: RuleResult;
}

// Feature flag for multi-row booking conditions
const BOOKING_COND_MULTI_ROW = true;

export function BookingConditionsBlock({ initialConditions = [], ruleResult }: BookingConditionsBlockProps) {
  // Migration: Convert legacy single conditions to new multi-row format
  const migrateCondition = (condition: BookingCondition): BookingCondition => {
    if (condition.rules) {
      return condition; // Already migrated
    }
    
    // Convert legacy format to new format
    return {
      space: condition.space,
      time_range: condition.time_range,
      days: condition.days,
      rules: [{
        condition_type: condition.condition_type || "duration",
        operator: condition.operator || "is_less_than",
        value: condition.value || "30min",
        explanation: condition.explanation || "Default condition"
      }],
      logic_operators: [],
      explanation: condition.explanation
    };
  };

  // Initialize conditions with proper data from initialConditions
  const [conditions, setConditions] = useState<BookingCondition[]>(() => {
    if (initialConditions.length > 0) {
      console.log('[BookingConditionsBlock] Using initialConditions:', initialConditions);
      return initialConditions.map(migrateCondition);
    }
    
    // Only use default if no initial conditions provided
    return [{
      space: ["Space 1"],
      time_range: "09:00–17:00", 
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      rules: [{
        condition_type: "duration",
        operator: "is_less_than",
        value: "30min",
        explanation: "Default booking condition"
      }],
      logic_operators: [],
      explanation: "Default booking condition"
    }];
  });
  
  const [logicOperators, setLogicOperators] = useState<string[]>(
    new Array(Math.max(0, conditions.length - 1)).fill("AND")
  );

  // Use the validation hook
  useConditionValidation(conditions);

  // Use dynamic space and tag options from the hooks
  const { spaceOptions } = useSpaceOptions(ruleResult);
  const { tagOptions } = useTagOptions(ruleResult);
  
  // Static options
  const timeOptions = Array.from({ length: 96 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });
  const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const durationValues = ["15min", "30min", "45min", "1h", "1h15min", "1h30min", "2h", "3h", "4h", "6h", "8h", "12h", "24h"];

  const updateCondition = (index: number, field: keyof BookingCondition, value: any) => {
    setConditions(prev => prev.map((condition, i) => 
      i === index ? { ...condition, [field]: value } : condition
    ));
  };

  const updateConditionRule = (conditionIndex: number, ruleIndex: number, field: keyof BookingConditionRule, value: any) => {
    setConditions(prev => prev.map((condition, i) => {
      if (i === conditionIndex && condition.rules) {
        const updatedRules = condition.rules.map((rule, j) => 
          j === ruleIndex ? { ...rule, [field]: value } : rule
        );
        return { ...condition, rules: updatedRules };
      }
      return condition;
    }));
  };

  const addConditionRule = (conditionIndex: number) => {
    setConditions(prev => prev.map((condition, i) => {
      if (i === conditionIndex && condition.rules) {
        const newRule: BookingConditionRule = {
          condition_type: "duration",
          operator: "is_less_than",
          value: "30min",
          explanation: "Additional condition"
        };
        return {
          ...condition,
          rules: [...condition.rules, newRule],
          logic_operators: [...(condition.logic_operators || []), "AND"]
        };
      }
      return condition;
    }));
  };

  const removeConditionRule = (conditionIndex: number, ruleIndex: number) => {
    setConditions(prev => prev.map((condition, i) => {
      if (i === conditionIndex && condition.rules && condition.rules.length > 1) {
        const newRules = condition.rules.filter((_, j) => j !== ruleIndex);
        const newLogicOperators = (condition.logic_operators || []).filter((_, j) => j !== ruleIndex && j !== ruleIndex - 1);
        return {
          ...condition,
          rules: newRules,
          logic_operators: newLogicOperators
        };
      }
      return condition;
    }));
  };

  const updateRuleLogicOperator = (conditionIndex: number, operatorIndex: number, operator: string) => {
    setConditions(prev => prev.map((condition, i) => {
      if (i === conditionIndex && condition.logic_operators) {
        const newOperators = [...condition.logic_operators];
        newOperators[operatorIndex] = operator;
        return { ...condition, logic_operators: newOperators };
      }
      return condition;
    }));
  };

  const updateLogicOperator = (index: number, operator: string) => {
    setLogicOperators(prev => prev.map((op, i) => i === index ? operator : op));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-800">Booking Conditions</h3>
        <div className="flex items-center gap-1 text-xs text-slate-500 bg-blue-50 px-2 py-1 rounded">
          <Info className="w-3 h-3" />
          <span>Defines when bookings are NOT ALLOWED</span>
        </div>
      </div>
      
      {conditions.map((condition, index) => (
        <div key={index}>
          <div className="bg-[#F1F3F5] p-6 sm:p-3 rounded-lg">
            {!BOOKING_COND_MULTI_ROW || !condition.rules ? (
              // Legacy single-row display
              <BookingConditionRow
                condition={condition}
                index={index}
                spaceOptions={spaceOptions}
                timeOptions={timeOptions}
                dayOptions={dayOptions}
                tagOptions={tagOptions}
                durationValues={durationValues}
                onConditionChange={updateCondition}
              />
            ) : (
              // New multi-row display
              <div className="space-y-4">
                {/* Condition header with space, time, and day selectors */}
                <BookingConditionRow
                  condition={condition}
                  index={index}
                  spaceOptions={spaceOptions}
                  timeOptions={timeOptions}
                  dayOptions={dayOptions}
                  tagOptions={tagOptions}
                  durationValues={durationValues}
                  onConditionChange={updateCondition}
                  hideConditionLogic={true}
                />

                {/* Rules section */}
                <div className="space-y-2">
                  {condition.rules.map((rule, ruleIndex) => (
                    <div key={ruleIndex}>
                      <BookingConditionRuleRow
                        rule={rule}
                        index={ruleIndex}
                        tagOptions={tagOptions}
                        durationValues={durationValues}
                        canDelete={condition.rules!.length > 1}
                        onRuleChange={(ruleIdx, field, value) => updateConditionRule(index, ruleIdx, field, value)}
                        onDelete={(ruleIdx) => removeConditionRule(index, ruleIdx)}
                      />
                      
                      {ruleIndex < condition.rules!.length - 1 && (
                        <LogicOperatorButtons
                          index={ruleIndex}
                          totalRules={condition.rules!.length}
                          onUpdateLogicOperator={(opIndex, operator) => updateRuleLogicOperator(index, opIndex, operator)}
                        />
                      )}
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addConditionRule(index)}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add condition
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {index < conditions.length - 1 && (
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
