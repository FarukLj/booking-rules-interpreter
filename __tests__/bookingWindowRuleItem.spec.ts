
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookingWindowRuleItem } from '@/components/booking-window/BookingWindowRuleItem';
import { BookingWindowRule } from '@/types/RuleResult';

// Mock the UI components
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange('users_with_tags')}>
        Select Users With Tags
      </button>
      <button onClick={() => onValueChange('users_with_no_tags')}>
        Select Users With No Tags
      </button>
      <button onClick={() => onValueChange('all_users')}>
        Select All Users
      </button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ value, children }: any) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/multi-select', () => ({
  MultiSelect: ({ selected, onSelectionChange, options }: any) => (
    <div data-testid="multi-select">
      {options.map((option: string) => (
        <button
          key={option}
          onClick={() => {
            const newSelected = selected.includes(option)
              ? selected.filter((s: string) => s !== option)
              : [...selected, option];
            onSelectionChange(newSelected);
          }}
        >
          {option} {selected.includes(option) ? '✓' : ''}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@/components/booking-window/BookingWindowRow', () => ({
  BookingWindowRow: ({ row1Content, row3Content }: any) => (
    <div>
      <div data-testid="row1">{row1Content}</div>
      <div data-testid="row3">{row3Content}</div>
    </div>
  ),
}));

// Mock other dependencies
vi.mock('./utils/unitConversion', () => ({
  normalizeAdvanceUnit: vi.fn((value) => value),
  convertFromHours: vi.fn((value) => value),
  getTimeDisplayHelper: vi.fn(() => ''),
}));

vi.mock('./utils/validation', () => ({
  getLogicValidation: vi.fn(() => null),
  getConstraintExplanation: vi.fn(() => 'Test explanation'),
}));

vi.mock('./utils/textHelpers', () => ({
  getUserGroupText: vi.fn((scope) => scope),
  getConstraintText: vi.fn((constraint) => constraint),
}));

describe('BookingWindowRuleItem - User Scope Selection', () => {
  const mockOnRuleUpdate = vi.fn();
  const defaultRule: BookingWindowRule = {
    user_scope: 'all_users',
    constraint: 'less_than',
    value: 72,
    unit: 'hours',
    spaces: ['Space 1'],
    explanation: 'Test rule',
  };
  const spaceOptions = ['Space 1', 'Space 2'];
  const tagOptions = ['Public', 'Members', 'Coaches'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow manual selection of "users with any of the tags" without reverting', async () => {
    render(
      <BookingWindowRuleItem
        rule={defaultRule}
        onRuleUpdate={mockOnRuleUpdate}
        spaceOptions={spaceOptions}
        tagOptions={tagOptions}
      />
    );

    // Click to select "users with any of the tags"
    const selectButton = screen.getByText('Select Users With Tags');
    fireEvent.click(selectButton);

    // Verify the onRuleUpdate was called with correct scope
    expect(mockOnRuleUpdate).toHaveBeenCalledWith('user_scope', 'users_with_tags');
  });

  it('should allow manual selection of "users with none of the tags" without reverting', async () => {
    render(
      <BookingWindowRuleItem
        rule={defaultRule}
        onRuleUpdate={mockOnRuleUpdate}
        spaceOptions={spaceOptions}
        tagOptions={tagOptions}
      />
    );

    // Click to select "users with none of the tags"
    const selectButton = screen.getByText('Select Users With No Tags');
    fireEvent.click(selectButton);

    // Verify the onRuleUpdate was called with correct scope
    expect(mockOnRuleUpdate).toHaveBeenCalledWith('user_scope', 'users_with_no_tags');
  });

  it('should show tag selector when user scope is set to tag-based option', () => {
    const ruleWithTagScope: BookingWindowRule = {
      ...defaultRule,
      user_scope: 'users_with_tags',
    };

    render(
      <BookingWindowRuleItem
        rule={ruleWithTagScope}
        onRuleUpdate={mockOnRuleUpdate}
        spaceOptions={spaceOptions}
        tagOptions={tagOptions}
      />
    );

    // Verify multi-select is rendered
    expect(screen.getByTestId('multi-select')).toBeInTheDocument();
  });

  it('should not show tag selector when user scope is "all_users"', () => {
    render(
      <BookingWindowRuleItem
        rule={defaultRule}
        onRuleUpdate={mockOnRuleUpdate}
        spaceOptions={spaceOptions}
        tagOptions={tagOptions}
      />
    );

    // Verify multi-select is not rendered
    expect(screen.queryByTestId('multi-select')).not.toBeInTheDocument();
  });

  it('should handle tag selection after selecting tag-based scope', async () => {
    const ruleWithTagScope: BookingWindowRule = {
      ...defaultRule,
      user_scope: 'users_with_tags',
    };

    render(
      <BookingWindowRuleItem
        rule={ruleWithTagScope}
        onRuleUpdate={mockOnRuleUpdate}
        spaceOptions={spaceOptions}
        tagOptions={tagOptions}
      />
    );

    // Select a tag
    const publicTag = screen.getByText('Public');
    fireEvent.click(publicTag);

    // Verify tag selection triggered update
    expect(mockOnRuleUpdate).toHaveBeenCalledWith('tags', ['Public']);
  });

  it('should auto-update scope when tags are programmatically added', () => {
    const ruleWithTags: BookingWindowRule = {
      ...defaultRule,
      tags: ['Public'],
    };

    render(
      <BookingWindowRuleItem
        rule={ruleWithTags}
        onRuleUpdate={mockOnRuleUpdate}
        spaceOptions={spaceOptions}
        tagOptions={tagOptions}
      />
    );

    // Should auto-update scope to users_with_tags when tags are present
    expect(mockOnRuleUpdate).toHaveBeenCalledWith('user_scope', 'users_with_tags');
  });

  it('should only revert scope when tags are cleared after having tags', async () => {
    const ruleWithTags: BookingWindowRule = {
      ...defaultRule,
      user_scope: 'users_with_tags',
      tags: ['Public'],
    };

    const { rerender } = render(
      <BookingWindowRuleItem
        rule={ruleWithTags}
        onRuleUpdate={mockOnRuleUpdate}
        spaceOptions={spaceOptions}
        tagOptions={tagOptions}
      />
    );

    // Clear the mockOnRuleUpdate calls from initial render
    vi.clearAllMocks();

    // Simulate clearing tags
    const ruleWithoutTags: BookingWindowRule = {
      ...ruleWithTags,
      tags: [],
    };

    rerender(
      <BookingWindowRuleItem
        rule={ruleWithoutTags}
        onRuleUpdate={mockOnRuleUpdate}
        spaceOptions={spaceOptions}
        tagOptions={tagOptions}
      />
    );

    // Should revert scope to all_users when tags are cleared
    await waitFor(() => {
      expect(mockOnRuleUpdate).toHaveBeenCalledWith('user_scope', 'all_users');
    });
  });

  it('should preserve manual scope selection when no tags are present initially', () => {
    // Simulate clicking to select users_with_tags manually
    const { rerender } = render(
      <BookingWindowRuleItem
        rule={defaultRule}
        onRuleUpdate={mockOnRuleUpdate}
        spaceOptions={spaceOptions}
        tagOptions={tagOptions}
      />
    );

    // Clear initial calls
    vi.clearAllMocks();

    // Simulate manual scope change
    const selectButton = screen.getByText('Select Users With Tags');
    fireEvent.click(selectButton);

    // Verify the scope change was called
    expect(mockOnRuleUpdate).toHaveBeenCalledWith('user_scope', 'users_with_tags');

    // Rerender with the new scope but no tags
    const updatedRule: BookingWindowRule = {
      ...defaultRule,
      user_scope: 'users_with_tags',
    };

    rerender(
      <BookingWindowRuleItem
        rule={updatedRule}
        onRuleUpdate={mockOnRuleUpdate}
        spaceOptions={spaceOptions}
        tagOptions={tagOptions}
      />
    );

    // Should NOT auto-revert because this was a manual change
    expect(mockOnRuleUpdate).not.toHaveBeenCalledWith('user_scope', 'all_users');
  });
});
