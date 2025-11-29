import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBadgeVariant, getBadgeText, parseFileNameFromContentDisposition, defaultFileNameForEarnings, getInitials, getAuthHeaders, ERROR_FETCH_EARNINGS } from '@/lib/earningUtils';
import * as auth from '@/lib/auth';

vi.mock('@/lib/auth');

describe('earningUtils helpers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('getAuthHeaders returns correct header object', () => {
        auth.getAuthToken.mockReturnValue('test-token-123');
        const headers = getAuthHeaders();
        expect(headers).toEqual({
            headers: { Authorization: 'Bearer test-token-123' }
        });
        expect(auth.getAuthToken).toHaveBeenCalledOnce();
    });

    it('ERROR_FETCH_EARNINGS returns correct message with status', () => {
        expect(ERROR_FETCH_EARNINGS(404)).toBe('Failed to fetch earnings data (404).');
    });

    it('ERROR_FETCH_EARNINGS returns correct message without status', () => {
        expect(ERROR_FETCH_EARNINGS()).toBe('Failed to fetch earnings data (Network Error).');
    });

    it('returns correct badge variant for completed', () => {
        expect(getBadgeVariant('completed')).toBe('default');
    });

    it('returns correct badge variant for upcoming', () => {
        expect(getBadgeVariant('upcoming')).toBe('secondary');
    });

    it('returns correct badge text for completed', () => {
        expect(getBadgeText('completed')).toBe('Completed');
    });

    it('returns correct badge text for upcoming', () => {
        expect(getBadgeText('upcoming')).toBe('Upcoming');
    });

    it('parses filename from content-disposition header', () => {
        const header = 'attachment; filename="report-2025-11-01.csv"';
        expect(parseFileNameFromContentDisposition(header)).toBe('report-2025-11-01.csv');
    });

    it('parses filename using fallback pattern without quotes', () => {
        const header = 'attachment; filename=earnings.csv';
        expect(parseFileNameFromContentDisposition(header)).toBe('earnings.csv');
    });

    it('parses filename using fallback pattern with spaces', () => {
        const header = 'inline; filename = "data report.txt"';
        expect(parseFileNameFromContentDisposition(header)).toBe('data report.txt');
    });

    it('returns null when fallback pattern matches but no filename captured', () => {
        const header = 'attachment; filename=';
        expect(parseFileNameFromContentDisposition(header)).toBeNull();
    });

    it('returns null when content-disposition header missing', () => {
        expect(parseFileNameFromContentDisposition(null)).toBeNull();
    });

    it('default filename matches expected pattern', () => {
        const name = defaultFileNameForEarnings();
        expect(name).toMatch(/^earnings-report-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('getInitials returns initials or Dr when name missing', () => {
        expect(getInitials('John Doe')).toBe('JD');
        expect(getInitials('Single')).toBe('S');
        expect(getInitials(null)).toBe('Dr');
    });
});
