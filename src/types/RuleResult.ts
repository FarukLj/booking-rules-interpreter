
export interface RuleResult {
  spaceName: string;
  availability: string;
  allowedUsers: string | string[];
  pricing: {
    hourlyRate?: string;
    dailyRate?: string;
    weekendRules?: string;
  };
  explanation: string;
  aiReasoning?: string;
}
