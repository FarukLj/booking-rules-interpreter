
export interface TimeObject {
  hour: number;
  minute: number;
}

/**
 * Convert "17:00-23:00", "5pm–11pm", "5 PM - 11 PM" to two objects
 * @returns [ {hour:number, minute:number}, {hour:number, minute:number} ]
 */
export function splitTimeRange(str: string): [TimeObject | null, TimeObject | null] {
  if (!str) return [null, null];
  
  // Normalize: replace em-dash, en-dash, or "to" with hyphen, remove spaces
  const normalized = str.trim()
    .replace(/—|–|\s+to\s+/gi, '-')
    .replace(/\s+/g, '');
  
  const parts = normalized.split('-');
  if (parts.length !== 2) return [null, null];
  
  const [rawStart, rawEnd] = parts;
  return [parseTime(rawStart), parseTime(rawEnd)];
}

function parseTime(timeStr: string): TimeObject | null {
  if (!timeStr) return null;
  
  // Match patterns like: 17:00, 5pm, 5:00PM, 05:00am, 17, 5
  const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  
  const [, hourStr, minuteStr = '00', ampm] = match;
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  
  // Handle 12-hour format conversion
  if (ampm) {
    const isPM = /pm/i.test(ampm);
    if (isPM && hour !== 12) {
      hour += 12;
    } else if (!isPM && hour === 12) {
      hour = 0;
    }
  }
  
  // Validate hour and minute ranges
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  
  return { hour, minute };
}

export function formatTimeDisplay(timeObj: TimeObject): string {
  if (!timeObj) return '';
  
  const { hour, minute } = timeObj;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

export function timeObjectToTimeString(timeObj: TimeObject): string {
  if (!timeObj) return '';
  
  const { hour, minute } = timeObj;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Template normalization utility - injects from_time / to_time for template compatibility
 */
export function normalizeTemplateRules(json: any): any {
  if (!json) return json;

  console.log('normalizeTemplateRules: Processing template JSON');

  // Helper to process any array that might hold time_range
  const injectTimes = (arr: any[] = []) => {
    return arr.map((rule: any) => {
      if (rule.time_range && (!rule.from_time || !rule.to_time)) {
        console.log(`normalizeTemplateRules: Processing time_range "${rule.time_range}"`);
        const [from, to] = splitTimeRange(rule.time_range);
        if (from && to) {
          console.log(`normalizeTemplateRules: Injected from_time={h:${from.hour}, m:${from.minute}} to_time={h:${to.hour}, m:${to.minute}}`);
          return { ...rule, from_time: from, to_time: to };
        } else {
          console.warn(`normalizeTemplateRules: Failed to parse time_range "${rule.time_range}"`);
        }
      }
      return rule;
    });
  };

  // Process all rule types that support time ranges
  const normalizedJson = {
    ...json,
    parsed_rule_blocks: {
      ...json.parsed_rule_blocks,
      pricing_rules: injectTimes(json.parsed_rule_blocks?.pricing_rules),
      booking_conditions: injectTimes(json.parsed_rule_blocks?.booking_conditions),
      buffer_time_rules: injectTimes(json.parsed_rule_blocks?.buffer_time_rules),
      quota_rules: injectTimes(json.parsed_rule_blocks?.quota_rules),
      booking_window_rules: injectTimes(json.parsed_rule_blocks?.booking_window_rules),
      space_sharing: json.parsed_rule_blocks?.space_sharing || []
    }
  };

  // Ensure rule_blocks exist in setup_guide steps and include derived times
  if (normalizedJson.setup_guide) {
    normalizedJson.setup_guide = normalizedJson.setup_guide.map((step: any) => {
      switch (step.step_key) {
        case 'pricing_rules':
          return { ...step, rule_blocks: normalizedJson.parsed_rule_blocks.pricing_rules };
        case 'booking_conditions':
          return { ...step, rule_blocks: normalizedJson.parsed_rule_blocks.booking_conditions };
        case 'buffer_time_rules':
          return { ...step, rule_blocks: normalizedJson.parsed_rule_blocks.buffer_time_rules };
        case 'quota_rules':
          return { ...step, rule_blocks: normalizedJson.parsed_rule_blocks.quota_rules };
        case 'booking_window_rules':
          return { ...step, rule_blocks: normalizedJson.parsed_rule_blocks.booking_window_rules };
        case 'space_sharing':
          return { ...step, connections: normalizedJson.parsed_rule_blocks.space_sharing };
        default:
          return step;
      }
    });
  }

  console.log('normalizeTemplateRules: Template normalization complete');
  return normalizedJson;
}
