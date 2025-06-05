
import { useEffect } from "react";
import { BookingCondition } from "@/types/RuleResult";

export function useConditionValidation(conditions: BookingCondition[]) {
  useEffect(() => {
    conditions.forEach((condition, index) => {
      if (condition.condition_type === "user_tags") {
        const tags = Array.isArray(condition.value) ? condition.value : [];
        const operator = condition.operator;
        
        // Validation: Check for double-negative logic
        if (operator === "contains_none_of" && tags.length > 3) {
          console.warn(`Condition ${index}: Detected potential double-negative logic. 'contains_none_of' should typically have 1-2 specific allowed tags, not a complement set.`);
        }
        
        // Validation: Ensure correct exclusive access logic
        if (operator === "contains_none_of" && tags.length === 1) {
          console.log(`Condition ${index}: Correct exclusive access logic - blocks users without ${tags[0]}`);
        }
        
        if (operator === "contains_any_of" && tags.length === 1) {
          console.log(`Condition ${index}: Correct inclusive access logic - blocks users with ${tags[0]}`);
        }
      }
    });
  }, [conditions]);
}
