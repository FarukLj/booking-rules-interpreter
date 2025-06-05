
import { splitTimeRange, formatTime } from './timeRange';
import { RuleResult } from '@/types/RuleResult';

export function normalizeTemplate(rulesJson: any): RuleResult {
  // Create a copy to avoid mutating the original
  const json = JSON.parse(JSON.stringify(rulesJson));

  // Inject from_time and to_time from time_range
  const injectTimeFields = (ruleArray: any[] = []) => {
    return ruleArray.map(rule => {
      if (rule.time_range && (!rule.from_time || !rule.to_time)) {
        const [fromTime, toTime] = splitTimeRange(rule.time_range);
        return {
          ...rule,
          from_time: fromTime ? formatTime(fromTime) : null,
          to_time: toTime ? formatTime(toTime) : null
        };
      }
      return rule;
    });
  };

  // Apply time field injection to all rule types
  json.pricing_rules = injectTimeFields(json.pricing_rules);
  json.booking_conditions = injectTimeFields(json.booking_conditions);
  json.quota_rules = injectTimeFields(json.quota_rules);
  json.buffer_time_rules = injectTimeFields(json.buffer_time_rules);
  json.booking_window_rules = injectTimeFields(json.booking_window_rules);
  json.space_sharing = json.space_sharing || [];

  // Synthesize setup_guide for library mode
  if (!Array.isArray(json.setup_guide)) {
    json.setup_guide = [];
  }

  const addSetupStep = (ruleKey: string, stepKey: string, title: string) => {
    if (json[ruleKey]?.length && !json.setup_guide.some((s: any) => s.step_key === stepKey)) {
      json.setup_guide.push({
        step_key: stepKey,
        title: `Step: ${title}`,
        instruction: 'Configure these rule blocks in your booking system',
        rule_blocks: json[ruleKey]
      });
    }
  };

  // Add steps for each rule type that has data
  addSetupStep('pricing_rules', 'pricing_rules', 'Pricing Rules');
  addSetupStep('booking_conditions', 'booking_conditions', 'Booking Conditions');
  addSetupStep('quota_rules', 'quota_rules', 'Quota Rules');
  addSetupStep('buffer_time_rules', 'buffer_time_rules', 'Buffer Time Rules');
  addSetupStep('booking_window_rules', 'booking_window_rules', 'Booking Window Rules');
  addSetupStep('space_sharing', 'space_sharing', 'Space Sharing Rules');

  return json as RuleResult;
}
