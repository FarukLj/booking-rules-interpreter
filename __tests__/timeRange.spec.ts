
import { splitTimeRange } from '../src/utils/timeRange';

describe('Time Range Parsing', () => {
  test('17:00–23:00 converts to distinct from_time / to_time', () => {
    const [f, t] = splitTimeRange('17:00–23:00');
    expect(f?.hour).toBe(17);
    expect(f?.minute).toBe(0);
    expect(t?.hour).toBe(23);
    expect(t?.minute).toBe(0);
  });

  test('5pm–11pm converts correctly', () => {
    const [f, t] = splitTimeRange('5pm–11pm');
    expect(f?.hour).toBe(17);
    expect(f?.minute).toBe(0);
    expect(t?.hour).toBe(23);
    expect(t?.minute).toBe(0);
  });

  test('22:00–02:00 handles cross-midnight', () => {
    const [f, t] = splitTimeRange('22:00–02:00');
    expect(f?.hour).toBe(22);
    expect(f?.minute).toBe(0);
    expect(t?.hour).toBe(2);
    expect(t?.minute).toBe(0);
  });

  test('handles various separators', () => {
    const [f1, t1] = splitTimeRange('17:00-23:00');
    const [f2, t2] = splitTimeRange('17:00–23:00');
    const [f3, t3] = splitTimeRange('17:00 to 23:00');
    
    expect(f1?.hour).toBe(17);
    expect(t1?.hour).toBe(23);
    expect(f2?.hour).toBe(17);
    expect(t2?.hour).toBe(23);
    expect(f3?.hour).toBe(17);
    expect(t3?.hour).toBe(23);
  });

  test('returns null for invalid input', () => {
    const [f, t] = splitTimeRange('invalid');
    expect(f).toBeNull();
    expect(t).toBeNull();
  });

  test('returns null for empty input', () => {
    const [f, t] = splitTimeRange('');
    expect(f).toBeNull();
    expect(t).toBeNull();
  });

  test('8am-2pm mixed case converts correctly', () => {
    const [f, t] = splitTimeRange('8am-2pm');
    expect(f?.hour).toBe(8);
    expect(f?.minute).toBe(0);
    expect(t?.hour).toBe(14);
    expect(t?.minute).toBe(0);
  });

  test('5 PM–11 PM with spaces converts correctly', () => {
    const [f, t] = splitTimeRange('5 PM–11 PM');
    expect(f?.hour).toBe(17);
    expect(f?.minute).toBe(0);
    expect(t?.hour).toBe(23);
    expect(t?.minute).toBe(0);
  });

  test('ensures distinct times (regression test)', () => {
    const [f, t] = splitTimeRange('17:00–23:00');
    expect(f).not.toEqual(t);
    expect(f?.hour).not.toBe(t?.hour);
  });
});
