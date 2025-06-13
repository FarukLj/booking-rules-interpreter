
import { useMemo } from "react";
import { RuleResult } from "@/types/RuleResult";

export function useTagOptions(ruleResult?: RuleResult) {
  const tagOptions = useMemo(() => {
    const hardcodedTags = [
      "Public", "The Team", "Premium Members", "Gold Members", "Basic", 
      "VIP", "Staff", "Instructor", "Pro Member", "Visitor", "Coaches"
    ];
    
    if (!ruleResult) {
      console.log('[useTagOptions] No ruleResult provided, using hardcoded tags only');
      return hardcodedTags;
    }

    console.log('[useTagOptions] Processing ruleResult:', ruleResult);

    const extractedTags = new Set<string>();

    // Extract tags from booking conditions
    if (ruleResult.booking_conditions) {
      ruleResult.booking_conditions.forEach(condition => {
        if (condition.condition_type === "user_tags" && Array.isArray(condition.value)) {
          condition.value.forEach(tag => {
            if (typeof tag === 'string') {
              extractedTags.add(tag);
            }
          });
        }
      });
    }

    // Extract tags from pricing rules
    if (ruleResult.pricing_rules) {
      ruleResult.pricing_rules.forEach(rule => {
        if (rule.condition_type === "user_tags" && Array.isArray(rule.value)) {
          rule.value.forEach(tag => {
            if (typeof tag === 'string') {
              extractedTags.add(tag);
            }
          });
        }
        // Check sub-conditions too
        if (rule.sub_conditions) {
          rule.sub_conditions.forEach(subCondition => {
            if (subCondition.condition_type === "user_tags" && Array.isArray(subCondition.value)) {
              subCondition.value.forEach(tag => {
                if (typeof tag === 'string') {
                  extractedTags.add(tag);
                }
              });
            }
          });
        }
      });
    }

    // Extract tags from quota rules
    if (ruleResult.quota_rules) {
      ruleResult.quota_rules.forEach(rule => {
        if (rule.tags && Array.isArray(rule.tags)) {
          rule.tags.forEach(tag => {
            if (typeof tag === 'string') {
              extractedTags.add(tag);
            }
          });
        }
      });
    }

    // Extract tags from booking window rules - WITH PROPER TYPE GUARDS
    if (ruleResult.booking_window_rules) {
      console.log('[useTagOptions] Extracting from booking_window_rules:', ruleResult.booking_window_rules);
      ruleResult.booking_window_rules.forEach(rule => {
        console.log('[useTagOptions] Processing booking window rule:', rule);
        if (rule.tags && Array.isArray(rule.tags)) {
          rule.tags.forEach(tag => {
            console.log('[useTagOptions] Found tag in booking window rule:', tag);
            if (typeof tag === 'string') {
              extractedTags.add(tag);
            } else if (tag && typeof tag === 'object' && tag !== null && 'name' in tag && typeof tag.name === 'string') {
              // Proper type guard for {id, name} format
              extractedTags.add(tag.name);
            }
          });
        }
      });
    }

    // Combine hardcoded and extracted tags, removing duplicates
    const allTags = [...new Set([...hardcodedTags, ...extractedTags])];
    
    console.log('[useTagOptions] Extracted tags from RuleResult:', Array.from(extractedTags));
    console.log('[useTagOptions] Final tag options:', allTags);
    
    return allTags;
  }, [ruleResult]);

  return { tagOptions };
}
