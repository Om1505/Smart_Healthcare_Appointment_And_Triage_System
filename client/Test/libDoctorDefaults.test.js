import { describe, it, expect } from 'vitest';
import { DEFAULT_FORM_DATA, SPECIALIZATIONS, DEFAULT_ERROR, DEFAULT_SUCCESS, DEFAULT_SUCCESS_TEXT, ERROR_FETCH_TEXT, ERROR_UPDATE_TEXT } from '@/lib/doctorDefaults';

describe('lib/doctorDefaults', () => {
  it('DEFAULT_FORM_DATA has expected keys and empty values', () => {
    const keys = ['fullName','email','specialization','experience','licenseNumber','address','consultationFee','bio','phoneNumber'];
    keys.forEach(k => expect(DEFAULT_FORM_DATA).toHaveProperty(k, ''));
  });

  it('SPECIALIZATIONS contains common specialties', () => {
    expect(SPECIALIZATIONS).toContain('Cardiology');
    expect(SPECIALIZATIONS).toContain('Neurology');
    expect(Array.isArray(SPECIALIZATIONS)).toBe(true);
  });

  it('text constants have expected values', () => {
    expect(DEFAULT_ERROR).toBe('');
    expect(DEFAULT_SUCCESS).toBe('');
    expect(DEFAULT_SUCCESS_TEXT).toBe('Profile updated successfully!');
    expect(ERROR_FETCH_TEXT).toBe('Failed to fetch doctor profile. Please try again.');
    expect(ERROR_UPDATE_TEXT).toBe('Failed to update profile. Please try again.');
  });
});
