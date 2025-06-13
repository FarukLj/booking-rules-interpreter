import { BookingCondition } from '@/types/BookingCondition';

/**
 * Converts the new BookingCondition model into the legacy shape
 * used by <BookingConditionsBlock>.  Also flips operators that the
 * back-end often inverts.
 */
export function normaliseForUI(cond: BookingCondition) {
  return {
    ...cond,

    /* legacy fields still referenced by older components */
    space:  cond.spaceIds?.[0] ?? '',
    days :  cond.days?.length
              ? cond.days
              : ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
    condition_type: 'duration',

    /* fix common operator inversions */
    rules: cond.rules.map(r => {
      if (r.type === 'duration') {
        if (r.operator === 'greater_than_or_equal_to')
          return { ...r, operator: 'less_than' };
        if (r.operator === 'less_than_or_equal_to')
          return { ...r, operator: 'greater_than' };
      }
      return r;
    })
  };
}
