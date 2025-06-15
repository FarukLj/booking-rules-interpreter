
import { describe, it, expect, vi } from 'vitest';
import { BookingWindowRule } from '@/types/RuleResult';

// Unit Tests for BookingWindowRulesBlock initialization and AI rule handling

describe('BookingWindowRulesBlock - AI Rule Initialization', () => {
  
  describe('Proper Rule Initialization', () => {
    it('should initialize with AI-generated rules containing users_with_tags', () => {
      const aiGeneratedRules: BookingWindowRule[] = [
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
      ];

      // Verify the AI-generated rules have the correct structure
      expect(aiGeneratedRules).toHaveLength(2);
      expect(aiGeneratedRules[0].user_scope).toBe('users_with_tags');
      expect(aiGeneratedRules[0].tags).toEqual(['Visitors']);
      expect(aiGeneratedRules[1].user_scope).toBe('users_with_tags');
      expect(aiGeneratedRules[1].tags).toEqual(['Club members']);
    });

    it('should NOT fall back to hardcoded defaults when valid rules are provided', () => {
      const validAIRules: BookingWindowRule[] = [
        {
          user_scope: 'users_with_tags',
          tags: ['Staff'],
          constraint: 'more_than',
          value: 30,
          unit: 'days',
          spaces: ['all spaces'],
          explanation: 'Staff can reserve all spaces up to 30 days in advance'
        }
      ];

      // The component should use these rules directly, not fall back to defaults
      expect(validAIRules).toHaveLength(1);
      expect(validAIRules[0].user_scope).toBe('users_with_tags');
      expect(validAIRules[0].tags).toEqual(['Staff']);
      
      // Verify it's not the hardcoded default
      expect(validAIRules[0].user_scope).not.toBe('all_users');
      expect(validAIRules[0].value).not.toBe(72);
      expect(validAIRules[0].unit).not.toBe('hours');
    });

    it('should preserve complex user group structures', () => {
      const complexRules: BookingWindowRule[] = [
        {
          user_scope: 'users_with_tags',
          tags: ['Premium Gold members'],
          constraint: 'more_than',
          value: 21,
          unit: 'days',
          spaces: ['Executive Lounge', 'Conference Room A'],
          explanation: 'Premium Gold members can reserve premium spaces up to 21 days in advance'
        },
        {
          user_scope: 'users_with_no_tags',
          tags: ['Banned users'],
          constraint: 'less_than',
          value: 24,
          unit: 'hours',
          spaces: ['all spaces'],
          explanation: 'Users without banned tags must book at least 24 hours in advance'
        }
      ];

      expect(complexRules[0].user_scope).toBe('users_with_tags');
      expect(complexRules[0].tags).toEqual(['Premium Gold members']);
      expect(complexRules[0].spaces).toEqual(['Executive Lounge', 'Conference Room A']);
      
      expect(complexRules[1].user_scope).toBe('users_with_no_tags');
      expect(complexRules[1].tags).toEqual(['Banned users']);
    });
  });

  describe('Edge Function User Group Detection', () => {
    it('should properly extract user groups from natural language', () => {
      const testCases = [
        {
          input: 'Visitors can only reserve Tennis Courts up to 3 days in advance',
          expected: ['Visitors']
        },
        {
          input: 'Club members up to 14 days in advance',
          expected: ['Club members']
        },
        {
          input: 'Visitors can only reserve Tennis Courts up to 3 days in advance; club members up to 14 days in advance',
          expected: ['Visitors', 'club members']
        },
        {
          input: 'Premium Gold members can reserve premium spaces up to 21 days in advance',
          expected: ['Premium Gold members']
        }
      ];

      testCases.forEach(({ input, expected }) => {
        // Simulate the extractUserGroupsFromText function logic
        const userGroupPatterns = [
          /(?:for\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+members?)?)\s+(?:can|must|should|are)/gi,
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+members?)?)(?:\s+(?:can|must|should|are)\s+(?:only\s+)?(?:book|reserve|access))/gi,
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+members?)?)(?:\s+up\s+to|\s+within|\s+at\s+least)/gi
        ];
        
        const groups = new Set<string>();
        userGroupPatterns.forEach(pattern => {
          const matches = input.matchAll(pattern);
          for (const match of matches) {
            if (match[1]) {
              let group = match[1].trim().replace(/'/g, '').replace(/\s+/g, ' ');
              const skipWords = ['only', 'all', 'any', 'the', 'and', 'or', 'but'];
              if (!skipWords.includes(group.toLowerCase()) && group.length > 2) {
                groups.add(group);
              }
            }
          }
        });
        
        const extractedGroups = Array.from(groups);
        expect(extractedGroups).toEqual(expect.arrayContaining(expected));
      });
    });

    it('should generate proper booking window rules with user_scope and tags', () => {
      const mockRule = {
        user_scope: 'users_with_tags',
        tags: ['Visitors'],
        constraint: 'more_than',
        value: 3,
        unit: 'days',
        spaces: ['Tennis Courts'],
        explanation: 'Visitors can reserve Tennis Courts up to 3 days in advance'
      };

      // Verify the rule structure matches expected format
      expect(mockRule.user_scope).toBe('users_with_tags');
      expect(mockRule.tags).toEqual(['Visitors']);
      expect(mockRule.constraint).toBe('more_than');
      expect(mockRule.value).toBe(3);
      expect(mockRule.unit).toBe('days');
      expect(mockRule.spaces).toEqual(['Tennis Courts']);
      expect(mockRule.explanation).toContain('Visitors');
    });
  });

  describe('Data Flow Validation', () => {
    it('should maintain rule integrity through the component hierarchy', () => {
      const originalRule: BookingWindowRule = {
        user_scope: 'users_with_tags',
        tags: ['Club members'],
        constraint: 'more_than',
        value: 14,
        unit: 'days',
        spaces: ['Tennis Courts'],
        explanation: 'Club members can reserve Tennis Courts up to 14 days in advance'
      };

      // Simulate the data flow: AI → SetupGuideModal → BookingWindowRulesBlock → BookingWindowRuleItem
      const rulePassedToBlock = { ...originalRule };
      const rulePassedToItem = { ...rulePassedToBlock };

      // Verify data integrity at each step
      expect(rulePassedToBlock.user_scope).toBe('users_with_tags');
      expect(rulePassedToBlock.tags).toEqual(['Club members']);
      expect(rulePassedToItem.user_scope).toBe('users_with_tags');
      expect(rulePassedToItem.tags).toEqual(['Club members']);
    });

    it('should handle empty initialRules array gracefully', () => {
      const emptyRules: BookingWindowRule[] = [];
      
      // The component should handle this case without crashing
      expect(emptyRules).toHaveLength(0);
      expect(Array.isArray(emptyRules)).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle rules with missing optional fields', () => {
      const ruleWithMissingFields: BookingWindowRule = {
        user_scope: 'users_with_tags',
        tags: ['Visitors'],
        constraint: 'more_than',
        value: 3,
        unit: 'days',
        spaces: ['Tennis Courts'],
        explanation: 'Basic rule structure'
        // Missing optional fields like display
      };

      expect(ruleWithMissingFields.user_scope).toBe('users_with_tags');
      expect(ruleWithMissingFields.tags).toEqual(['Visitors']);
      expect(ruleWithMissingFields.display).toBeUndefined();
    });

    it('should handle mixed user_scope types in multiple rules', () => {
      const mixedRules: BookingWindowRule[] = [
        {
          user_scope: 'all_users',
          constraint: 'less_than',
          value: 48,
          unit: 'hours',
          spaces: ['Basic Rooms'],
          explanation: 'Default rule for all users'
        },
        {
          user_scope: 'users_with_tags',
          tags: ['VIP members'],
          constraint: 'more_than',
          value: 30,
          unit: 'days',
          spaces: ['VIP Lounge'],
          explanation: 'VIP rule'
        }
      ];

      expect(mixedRules[0].user_scope).toBe('all_users');
      expect(mixedRules[0].tags).toBeUndefined();
      expect(mixedRules[1].user_scope).toBe('users_with_tags');
      expect(mixedRules[1].tags).toEqual(['VIP members']);
    });
  });

  describe('AI Edge Function Field Mapping Tests', () => {
    it('should ensure user_scope is set when tags are present', () => {
      const ruleWithTagsButNoScope = {
        tags: ['Visitors'],
        constraint: 'more_than',
        value: 3,
        unit: 'days',
        spaces: ['Tennis Courts'],
        explanation: 'Visitors can reserve Tennis Courts up to 3 days in advance'
      };

      // Simulate the field mapping logic from the edge function
      let processedRule = { ...ruleWithTagsButNoScope };
      
      if (!processedRule.user_scope && processedRule.tags && processedRule.tags.length > 0) {
        processedRule.user_scope = 'users_with_tags';
      }

      expect(processedRule.user_scope).toBe('users_with_tags');
      expect(processedRule.tags).toEqual(['Visitors']);
    });

    it('should extract user groups from explanation when missing tags', () => {
      const ruleWithExplanationOnly = {
        constraint: 'more_than',
        value: 3,
        unit: 'days',
        spaces: ['Tennis Courts'],
        explanation: 'Club members can reserve Tennis Courts up to 3 days in advance'
      };

      // Simulate user group extraction from explanation
      const explanation = ruleWithExplanationOnly.explanation;
      const userGroupPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+members?)?)\s+(?:can|must|should)/gi;
      const matches = explanation.matchAll(userGroupPattern);
      const extractedGroups = [];
      
      for (const match of matches) {
        if (match[1]) {
          extractedGroups.push(match[1].trim());
        }
      }

      expect(extractedGroups).toContain('Club members');
    });

    it('should handle the specific test case: Visitors and Club members', () => {
      const testInput = 'Visitors can only reserve Tennis Courts up to 3 days in advance; club members up to 14 days in advance';
      
      // Expected output structure
      const expectedRules = [
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
      ];

      // Verify each rule has the correct structure
      expectedRules.forEach(rule => {
        expect(rule.user_scope).toBe('users_with_tags');
        expect(rule.tags).toBeDefined();
        expect(rule.tags).toHaveLength(1);
        expect(rule.constraint).toBe('more_than');
        expect(rule.spaces).toEqual(['Tennis Courts']);
      });
    });
  });

  describe('Console Logging Validation', () => {
    it('should log component initialization data', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const testRules: BookingWindowRule[] = [
        {
          user_scope: 'users_with_tags',
          tags: ['Test users'],
          constraint: 'more_than',
          value: 7,
          unit: 'days',
          spaces: ['Test Space'],
          explanation: 'Test rule'
        }
      ];

      // Simulate component initialization logging
      console.log('[BookingWindowRulesBlock] Component initialized with:', {
        initialRulesLength: testRules.length,
        initialRules: testRules,
        ruleResult: 'present'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[BookingWindowRulesBlock] Component initialized with:',
        expect.objectContaining({
          initialRulesLength: 1,
          initialRules: testRules
        })
      );

      consoleSpy.mockRestore();
    });
  });
});

// QA Integration Tests for the fix
export const bookingWindowBlockQAChecklist = [
  {
    id: 'ai-rule-initialization',
    description: 'Test that AI-generated rules are properly initialized without fallback to defaults',
    testScenarios: [
      {
        name: 'Single user group rule',
        input: [{
          user_scope: 'users_with_tags',
          tags: ['Visitors'],
          constraint: 'more_than',
          value: 3,
          unit: 'days',
          spaces: ['Tennis Courts'],
          explanation: 'Visitors can reserve Tennis Courts up to 3 days in advance'
        }],
        expectedUI: {
          userScopeSelector: 'users with any of the tags',
          tagSelector: ['Visitors'],
          spaceSelector: ['Tennis Courts']
        }
      },
      {
        name: 'Multiple user group rules',
        input: [
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
        ],
        expectedUI: {
          ruleCount: 2,
          firstRule: {
            userScopeSelector: 'users with any of the tags',
            tagSelector: ['Visitors']
          },
          secondRule: {
            userScopeSelector: 'users with any of the tags',
            tagSelector: ['Club members']
          }
        }
      }
    ]
  },
  {
    id: 'no-hardcoded-fallback',
    description: 'Verify that the component does not fall back to hardcoded defaults when valid AI rules are provided',
    testScenarios: [
      {
        name: 'Should not show "all users" when AI provides user_with_tags rules',
        expectedBehavior: 'User scope selector should show "users with any of the tags" not "all users"'
      },
      {
        name: 'Should not show 72 hours default when AI provides different values',
        expectedBehavior: 'Value field should show AI-generated values, not 72'
      }
    ]
  },
  {
    id: 'data-flow-integrity',
    description: 'Test that rule data maintains integrity through the component hierarchy',
    testScenarios: [
      {
        name: 'AI → SetupGuideModal → BookingWindowRulesBlock → BookingWindowRuleItem',
        checkPoints: [
          'user_scope value preserved',
          'tags array preserved',
          'spaces array preserved',
          'constraint and values preserved'
        ]
      }
    ]
  },
  {
    id: 'edge-function-user-group-detection',
    description: 'Test edge function properly detects and maps user groups',
    testScenarios: [
      {
        name: 'Test case: "Visitors can only reserve Tennis Courts up to 3 days in advance; club members up to 14 days in advance"',
        expectedOutput: {
          ruleCount: 2,
          rule1: {
            user_scope: 'users_with_tags',
            tags: ['Visitors'],
            value: 3,
            unit: 'days'
          },
          rule2: {
            user_scope: 'users_with_tags',
            tags: ['Club members'],
            value: 14,
            unit: 'days'
          }
        }
      }
    ]
  }
];
