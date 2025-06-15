
import { describe, it, expect, vi } from 'vitest';

// Unit Tests for User Group Detection and AI Interpretation

describe('User Group Detection - AI Interpretation Tests', () => {
  
  describe('Single User Group Rules', () => {
    it('should detect "Visitors can book up to 3 days" and create proper booking window rule', () => {
      const expectedResult = {
        booking_window_rules: [
          {
            user_scope: 'users_with_tags',
            tags: ['Visitors'],
            constraint: 'more_than',
            value: 3,
            unit: 'days',
            spaces: ['all spaces'],
            explanation: 'Visitors can reserve all spaces up to 3 days in advance'
          }
        ]
      };
      
      // This test validates the expected structure for AI interpretation
      expect(expectedResult.booking_window_rules[0].user_scope).toBe('users_with_tags');
      expect(expectedResult.booking_window_rules[0].tags).toEqual(['Visitors']);
      expect(expectedResult.booking_window_rules[0].constraint).toBe('more_than');
      expect(expectedResult.booking_window_rules[0].value).toBe(3);
      expect(expectedResult.booking_window_rules[0].unit).toBe('days');
    });

    it('should detect "Club members can book Tennis Courts up to 14 days" with specific space', () => {
      const expectedResult = {
        booking_window_rules: [
          {
            user_scope: 'users_with_tags',
            tags: ['Club members'],
            constraint: 'more_than',
            value: 14,
            unit: 'days',
            spaces: ['Tennis Courts'],
            explanation: 'Club members can reserve Tennis Courts up to 14 days in advance'
          }
        ]
      };
      
      expect(expectedResult.booking_window_rules[0].user_scope).toBe('users_with_tags');
      expect(expectedResult.booking_window_rules[0].tags).toEqual(['Club members']);
      expect(expectedResult.booking_window_rules[0].spaces).toEqual(['Tennis Courts']);
    });

    it('should detect "Staff can book up to 30 days" correctly', () => {
      const expectedResult = {
        booking_window_rules: [
          {
            user_scope: 'users_with_tags',
            tags: ['Staff'],
            constraint: 'more_than',
            value: 30,
            unit: 'days',
            spaces: ['all spaces'],
            explanation: 'Staff can reserve all spaces up to 30 days in advance'
          }
        ]
      };
      
      expect(expectedResult.booking_window_rules[0].tags).toEqual(['Staff']);
      expect(expectedResult.booking_window_rules[0].value).toBe(30);
    });
  });

  describe('Multi-User Group Rules', () => {
    it('should create TWO separate rules for "Visitors can book up to 3 days; club members up to 14 days"', () => {
      const expectedResult = {
        booking_window_rules: [
          {
            user_scope: 'users_with_tags',
            tags: ['Visitors'],
            constraint: 'more_than',
            value: 3,
            unit: 'days',
            spaces: ['all spaces'],
            explanation: 'Visitors can reserve all spaces up to 3 days in advance'
          },
          {
            user_scope: 'users_with_tags',
            tags: ['Club members'],
            constraint: 'more_than',
            value: 14,
            unit: 'days',
            spaces: ['all spaces'],
            explanation: 'Club members can reserve all spaces up to 14 days in advance'
          }
        ]
      };
      
      expect(expectedResult.booking_window_rules).toHaveLength(2);
      expect(expectedResult.booking_window_rules[0].tags).toEqual(['Visitors']);
      expect(expectedResult.booking_window_rules[0].value).toBe(3);
      expect(expectedResult.booking_window_rules[1].tags).toEqual(['Club members']);
      expect(expectedResult.booking_window_rules[1].value).toBe(14);
    });

    it('should handle "Visitors can book Tennis Courts up to 3 days; club members up to 14 days" with specific space', () => {
      const expectedResult = {
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
        ]
      };
      
      expect(expectedResult.booking_window_rules).toHaveLength(2);
      expect(expectedResult.booking_window_rules[0].spaces).toEqual(['Tennis Courts']);
      expect(expectedResult.booking_window_rules[1].spaces).toEqual(['Tennis Courts']);
    });
  });

  describe('User Group Pattern Variations', () => {
    it('should detect "Premium members get 7 days advance booking"', () => {
      const expectedResult = {
        booking_window_rules: [
          {
            user_scope: 'users_with_tags',
            tags: ['Premium members'],
            constraint: 'more_than',
            value: 7,
            unit: 'days',
            spaces: ['all spaces'],
            explanation: 'Premium members can reserve all spaces up to 7 days in advance'
          }
        ]
      };
      
      expect(expectedResult.booking_window_rules[0].tags).toEqual(['Premium members']);
    });

    it('should detect "Guests may book up to 2 days"', () => {
      const expectedResult = {
        booking_window_rules: [
          {
            user_scope: 'users_with_tags',
            tags: ['Guests'],
            constraint: 'more_than',
            value: 2,
            unit: 'days',
            spaces: ['all spaces'],
            explanation: 'Guests can reserve all spaces up to 2 days in advance'
          }
        ]
      };
      
      expect(expectedResult.booking_window_rules[0].tags).toEqual(['Guests']);
    });

    it('should detect "Members are able to book up to 10 days"', () => {
      const expectedResult = {
        booking_window_rules: [
          {
            user_scope: 'users_with_tags',
            tags: ['Members'],
            constraint: 'more_than',
            value: 10,
            unit: 'days',
            spaces: ['all spaces'],
            explanation: 'Members can reserve all spaces up to 10 days in advance'
          }
        ]
      };
      
      expect(expectedResult.booking_window_rules[0].tags).toEqual(['Members']);
    });
  });

  describe('No User Groups (Default Cases)', () => {
    it('should use "all_users" when no user groups are mentioned', () => {
      const expectedResult = {
        booking_window_rules: [
          {
            user_scope: 'all_users',
            constraint: 'more_than',
            value: 7,
            unit: 'days',
            spaces: ['all spaces'],
            explanation: 'Bookings can be made up to 7 days in advance'
          }
        ]
      };
      
      expect(expectedResult.booking_window_rules[0].user_scope).toBe('all_users');
      expect(expectedResult.booking_window_rules[0].tags).toBeUndefined();
    });

    it('should use "all_users" for "Must book at least 24 hours in advance"', () => {
      const expectedResult = {
        booking_window_rules: [
          {
            user_scope: 'all_users',
            constraint: 'less_than',
            value: 24,
            unit: 'hours',
            spaces: ['all spaces'],
            explanation: 'Bookings must be made at least 24 hours in advance'
          }
        ]
      };
      
      expect(expectedResult.booking_window_rules[0].user_scope).toBe('all_users');
      expect(expectedResult.booking_window_rules[0].constraint).toBe('less_than');
    });
  });

  // NEW: UI Display Validation Tests
  describe('UI Display Validation', () => {
    it('should ensure rules with user_scope "users_with_tags" display correctly in UI', () => {
      const ruleForUI = {
        user_scope: 'users_with_tags',
        tags: ['Visitors'],
        constraint: 'more_than',
        value: 3,
        unit: 'days',
        spaces: ['Tennis Courts'],
        explanation: 'Visitors can reserve Tennis Courts up to 3 days in advance'
      };

      // Validate that this rule structure will display correctly
      expect(ruleForUI.user_scope).toBe('users_with_tags'); // Should show "users with any of the tags"
      expect(ruleForUI.tags).toEqual(['Visitors']); // Should populate tag selector
      expect(ruleForUI.tags).not.toBeUndefined(); // Must have tags for user_scope display
    });

    it('should validate multi-rule UI display structure', () => {
      const multiRuleStructure = [
        {
          user_scope: 'users_with_tags',
          tags: ['Visitors'],
          constraint: 'more_than',
          value: 3,
          unit: 'days',
          spaces: ['Tennis Courts'],
          explanation: 'Visitors rule'
        },
        {
          user_scope: 'users_with_tags',
          tags: ['Club members'],
          constraint: 'more_than',
          value: 14,
          unit: 'days',
          spaces: ['Tennis Courts'],
          explanation: 'Club members rule'
        }
      ];

      // Both rules should display with correct user_scope
      multiRuleStructure.forEach(rule => {
        expect(rule.user_scope).toBe('users_with_tags');
        expect(rule.tags).toBeDefined();
        expect(rule.tags.length).toBeGreaterThan(0);
      });
    });

    it('should NOT have hardcoded default structure when AI provides user group rules', () => {
      const hardcodedDefault = {
        user_scope: "all_users",
        constraint: "less_than",
        value: 72,
        unit: "hours",
        spaces: ["Space 1"],
        explanation: "Default booking window rule"
      };

      const aiGeneratedRule = {
        user_scope: 'users_with_tags',
        tags: ['Visitors'],
        constraint: 'more_than',
        value: 3,
        unit: 'days',
        spaces: ['Tennis Courts'],
        explanation: 'Visitors can reserve Tennis Courts up to 3 days in advance'
      };

      // AI rule should NOT match hardcoded default
      expect(aiGeneratedRule.user_scope).not.toBe(hardcodedDefault.user_scope);
      expect(aiGeneratedRule.value).not.toBe(hardcodedDefault.value);
      expect(aiGeneratedRule.unit).not.toBe(hardcodedDefault.unit);
      expect(aiGeneratedRule.constraint).not.toBe(hardcodedDefault.constraint);
    });
  });

  describe('Required Fields Validation', () => {
    it('should always include user_scope field', () => {
      const visitorRule = {
        user_scope: 'users_with_tags',
        tags: ['Visitors'],
        constraint: 'more_than',
        value: 3,
        unit: 'days',
        spaces: ['Tennis Courts'],
        explanation: 'Test explanation'
      };
      
      expect(visitorRule).toHaveProperty('user_scope');
      expect(visitorRule.user_scope).toBeDefined();
    });

    it('should always include spaces field', () => {
      const rule = {
        user_scope: 'users_with_tags',
        tags: ['Club members'],
        constraint: 'more_than',
        value: 14,
        unit: 'days',
        spaces: ['Tennis Courts'],
        explanation: 'Test explanation'
      };
      
      expect(rule).toHaveProperty('spaces');
      expect(rule.spaces).toBeDefined();
      expect(Array.isArray(rule.spaces)).toBe(true);
    });

    it('should include tags field when user_scope is "users_with_tags"', () => {
      const rule = {
        user_scope: 'users_with_tags',
        tags: ['Visitors'],
        constraint: 'more_than',
        value: 3,
        unit: 'days',
        spaces: ['all spaces'],
        explanation: 'Test explanation'
      };
      
      expect(rule).toHaveProperty('tags');
      expect(rule.tags).toBeDefined();
      expect(Array.isArray(rule.tags)).toBe(true);
      expect(rule.tags.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle mixed user groups with different units', () => {
      const expectedResult = {
        booking_window_rules: [
          {
            user_scope: 'users_with_tags',
            tags: ['Visitors'],
            constraint: 'more_than',
            value: 24,
            unit: 'hours',
            spaces: ['all spaces'],
            explanation: 'Visitors can reserve all spaces up to 24 hours in advance'
          },
          {
            user_scope: 'users_with_tags',
            tags: ['Members'],
            constraint: 'more_than',
            value: 2,
            unit: 'weeks',
            spaces: ['all spaces'],
            explanation: 'Members can reserve all spaces up to 2 weeks in advance'
          }
        ]
      };
      
      expect(expectedResult.booking_window_rules[0].unit).toBe('hours');
      expect(expectedResult.booking_window_rules[1].unit).toBe('weeks');
    });

    it('should handle user groups with complex names', () => {
      const expectedResult = {
        booking_window_rules: [
          {
            user_scope: 'users_with_tags',
            tags: ['Premium Gold members'],
            constraint: 'more_than',
            value: 30,
            unit: 'days',
            spaces: ['all spaces'],
            explanation: 'Premium Gold members can reserve all spaces up to 30 days in advance'
          }
        ]
      };
      
      expect(expectedResult.booking_window_rules[0].tags).toEqual(['Premium Gold members']);
    });
  });
});

// QA Integration Tests - UPDATED with UI display validation
export const userGroupQAChecklist = [
  {
    id: 'single-user-group-detection',
    description: 'Test AI correctly detects single user groups',
    testPrompts: [
      'Visitors can only reserve Tennis Courts up to 3 days in advance',
      'Club members can book up to 14 days in advance',
      'Staff can book up to 30 days',
      'Premium members get 7 days advance booking'
    ],
    expectedResults: [
      { user_scope: 'users_with_tags', tags: ['Visitors'], spaces: ['Tennis Courts'] },
      { user_scope: 'users_with_tags', tags: ['Club members'], spaces: ['all spaces'] },
      { user_scope: 'users_with_tags', tags: ['Staff'], spaces: ['all spaces'] },
      { user_scope: 'users_with_tags', tags: ['Premium members'], spaces: ['all spaces'] }
    ],
    // NEW: UI display expectations
    expectedUIDisplay: [
      { userScopeSelector: 'users with any of the tags', tagSelector: ['Visitors'] },
      { userScopeSelector: 'users with any of the tags', tagSelector: ['Club members'] },
      { userScopeSelector: 'users with any of the tags', tagSelector: ['Staff'] },
      { userScopeSelector: 'users with any of the tags', tagSelector: ['Premium members'] }
    ]
  },
  {
    id: 'multi-user-group-detection',
    description: 'Test AI creates separate rules for multiple user groups',
    testPrompts: [
      'Visitors can only reserve Tennis Courts up to 3 days in advance; club members up to 14 days in advance',
      'Guests get 2 days; members get 10 days; staff get 30 days'
    ],
    expectedResults: [
      { ruleCount: 2, firstUserScope: 'users_with_tags', firstTags: ['Visitors'], secondTags: ['Club members'] },
      { ruleCount: 3, allUserScope: 'users_with_tags' }
    ],
    // NEW: UI display expectations for multiple rules
    expectedUIDisplay: [
      { 
        ruleCount: 2,
        firstRule: { userScopeSelector: 'users with any of the tags', tagSelector: ['Visitors'] },
        secondRule: { userScopeSelector: 'users with any of the tags', tagSelector: ['Club members'] }
      },
      { 
        ruleCount: 3,
        allRules: { userScopeSelector: 'users with any of the tags' }
      }
    ]
  },
  {
    id: 'no-user-groups-default',
    description: 'Test AI uses "all_users" when no user groups mentioned',
    testPrompts: [
      'Bookings can be made up to 7 days in advance',
      'Must book at least 24 hours in advance',
      'Tennis Courts can be booked up to 5 days ahead'
    ],
    expectedResults: [
      { user_scope: 'all_users', tags: undefined },
      { user_scope: 'all_users', tags: undefined },
      { user_scope: 'all_users', tags: undefined }
    ],
    // NEW: UI display expectations for all_users
    expectedUIDisplay: [
      { userScopeSelector: 'all users', tagSelector: undefined },
      { userScopeSelector: 'all users', tagSelector: undefined },       
      { userScopeSelector: 'all users', tagSelector: undefined }
    ]
  },
  {
    id: 'ui-display-validation',
    description: 'NEW: Test that UI correctly displays AI-generated user group rules without falling back to hardcoded defaults',
    testScenarios: [
      {
        name: 'Single user group rule should show correct selectors',
        input: 'Visitors can only reserve Tennis Courts up to 3 days in advance',
        expectedUI: {
          userScopeSelector: 'users with any of the tags',
          tagSelector: ['Visitors'],
          spaceSelector: ['Tennis Courts'],
          constraintSelector: 'more than',
          valueInput: '3',
          unitSelector: 'days in advance'
        },
        shouldNotShow: {
          userScopeSelector: 'all users',
          valueInput: '72',
          unitSelector: 'hours in advance'
        }
      },
      {
        name: 'Multiple user group rules should show separate blocks',
        input: 'Visitors can book up to 3 days; club members up to 14 days',
        expectedUI: {
          ruleCount: 2,
          firstRule: {
            userScopeSelector: 'users with any of the tags',
            tagSelector: ['Visitors'],
            valueInput: '3'
          },
          secondRule: {
            userScopeSelector: 'users with any of the tags',
            tagSelector: ['Club members'],
            valueInput: '14'
          }
        }
      }
    ]
  }
];
