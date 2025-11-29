import { describe, it, expect, beforeEach } from 'vitest';
import { getAuthToken } from '@/lib/auth';

describe('lib/auth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns token from localStorage when present', () => {
    localStorage.setItem('token', 'abc123');
    expect(getAuthToken()).toBe('abc123');
  });

  it('returns null when token not set', () => {
    expect(getAuthToken()).toBeNull();
  });
});
