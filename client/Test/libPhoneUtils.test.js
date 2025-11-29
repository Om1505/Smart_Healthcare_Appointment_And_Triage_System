import { describe, it, expect } from 'vitest';
import { normalizePhone, shouldClearPhoneError } from '@/lib/phoneUtils';

describe('lib/phoneUtils', () => {
  it('normalizePhone strips non-digits and limits to 10', () => {
    expect(normalizePhone('(123) 456-7890')).toBe('1234567890');
    expect(normalizePhone('12a3b4c5d6e7f8g9h0i1')).toBe('1234567890');
  });

  it('shouldClearPhoneError returns true for empty or 10 digits', () => {
    expect(shouldClearPhoneError('')).toBe(true);
    expect(shouldClearPhoneError('1234567890')).toBe(true);
  });

  it('shouldClearPhoneError returns false for partial digits', () => {
    expect(shouldClearPhoneError('123')).toBe(false);
    expect(shouldClearPhoneError('123456789')).toBe(false);
  });
});
