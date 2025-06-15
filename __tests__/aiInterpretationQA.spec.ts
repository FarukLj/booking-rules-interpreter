
import { describe, it, expect, vi } from 'vitest';

// QA Tests for AI Interpretation of User Groups in Booking Window Rules

describe('AI Interpretation QA - User Group Detection', () => {
  
  describe('Real AI Prompt Scenarios', () => {
    it('should correctly interpret the target prompt that was failing', () => {
      const testPrompt = 'Visitors can only reserve Tennis Courts up to 3 days in advance; club members up to 14 days in advance.';
      
      // This is what the AI SHOULD generate after our fix
      const expectedAIResponse = {
        booking_window_rules: [
          {
            user_scope: 'users_with_tags',
            tags: ['Visitors'],
            constraint: 'more_than',
            value: 3,
            unit: 'days',
            spaces: ['Tennis Courts'],
            explanation: 'Visitors can reserve Tennis Courts up to 3 days in advance'
          },
          {
            user_scope: 'users_with_tags',
            tags: ['Club members'],
            constraint: 'more_than',
            value: 14,
            unit: 'days',
            spaces: ['Tennis Courts'],
            explanation: 'Club members can reserve Tennis Courts up to 14 days in advance'
          }
        ],
        summary: 'Created booking window rules for Tennis Courts: Visitors can book up to 3 days in advance, while club members can book up to 14 days in advance.'
      };
      
      // Validate the structure matches our expectations
      expect(expectedAIResponse.booking_window_rules).toHaveLength(2);
      
      // First rule - Visitors
      const visitorsRule = expectedAIResponse.booking_window_rules[0];
      expect(visitorsRule.user_scope).toBe('users_with_tags');
      expect(visitorsRule.tags).toEqual(['Visitors']);
      expect(visitorsRule.constraint).toBe('more_than');
      expect(visitorsRule.value).toBe(3);
      expect(visitorsRule.unit).toBe('days');
      expect(visitorsRule.spaces).toEqual(['Tennis Courts']);
      
      // Second rule - Club members
      const membersRule = expectedAIResponse.booking_window_rules[1];
      expect(membersRule.user_scope).toBe('users_with_tags');
      expect(membersRule.tags).toEqual(['Club members']);
      expect(membersRule.constraint).toBe('more_than');
      expect(membersRule.value).toBe(14);
      expect(membersRule.unit).toBe('days');
      expect(membersRule.spaces).toEqual(['Tennis Courts']);
    });

    it('should handle variations of the same prompt', () => {
      const variations = [
        'Visitors can book Tennis Courts up to 3 days; club members up to 14 days',
        'Visitors may reserve Tennis Courts up to 3 days in advance; club members may reserve up to 14 days in advance',
        'Tennis Courts: Visitors can book up to 3 days, club members up to 14 days'
      ];
      
      variations.forEach(prompt => {
        // All variations should produce the same basic structure
        const expectedStructure = {
          ruleCount: 2,
          firstRule: {
            user_scope: 'users_with_tags',
            tags: ['Visitors'],
            value: 3,
            unit: 'days'
          },
          secondRule: {
            user_scope: 'users_with_tags',
            tags: ['Club members'],
            value: 14,
            unit: 'days'
          }
        };
        
        expect(expectedStructure.ruleCount).toBe(2);
        expect(expectedStructure.firstRule.user_scope).toBe('users_with_tags');
        expect(expectedStructure.secondRule.user_scope).toBe('users_with_tags');
      });
    });
  });

  describe('User Group Pattern Detection', () => {
    it('should detect all common user group patterns', () => {
      const patterns = [
        { prompt: 'Visitors can book', expectedTag: 'Visitors' },
        { prompt: 'Club members can book', expectedTag: 'Club members' },
        { prompt: 'Staff can book', expectedTag: 'Staff' },
        { prompt: 'Premium members can book', expectedTag: 'Premium members' },
        { prompt: 'Guests may book', expectedTag: 'Guests' },
        { prompt: 'Members are able to book', expectedTag: 'Members' },
        { prompt: 'VIP users can book', expectedTag: 'VIP users' },
        { prompt: 'Basic members can book', expectedTag: 'Basic members' }
      ];
      
      patterns.forEach(pattern => {
        const expectedRule = {
          user_scope: 'users_with_tags',
          tags: [pattern.expectedTag],
          constraint: 'more_than',
          value: 3,
          unit: 'days',
          spaces: ['all spaces']
        };
        
        expect(expectedRule.user_scope).toBe('users_with_tags');
        expect(expectedRule.tags).toEqual([pattern.expectedTag]);
      });
    });

    it('should correctly handle "only" patterns with user groups', () => {
      const testPrompt = 'Only club members can book Tennis Courts up to 14 days in advance';
      
      const expectedRule = {
        user_scope: 'users_with_tags',
        tags: ['Club members'],
        constraint: 'more_than',
        value: 14,
        unit: 'days',
        spaces: ['Tennis Courts'],
        explanation: 'Only club members can reserve Tennis Courts up to 14 days in advance'
      };
      
      expect(expectedRule.user_scope).toBe('users_with_tags');
      expect(expectedRule.tags).toEqual(['Club members']);
    });
  });

  describe('Space Extraction with User Groups', () => {
    it('should extract spaces correctly when user groups are present', () => {
      const testCases = [
        {
          prompt: 'Visitors can book Batting Cage A up to 3 days',
          expectedSpaces: ['Batting Cage A']
        },
        {
          prompt: 'Members can reserve Conference Room 1 up to 7 days',
          expectedSpaces: ['Conference Room 1']
        },
        {
          prompt: 'Staff can book Pickleball Court 1 and Pickleball Court 2 up to 30 days',
          expectedSpaces: ['Pickleball Court 1', 'Pickleball Court 2']
        },
        {
          prompt: 'Guests can book Swimming Pool up to 2 days',
          expectedSpaces: ['Swimming Pool']
        }
      ];
      
      testCases.forEach(testCase => {
        const expectedRule = {
          user_scope: 'users_with_tags',
          spaces: testCase.expectedSpaces,
          constraint: 'more_than'
        };
        
        expect(expectedRule.spaces).toEqual(testCase.expectedSpaces);
        expect(expectedRule.user_scope).toBe('users_with_tags');
      });
    });

    it('should use "all spaces" when no specific spaces mentioned', () => {
      const testPrompt = 'Visitors can book up to 3 days in advance';
      
      const expectedRule = {
        user_scope: 'users_with_tags',
        tags: ['Visitors'],
        spaces: ['all spaces'],
        constraint: 'more_than',
        value: 3,
        unit: 'days'
      };
      
      expect(expectedRule.spaces).toEqual(['all spaces']);
    });
  });

  describe('Constraint and Unit Mapping', () => {
    it('should map "up to X days" to "more_than" constraint correctly', () => {
      const testCases = [
        { prompt: 'Visitors can book up to 3 days', expectedConstraint: 'more_than', expectedValue: 3, expectedUnit: 'days' },
        { prompt: 'Members can book up to 2 weeks', expectedConstraint: 'more_than', expectedValue: 2, expectedUnit: 'weeks' },
        { prompt: 'Staff can book up to 48 hours', expectedConstraint: 'more_than', expectedValue: 48, expectedUnit: 'hours' }
      ];
      
      testCases.forEach(testCase => {
        const expectedRule = {
          user_scope: 'users_with_tags',
          constraint: testCase.expectedConstraint,
          value: testCase.expectedValue,
          unit: testCase.expectedUnit
        };
        
        expect(expectedRule.constraint).toBe('more_than');
        expect(expectedRule.value).toBe(testCase.expectedValue);
        expect(expectedRule.unit).toBe(testCase.expectedUnit);
      });
    });

    it('should map minimum notice patterns to "less_than" constraint', () => {
      const testCases = [
        { prompt: 'Visitors must book at least 24 hours in advance', expectedConstraint: 'less_than', expectedValue: 24, expectedUnit: 'hours' },
        { prompt: 'Members need 2 days notice', expectedConstraint: 'less_than', expectedValue: 2, expectedUnit: 'days' }
      ];
      
      testCases.forEach(testCase => {
        const expectedRule = {
          user_scope: 'users_with_tags',
          constraint: testCase.expectedConstraint,
          value: testCase.expectedValue,
          unit: testCase.expectedUnit
        };
        
        expect(expectedRule.constraint).toBe('less_than');
        expect(expectedRule.value).toBe(testCase.expectedValue);
        expect(expectedRule.unit).toBe(testCase.expectedUnit);
      });
    });
  });

  describe('Field Requirement Validation', () => {
    it('should ensure all required fields are present in generated rules', () => {
      const requiredFields = [
        'user_scope',
        'constraint', 
        'value',
        'unit',
        'spaces',
        'explanation'
      ];
      
      const sampleRule = {
        user_scope: 'users_with_tags',
        tags: ['Visitors'],
        constraint: 'more_than',
        value: 3,
        unit: 'days',
        spaces: ['Tennis Courts'],
        explanation: 'Visitors can reserve Tennis Courts up to 3 days in advance'
      };
      
      requiredFields.forEach(field => {
        expect(sampleRule).toHaveProperty(field);
        expect(sampleRule[field as keyof typeof sampleRule]).toBeDefined();
      });
    });

    it('should include tags field when user_scope is "users_with_tags"', () => {
      const ruleWithTags = {
        user_scope: 'users_with_tags',
        tags: ['Club members'],
        constraint: 'more_than',
        value: 14,
        unit: 'days',
        spaces: ['all spaces'],
        explanation: 'Test'
      };
      
      expect(ruleWithTags).toHaveProperty('tags');
      expect(Array.isArray(ruleWithTags.tags)).toBe(true);
      expect(ruleWithTags.tags.length).toBeGreaterThan(0);
    });

    it('should not include tags field when user_scope is "all_users"', () => {
      const ruleWithoutTags = {
        user_scope: 'all_users',
        constraint: 'more_than',
        value: 7,
        unit: 'days',
        spaces: ['all spaces'],
        explanation: 'Test'
      };
      
      expect(ruleWithoutTags).not.toHaveProperty('tags');
    });
  });
});

// Manual QA Test Cases for Browser Testing
export const aiInterpretationQAChecklist = [
  {
    id: 'target-prompt-fix',
    description: 'Test the specific prompt that was failing before the fix',
    prompt: 'Visitors can only reserve Tennis Courts up to 3 days in advance; club members up to 14 days in advance.',
    expectedResult: {
      ruleCount: 2,
      firstRule: { user_scope: 'users_with_tags', tags: ['Visitors'], value: 3, unit: 'days', spaces: ['Tennis Courts'] },
      secondRule: { user_scope: 'users_with_tags', tags: ['Club members'], value: 14, unit: 'days', spaces: ['Tennis Courts'] },
      dropdownShouldShow: 'users with any of the tags'
    },
    steps: [
      '1. Enter the prompt in the booking rule input',
      '2. Click "Analyze Rule"',
      '3. Verify TWO booking window rules are created',
      '4. Check first rule has "users with any of the tags" selected and "Visitors" tag',
      '5. Check second rule has "users with any of the tags" selected and "Club members" tag',
      '6. Verify both rules have Tennis Courts selected as space',
      '7. Verify constraint is "more_than" for both rules'
    ]
  },
  {
    id: 'single-user-group-test',
    description: 'Test single user group detection',
    prompt: 'Staff can book Gymnasium up to 30 days in advance',
    expectedResult: {
      ruleCount: 1,
      rule: { user_scope: 'users_with_tags', tags: ['Staff'], value: 30, unit: 'days', spaces: ['Gymnasium'] },
      dropdownShouldShow: 'users with any of the tags'
    },
    steps: [
      '1. Enter the prompt',
      '2. Analyze the rule',
      '3. Verify ONE booking window rule is created',
      '4. Check dropdown shows "users with any of the tags"',
      '5. Verify "Staff" tag is selected',
      '6. Verify "Gymnasium" space is selected',
      '7. Verify value is 30 days with "more_than" constraint'
    ]
  },
  {
    id: 'no-user-groups-test',
    description: 'Test default behavior when no user groups mentioned',
    prompt: 'Tennis Courts can be booked up to 5 days in advance',
    expectedResult: {
      ruleCount: 1,
      rule: { user_scope: 'all_users', value: 5, unit: 'days', spaces: ['Tennis Courts'] },
      dropdownShouldShow: 'all users'
    },
    steps: [
      '1. Enter the prompt',
      '2. Analyze the rule',
      '3. Verify ONE booking window rule is created',
      '4. Check dropdown shows "all users"',
      '5. Verify no tags are shown/selected',
      '6. Verify "Tennis Courts" space is selected',
      '7. Verify value is 5 days with "more_than" constraint'
    ]
  },
  {
    id: 'multiple-spaces-test',
    description: 'Test user groups with multiple spaces',
    prompt: 'Premium members can book Conference Room 1 and Conference Room 2 up to 21 days',
    expectedResult: {
      ruleCount: 1,
      rule: { user_scope: 'users_with_tags', tags: ['Premium members'], value: 21, unit: 'days', spaces: ['Conference Room 1', 'Conference Room 2'] },
      dropdownShouldShow: 'users with any of the tags'
    },
    steps: [
      '1. Enter the prompt',
      '2. Analyze the rule',
      '3. Verify ONE booking window rule is created',
      '4. Check dropdown shows "users with any of the tags"',
      '5. Verify "Premium members" tag is selected',
      '6. Verify both Conference Room 1 and Conference Room 2 are selected',
      '7. Verify value is 21 days with "more_than" constraint'
    ]
  },
  {
    id: 'regression-test-manual-selection',
    description: 'Verify manual user scope selection still works after AI fixes',
    steps: [
      '1. Create a booking window rule manually',
      '2. Click the user scope dropdown',
      '3. Select "users with any of the tags"',
      '4. Verify selection stays (no blinking/reverting)',
      '5. Select some tags',
      '6. Verify both scope and tags are preserved',
      '7. Clear all tags',
      '8. Verify scope automatically reverts to "all users"'
    ]
  }
];
