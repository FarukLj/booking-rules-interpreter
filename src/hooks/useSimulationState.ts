
import { useState, useEffect, useMemo } from "react";
import { RuleResult } from "@/types/RuleResult";
import { RuleEvaluationEngine, SimulationInput, SimulationResult } from "@/lib/ruleEvaluationEngine";

export function useSimulationState(rules: RuleResult) {
  // Form state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("10:00");

  // Results state
  const [simulationResult, setSimulationResult] = useState<SimulationResult>({ allowed: true });

  // Create evaluation engine
  const evaluationEngine = useMemo(() => new RuleEvaluationEngine(rules), [rules]);

  // Extract available tags from rules
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    
    // Extract from booking conditions
    if (rules.booking_conditions && Array.isArray(rules.booking_conditions)) {
      rules.booking_conditions.forEach(condition => {
        if (condition.condition_type === "user_tags" && Array.isArray(condition.value)) {
          condition.value.forEach(tag => tags.add(tag));
        }
        if (condition.rules && Array.isArray(condition.rules)) {
          condition.rules.forEach(rule => {
            if (rule.condition_type === "user_tags" && Array.isArray(rule.value)) {
              rule.value.forEach(tag => tags.add(tag));
            }
          });
        }
      });
    }

    // Extract from pricing rules
    if (rules.pricing_rules && Array.isArray(rules.pricing_rules)) {
      rules.pricing_rules.forEach(rule => {
        if (rule.condition_type === "user_tags" && Array.isArray(rule.value)) {
          rule.value.forEach(tag => tags.add(tag));
        }
      });
    }

    // Extract from quota rules
    if (rules.quota_rules && Array.isArray(rules.quota_rules)) {
      rules.quota_rules.forEach(rule => {
        if (rule.tags && Array.isArray(rule.tags)) {
          rule.tags.forEach(tag => tags.add(tag));
        }
      });
    }

    // Extract from booking window rules
    if (rules.booking_window_rules && Array.isArray(rules.booking_window_rules)) {
      rules.booking_window_rules.forEach(rule => {
        if (rule.tags && Array.isArray(rule.tags)) {
          rule.tags.forEach(tag => tags.add(tag));
        }
      });
    }

    return ["Anonymous", ...Array.from(tags)];
  }, [rules]);

  // Extract available spaces from rules
  const availableSpaces = useMemo(() => {
    const spaces = new Set<string>();
    
    // Extract from all rule types
    if (rules.booking_conditions && Array.isArray(rules.booking_conditions)) {
      rules.booking_conditions.forEach(condition => {
        if (condition.space && Array.isArray(condition.space)) {
          condition.space.forEach(space => spaces.add(space));
        }
      });
    }

    if (rules.pricing_rules && Array.isArray(rules.pricing_rules)) {
      rules.pricing_rules.forEach(rule => {
        if (rule.space && Array.isArray(rule.space)) {
          rule.space.forEach(space => spaces.add(space));
        }
      });
    }

    if (rules.quota_rules && Array.isArray(rules.quota_rules)) {
      rules.quota_rules.forEach(rule => {
        if (rule.affected_spaces && Array.isArray(rule.affected_spaces)) {
          rule.affected_spaces.forEach(space => spaces.add(space));
        }
      });
    }

    if (rules.booking_window_rules && Array.isArray(rules.booking_window_rules)) {
      rules.booking_window_rules.forEach(rule => {
        if (rule.spaces && Array.isArray(rule.spaces)) {
          rule.spaces.forEach(space => spaces.add(space));
        }
      });
    }

    return Array.from(spaces);
  }, [rules]);

  // Set initial values when rules change
  useEffect(() => {
    if (availableSpaces.length > 0 && !selectedSpace) {
      setSelectedSpace(availableSpaces[0]);
    }
  }, [availableSpaces, selectedSpace]);

  // Re-evaluate when any input changes
  useEffect(() => {
    if (!selectedSpace) return;

    const input: SimulationInput = {
      userTags: selectedTags.includes("Anonymous") ? [] : selectedTags,
      space: selectedSpace,
      date: selectedDate,
      startTime,
      endTime
    };

    const result = evaluationEngine.evaluate(input);
    setSimulationResult(result);
  }, [selectedTags, selectedSpace, selectedDate, startTime, endTime, evaluationEngine]);

  // Generate time options (15-minute increments)
  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  }, []);

  const resetSimulation = () => {
    setSelectedTags([]);
    setSelectedSpace(availableSpaces[0] || "");
    setSelectedDate(new Date());
    setStartTime("09:00");
    setEndTime("10:00");
  };

  const selectTag = (tag: string) => {
    setSelectedTags([tag]); // Only one tag at a time
  };

  return {
    // State
    selectedTags,
    selectedSpace,
    selectedDate,
    startTime,
    endTime,
    simulationResult,
    
    // Derived data
    availableTags,
    availableSpaces,
    timeOptions,
    
    // Actions
    selectTag,
    setSelectedSpace,
    setSelectedDate,
    setStartTime,
    setEndTime,
    resetSimulation
  };
}
