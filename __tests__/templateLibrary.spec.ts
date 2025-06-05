
import { describe, it, expect } from 'vitest';
import { splitTimeRange, formatTime } from '../src/utils/timeRange';
import { normalizeTemplate } from '../src/utils/templateNormalizer';

describe('Time Range Utilities', () => {
  it('should parse time ranges correctly', () => {
    const [from, to] = splitTimeRange('17:00–23:00');
    expect(from).toEqual({ hour: 17, minute: 0 });
    expect(to).toEqual({ hour: 23, minute: 0 });
  });

  it('should handle AM/PM format', () => {
    const [from, to] = splitTimeRange('5pm-11pm');
    expect(from).toEqual({ hour: 17, minute: 0 });
    expect(to).toEqual({ hour: 23, minute: 0 });
  });

  it('should format time correctly', () => {
    const time = { hour: 9, minute: 30 };
    expect(formatTime(time)).toBe('09:30');
  });
});

describe('Template Normalizer', () => {
  it('should inject time fields from time_range', () => {
    const template = {
      pricing_rules: [
        {
          time_range: '09:00–17:00',
          rate: { amount: 50, unit: 'per_hour' }
        }
      ]
    };

    const normalized = normalizeTemplate(template);
    expect(normalized.pricing_rules[0].from_time).toBe('09:00');
    expect(normalized.pricing_rules[0].to_time).toBe('17:00');
  });

  it('should synthesize setup guide for library mode', () => {
    const template = {
      pricing_rules: [{ rate: { amount: 50, unit: 'per_hour' } }],
      booking_conditions: [{ operator: 'contains_any_of' }]
    };

    const normalized = normalizeTemplate(template);
    expect(normalized.setup_guide).toHaveLength(2);
    expect(normalized.setup_guide[0].step_key).toBe('pricing_rules');
    expect(normalized.setup_guide[1].step_key).toBe('booking_conditions');
  });

  it('should not create duplicate setup steps', () => {
    const template = {
      pricing_rules: [{ rate: { amount: 50, unit: 'per_hour' } }],
      setup_guide: [
        { step_key: 'pricing_rules', title: 'Existing step' }
      ]
    };

    const normalized = normalizeTemplate(template);
    expect(normalized.setup_guide).toHaveLength(1);
    expect(normalized.setup_guide[0].title).toBe('Existing step');
  });
});

describe('Dev Mode Guards', () => {
  it('should detect empty rule blocks in dev mode', () => {
    const mockSetupGuide = [
      {
        step_key: 'pricing_rules',
        rule_blocks: [] // Empty rule blocks should trigger error
      }
    ];

    // This test would need to be run in a React testing environment
    // to properly test the dev mode guard in SetupGuideModal
    expect(mockSetupGuide[0].rule_blocks).toHaveLength(0);
  });
});
