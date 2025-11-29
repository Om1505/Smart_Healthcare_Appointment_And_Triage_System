export function normalizePhone(value) {
    return value.replace(/\D/g, '').slice(0, 10);
}

export function shouldClearPhoneError(digitsOnly) {
    return digitsOnly.length === 0 || digitsOnly.length === 10;
}
