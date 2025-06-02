
export interface BookingCondition {
  space: string[];
  time_range: string;
  days?: string[];
  condition_type: "duration" | "user_tags" | "interval_start" | "interval_end";
  operator: string;
  value: string | string[];
  explanation: string;
}

export interface SubCondition {
  condition_type: "duration" | "user_tags";
  operator: string;
  value: string | string[];
  logic: "AND" | "OR";
}

export interface PricingRule {
  space: string[];
  time_range: string;
  days: string[];
  rate: { amount: number; unit: string };
  condition_type: "duration" | "user_tags";
  operator: string;
  value: string | string[];
  sub_conditions?: SubCondition[];
  explanation: string;
}

export interface QuotaRule {
  target: "individuals" | "individuals_with_tags" | "group_with_tag";
  tags?: string[];
  quota_type: "time" | "count";
  value: string | number;
  period: "day" | "week" | "month" | "at_any_time";
  affected_spaces: string[];
  consideration_time: "any_time" | "specific_time";
  time_range?: string;
  days?: string[];
  explanation: string;
}

export interface BufferTimeRule {
  spaces: string[];
  buffer_duration: string;
  explanation: string;
}

export interface BookingWindowRule {
  user_scope: "all_users" | "users_with_tags" | "users_with_no_tags";
  tags?: string[];
  constraint: "less_than" | "more_than";
  value: number;
  unit: "hours" | "days";
  spaces: string[];
  explanation: string;
}

export interface SetupGuideStep {
  step_key: string;
  title: string;
  instruction: string;
  rule_blocks?: any[];
  spaces?: string[];
  times?: string;
}

export interface RuleResult {
  // Legacy fields for backward compatibility
  spaceName?: string;
  availability?: string;
  allowedUsers?: string | string[];
  pricing?: {
    hourlyRate?: string;
    dailyRate?: string;
    weekendRules?: string;
  };
  explanation?: string;
  aiReasoning?: string;
  
  // New expanded structure
  booking_conditions?: BookingCondition[];
  pricing_rules?: PricingRule[];
  quota_rules?: QuotaRule[];
  buffer_time_rules?: BufferTimeRule[];
  booking_window_rules?: BookingWindowRule[];
  summary?: string;

  // New setup guide structure
  parsed_rule_blocks?: {
    booking_conditions?: BookingCondition[];
    pricing_rules?: PricingRule[];
    quota_rules?: QuotaRule[];
    buffer_time_rules?: BufferTimeRule[];
    booking_window_rules?: BookingWindowRule[];
  };
  setup_guide?: SetupGuideStep[];
}
