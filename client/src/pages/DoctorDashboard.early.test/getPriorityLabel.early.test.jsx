

// Import the function to be tested
describe('getPriorityLabel() getPriorityLabel method', () => {
    // Happy Path Tests
    describe('Happy Paths', () => {
        test('should return "🔴 Immediate (P1)" for priority "RED"', () => {
            const result = getPriorityLabel('RED');
            expect(result).toBe("🔴 Immediate (P1)");
        });

        test('should return "🔴 Immediate (P1)" for priority "P1"', () => {
            const result = getPriorityLabel('P1');
            expect(result).toBe("🔴 Immediate (P1)");
        });

        test('should return "🟡 Urgent (P2)" for priority "YELLOW"', () => {
            const result = getPriorityLabel('YELLOW');
            expect(result).toBe("🟡 Urgent (P2)");
        });

        test('should return "🟡 Urgent (P2)" for priority "P2"', () => {
            const result = getPriorityLabel('P2');
            expect(result).toBe("🟡 Urgent (P2)");
        });

        test('should return "🟢 Minor (P3)" for priority "GREEN"', () => {
            const result = getPriorityLabel('GREEN');
            expect(result).toBe("🟢 Minor (P3)");
        });

        test('should return "🟢 Minor (P3)" for priority "P3"', () => {
            const result = getPriorityLabel('P3');
            expect(result).toBe("🟢 Minor (P3)");
        });

        test('should return "⚫ Non-Urgent (P4)" for priority "BLACK"', () => {
            const result = getPriorityLabel('BLACK');
            expect(result).toBe("⚫ Non-Urgent (P4)");
        });

        test('should return "⚫ Non-Urgent (P4)" for priority "P4"', () => {
            const result = getPriorityLabel('P4');
            expect(result).toBe("⚫ Non-Urgent (P4)");
        });

        test('should return the provided label if label is given', () => {
            const result = getPriorityLabel('RED', 'Custom Label');
            expect(result).toBe('Custom Label');
        });
    });

    // Edge Case Tests
    describe('Edge Cases', () => {
        test('should return "Pending Triage" for an unknown priority', () => {
            const result = getPriorityLabel('UNKNOWN');
            expect(result).toBe("Pending Triage");
        });

        test('should return "Pending Triage" for an empty string priority', () => {
            const result = getPriorityLabel('');
            expect(result).toBe("Pending Triage");
        });

        test('should return "Pending Triage" for a null priority', () => {
            const result = getPriorityLabel(null);
            expect(result).toBe("Pending Triage");
        });

        test('should return "Pending Triage" for an undefined priority', () => {
            const result = getPriorityLabel(undefined);
            expect(result).toBe("Pending Triage");
        });

        test('should return "Pending Triage" for a numeric priority', () => {
            const result = getPriorityLabel(123);
            expect(result).toBe("Pending Triage");
        });

        test('should return "Pending Triage" for a boolean priority', () => {
            const result = getPriorityLabel(true);
            expect(result).toBe("Pending Triage");
        });
    });
});