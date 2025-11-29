import { getAuthToken } from '@/lib/auth';

export function getAuthHeaders() {
    const token = getAuthToken();
    return { headers: { Authorization: `Bearer ${token}` } };
}

export const ERROR_FETCH_EARNINGS = (status) => `Failed to fetch earnings data (${status || 'Network Error'}).`;

export function defaultFileNameForEarnings() {
    return `earnings-report-${new Date().toISOString().split('T')[0]}.csv`;
}

export function parseFileNameFromContentDisposition(headerValue) {
    if (!headerValue) return null;
    // Support both filename and filename* patterns and tolerate quotes
    const match = headerValue.match(/filename\*?=(?:UTF-8''|)\s*['"]?([^"';]+)/i);
    if (match && match[1]) return match[1].trim();
    // Fallback: try a looser match
    const loose = headerValue.match(/filename\s*=\s*"?([^";]+)"?/i);
    return loose && loose[1] ? loose[1].trim() : null;
}

export function getInitials(name) {
    if (!name) return 'Dr';
    return name.split(" ").map(n => n[0]).join("");
}

export function getBadgeVariant(status) {
    return status === 'completed' ? 'default' : 'secondary';
}

export function getBadgeText(status) {
    return status === 'upcoming' ? 'Upcoming' : 'Completed';
}
