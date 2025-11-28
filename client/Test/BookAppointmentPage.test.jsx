import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';
import axios from 'axios';
import BookAppointmentPage from '../src/pages/BookAppointmentPage';

// --- GLOBAL MOCKS ---
const mockOpen = vi.fn();
let mockHandler;

// --- MOCKS ---
vi.mock('axios');
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ doctorId: 'doc123' }),
        Link: ({ children, to }) => <a href={to}>{children}</a>,
    };
});

vi.mock('lucide-react', () => ({
    Calendar: () => <span data-testid="icon-calendar" />,
    ArrowRight: () => <span data-testid="icon-arrow-right" />,
    ArrowLeft: () => <span data-testid="icon-arrow-left" />,
    AlertTriangle: () => <span data-testid="icon-alert" />,
    Loader2: () => <span data-testid="icon-loader" />,
}));

// --- UI COMPONENT MOCKS ---
vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled }) => (
        <button onClick={onClick} disabled={disabled}>{children}</button>
    ),
}));
vi.mock('@/components/ui/card', () => ({
    Card: ({ children }) => <div data-testid="card">{children}</div>,
    CardContent: ({ children }) => <div>{children}</div>,
    CardDescription: ({ children }) => <p>{children}</p>,
    CardHeader: ({ children }) => <div>{children}</div>,
    CardTitle: ({ children }) => <h2>{children}</h2>,
}));
vi.mock('@/components/ui/input', () => ({
    Input: ({ value, onChange, id, ...props }) => (
        <input value={value || ''} onChange={onChange} id={id} data-testid={id} {...props} />
    ),
}));
vi.mock('@/components/ui/label', () => ({
    Label: ({ children, htmlFor }) => <label htmlFor={htmlFor}>{children}</label>,
}));
vi.mock('@/components/ui/textarea', () => ({
    Textarea: ({ value, onChange, id, ...props }) => (
        <textarea value={value || ''} onChange={onChange} id={id} data-testid={id} {...props} />
    ),
}));
vi.mock('@/components/ui/badge', () => ({
    Badge: ({ children }) => <span>{children}</span>,
}));
vi.mock('@/components/ui/avatar', () => ({
    Avatar: ({ children }) => <div>{children}</div>,
    AvatarFallback: ({ children }) => <span>{children}</span>,
    AvatarImage: () => <img alt="avatar" />,
}));
vi.mock('@/components/ui/checkbox', () => ({
    Checkbox: ({ onCheckedChange, checked, id }) => (
        <input
            type="checkbox"
            onChange={(e) => onCheckedChange(e.target.checked)}
            checked={!!checked}
            id={id}
            data-testid={id}
        />
    ),
}));

// Clean Radio Group Mock
vi.mock('@/components/ui/radio-group', () => {
    const passPropsToItems = (children, props) => {
        return React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return child;
            if (child.props.value) return React.cloneElement(child, props);
            if (child.props.children) {
                return React.cloneElement(child, {
                    children: passPropsToItems(child.props.children, props)
                });
            }
            return child;
        });
    };
    return {
        RadioGroup: ({ children, onValueChange, value }) => (
            <div role="radiogroup" data-testid="symptomsBegin-group">
                {passPropsToItems(children, {
                    _onValueChange: onValueChange,
                    _currentValue: value
                })}
            </div>
        ),
        RadioGroupItem: ({ value, id, _onValueChange, _currentValue }) => (
            <input
                type="radio"
                value={value}
                id={id}
                name="radio-group"
                checked={value === _currentValue}
                onClick={() => _onValueChange && _onValueChange(value)}
                readOnly
            />
        ),
    };
});

// FIX: Valid HTML Select Mock
vi.mock('@/components/ui/select', () => ({
    Select: ({ children, onValueChange, value }) => (
        <select
            data-testid="sex"
            value={value || ''}
            onChange={(e) => onValueChange(e.target.value)}
        >
            {/* Hardcoded options to avoid DOM nesting issues with sub-components */}
            <option value="">Select sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
        </select>
    ),
    SelectContent: () => null,
    SelectItem: () => null,
    SelectTrigger: () => null,
    SelectValue: () => null,
}));

vi.mock('@/components/ui/alert', () => ({
    Alert: ({ children }) => <div>{children}</div>,
    AlertDescription: ({ children }) => <p>{children}</p>,
    AlertTitle: ({ children }) => <h3>{children}</h3>,
}));

// --- Mock Data ---
const mockDoctor = {
    fullName: 'Dr. Test',
    specialization: 'Testing',
    consultationFee: 1500,
};
const mockProfile = {
    fullName: 'Test Patient',
    email: 'patient@test.com',
};
const mockSlots = [
    { date: '2020-01-01', time: '10:00 AM' },
    { date: '2099-12-31', time: '10:00 AM' },
];
const mockOrder = { orderId: 'order_123', amount: 150000, currency: 'INR' };
const mockRazorpayResponse = {
    razorpay_order_id: 'order_123',
    razorpay_payment_id: 'pay_123',
    razorpay_signature: 'sig_123',
};

// --- Helper Functions ---
const renderComponent = () => {
    const { unmount } = render(
        <MemoryRouter initialEntries={['/book/doc123']}>
            <Routes>
                <Route path="/book/:doctorId" element={<BookAppointmentPage />} />
                <Route path="/login" element={<div>Login Page</div>} />
                <Route path="/patient/dashboard" element={<div>Patient Dashboard</div>} />
                <Route path="/" element={<div>Home Page</div>} />
            </Routes>
        </MemoryRouter>
    );
    return { unmount };
};

const fillStep2Form = async () => {
    fireEvent.change(screen.getByTestId('patientNameForVisit'), { target: { value: 'Test Patient' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'patient@test.com' } });
    fireEvent.change(screen.getByTestId('phoneNumber'), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByTestId('birthDate'), { target: { value: '1990-01-01' } });
    fireEvent.change(screen.getByTestId('primaryLanguage'), { target: { value: 'English' } });
    fireEvent.change(screen.getByTestId('primaryReason'), { target: { value: 'Checkup' } });

    // Handle Select mock specifically
    fireEvent.change(screen.getByTestId('sex'), { target: { value: 'Male' } });

    const symptomRadio = screen.getByLabelText('1-3 days ago');
    fireEvent.click(symptomRadio);

    fireEvent.click(screen.getByTestId('none-severe'));
    fireEvent.click(screen.getByTestId('emergencyDisclaimer'));
    fireEvent.click(screen.getByTestId('consentToAI'));
};

// --- Test Suite ---
describe('BookAppointmentPage', () => {
    let appendSpy;
    let removeSpy;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('token', 'fake-token');

        vi.stubGlobal('Razorpay', class {
            constructor(options) {
                mockHandler = options.handler;
                return { open: mockOpen };
            }
        });

        window.alert = vi.fn();

        appendSpy = vi.spyOn(document.body, 'appendChild');
        removeSpy = vi.spyOn(document.body, 'removeChild');

        axios.get.mockImplementation((url) => {
            if (url.includes('/api/doctors/')) return Promise.resolve({ data: mockDoctor });
            if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockProfile });
            if (url.includes('/api/appointments/available-slots/')) return Promise.resolve({ data: mockSlots });
            return Promise.reject(new Error('Not mocked'));
        });
        axios.post.mockResolvedValue({ data: {} });
    });

    afterEach(() => {
        appendSpy.mockRestore();
        removeSpy.mockRestore();
        vi.unstubAllGlobals();
    });

    it('redirects to /login if no token is found', async () => {
        localStorage.removeItem('token');
        renderComponent();
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    it('shows main loading spinner initially', async () => {
        axios.get.mockImplementation(() => new Promise(() => { }));
        renderComponent();
        expect(await screen.findAllByTestId('icon-loader')).not.toHaveLength(0);
    });

    it('shows error if doctor/profile fetch fails', async () => {
        axios.get.mockRejectedValue(new Error('Failed to fetch'));
        renderComponent();
        expect(await screen.findByText(/Failed to fetch page details/i)).toBeInTheDocument();
    });

    it('pre-fills user data after loading', async () => {
        renderComponent();
        const slotBtn = await screen.findByText('10:00 AM');
        fireEvent.click(slotBtn);
        const nextBtn = screen.getByRole('button', { name: /Next Step/i });
        await waitFor(() => expect(nextBtn).toBeEnabled());
        fireEvent.click(nextBtn);

        expect(await screen.findByDisplayValue('Test Patient')).toBeInTheDocument();
        expect(screen.getByDisplayValue('patient@test.com')).toBeInTheDocument();
    });

    // --- FIX: Corrected Text Matcher ---
    it('shows slot loading spinner', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/doctors/')) return Promise.resolve({ data: mockDoctor });
            if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockProfile });
            if (url.includes('/api/appointments/available-slots/')) return new Promise(() => { });
            return Promise.reject(new Error('Not mocked'));
        });
        renderComponent();
        // Matched exactly "Loading slots..." from your component code
        expect(await screen.findByText('Loading slots...')).toBeInTheDocument();
    });

    it('shows "No available slots found" when API returns no future slots', async () => {
        // Mock API such that no future slots remain
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/doctors/')) return Promise.resolve({ data: mockDoctor });
            if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockProfile });
            if (url.includes('/api/appointments/available-slots/'))
                return Promise.resolve({ data: [] }); // 👈 force NO slots

            return Promise.reject(new Error('Not mocked'));
        });

        renderComponent();

        // Wait for the "No available slots" UI
        expect(await screen.findByText('No available slots found.')).toBeInTheDocument();
        expect(screen.getByText('Please try a different date or check back later.')).toBeInTheDocument();

        // Step 1 "Next Step" must remain disabled
        const nextBtn = screen.getByRole('button', { name: /Next Step/i });
        expect(nextBtn).toBeDisabled();
    });

    it('filters out past slots', async () => {
        renderComponent();
        expect(await screen.findByText(/2099/)).toBeInTheDocument();
        expect(screen.queryByText(/2020/)).not.toBeInTheDocument();
    });

    it('moves from step 1 to 2', async () => {
        renderComponent();
        const nextBtn = await screen.findByRole('button', { name: /Next Step/i });
        expect(nextBtn).toBeDisabled();

        const slotBtn = await screen.findByText('10:00 AM');
        fireEvent.click(slotBtn);
        expect(nextBtn).toBeEnabled();

        fireEvent.click(nextBtn);
        expect(await screen.findByText('Appointment Details')).toBeInTheDocument();
    });

    it('validates phone number and birth date on step 2', async () => {
        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

        const phoneInput = await screen.findByTestId('phoneNumber');
        fireEvent.change(phoneInput, { target: { value: '123' } });
        expect(await screen.findByText('Phone number must be 10 digits.')).toBeInTheDocument();

        fireEvent.change(phoneInput, { target: { value: '1234567890' } });
        expect(screen.queryByText('Phone number must be 10 digits.')).not.toBeInTheDocument();

        const dateInput = screen.getByTestId('birthDate');
        fireEvent.change(dateInput, { target: { value: '2099-01-01' } });
        expect(await screen.findByText('Date of birth cannot be in the future.')).toBeInTheDocument();

        fireEvent.change(dateInput, { target: { value: '1990-01-01' } });
        expect(screen.queryByText('Date of birth cannot be in the future.')).not.toBeInTheDocument();
    });

    it('stops updating phone number when more than 10 digits are entered', async () => {
        renderComponent();

        // Go to Step 2
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

        const phoneInput = await screen.findByTestId('phoneNumber');

        // First set a valid 10-digit number
        fireEvent.change(phoneInput, { target: { value: '1234567890' } });
        expect(phoneInput.value).toBe('1234567890');

        // Now try to enter 11 digits – handler should early-return and not change state
        fireEvent.change(phoneInput, { target: { value: '12345678901' } });

        // Because the component is controlled, value should stay at the valid 10-digit number
        expect(phoneInput.value).toBe('1234567890');
    });


    it('handles checklist "None of the above" logic', async () => {
        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

        const noneSevere = screen.getByTestId('none-severe');
        const chestPain = screen.getByLabelText(/Severe chest pain/i);

        fireEvent.click(chestPain);
        expect(chestPain.checked).toBe(true);

        fireEvent.click(noneSevere);
        expect(noneSevere.checked).toBe(true);
        expect(chestPain.checked).toBe(false);

        fireEvent.click(chestPain);
        expect(chestPain.checked).toBe(true);
        expect(noneSevere.checked).toBe(false);
    });

    it('enables step 3 button only when step 2 is valid', async () => {
        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

        const nextBtn = await screen.findByRole('button', { name: /Review Booking/i });
        expect(nextBtn).toBeDisabled();

        await act(async () => {
            await fillStep2Form();
        });

        await waitFor(() => {
            expect(nextBtn).toBeEnabled();
        });
    });

    it('updates generic fields (name, email) using handleDetailsChange', async () => {
        renderComponent();

        // Go to Step 2
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

        const nameInput = await screen.findByTestId('patientNameForVisit');
        fireEvent.change(nameInput, { target: { value: 'New Name' } });
        expect(nameInput.value).toBe('New Name');


        const emailInput = screen.getByTestId('email');
        fireEvent.change(emailInput, { target: { value: 'newemail@test.com' } });
        expect(emailInput.value).toBe('newemail@test.com');
    });


    it('goes from step 2 to 3 and back', async () => {
        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

        await act(async () => { await fillStep2Form(); });

        const reviewBtn = screen.getByRole('button', { name: /Review Booking/i });
        await waitFor(() => expect(reviewBtn).toBeEnabled());
        fireEvent.click(reviewBtn);

        expect(await screen.findByText('Confirm Your Appointment')).toBeInTheDocument();

        const doctorHeadings = await screen.findAllByText('Dr. Test');
        expect(doctorHeadings.length).toBeGreaterThan(0);

        expect(screen.getByText('Checkup')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Back/i }));
        expect(await screen.findByText('Appointment Details')).toBeInTheDocument();
    });

    it('navigates back from step 2 to step 1 using Back button', async () => {
        renderComponent();

        // Go to Step 2
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

        // Click Back button
        const backBtn = screen.getByRole('button', { name: /Back/i });
        fireEvent.click(backBtn);

        // Step 1 screen should reappear
        expect(await screen.findByText('Select Appointment Time')).toBeInTheDocument();
    });

    it('handles "Confirm Booking" (payment) flow success', async () => {
        axios.post.mockResolvedValueOnce({ data: mockOrder });
        axios.post.mockResolvedValueOnce({ data: { success: true } });

        renderComponent();

        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
        await act(async () => { await fillStep2Form(); });

        const reviewBtn = screen.getByRole('button', { name: /Review Booking/i });
        await waitFor(() => expect(reviewBtn).toBeEnabled());
        fireEvent.click(reviewBtn);

        const paymentBtn = await screen.findByRole('button', { name: /Pay & Book/i });
        fireEvent.click(paymentBtn);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/appointments/create-payment-order'),
                expect.any(Object),
                expect.any(Object)
            );
        });

        await act(async () => {
            mockHandler(mockRazorpayResponse);
        });

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/appointments/verify-payment'),
                expect.objectContaining({ razorpay_order_id: 'order_123' }),
                expect.any(Object)
            );
        });

        expect(window.alert).toHaveBeenCalledWith('Payment successful! Appointment booked.');
        expect(mockNavigate).toHaveBeenCalledWith('/patient/dashboard');
    });

    it('handles payment initiation failure', async () => {
        axios.post.mockRejectedValue(new Error('Order creation failed'));
        renderComponent();

        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
        await act(async () => { await fillStep2Form(); });

        const reviewBtn = screen.getByRole('button', { name: /Review Booking/i });
        await waitFor(() => expect(reviewBtn).toBeEnabled());
        fireEvent.click(reviewBtn);

        fireEvent.click(await screen.findByRole('button', { name: /Pay & Book/i }));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Failed to initiate payment. Please try again.');
        });
    });

    it('handles payment verification failure (API reject)', async () => {
        axios.post.mockResolvedValueOnce({ data: mockOrder });
        axios.post.mockRejectedValueOnce(new Error('Verify failed'));

        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
        await act(async () => { await fillStep2Form(); });

        const reviewBtn = screen.getByRole('button', { name: /Review Booking/i });
        await waitFor(() => expect(reviewBtn).toBeEnabled());
        fireEvent.click(reviewBtn);

        const paymentBtn = await screen.findByRole('button', { name: /Pay & Book/i });
        fireEvent.click(paymentBtn);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/appointments/create-payment-order'),
                expect.any(Object),
                expect.any(Object)
            );
        });

        await act(async () => {
            mockHandler(mockRazorpayResponse);
        });

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Payment verification failed. Please contact support.');
        });
    });

    it('handles cleanup gracefully if script is already missing', async () => {
        const { unmount } = renderComponent();

        // 1. Wait for the script to be added by the component
        await waitFor(() => {
            expect(document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')).toBeInTheDocument();
        });
        // 2. Manually remove the script to simulate it being missing
        const script = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (script) script.remove();

        // 3. Unmount the component
        unmount();

        // If the test finishes without crashing, the code handled the missing script correctly
        expect(document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')).toBeNull();
    });

    it('handles payment verification failure (success: false)', async () => {
        axios.post.mockResolvedValueOnce({ data: mockOrder });
        axios.post.mockResolvedValueOnce({ data: { success: false } });

        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
        await act(async () => { await fillStep2Form(); });

        const reviewBtn = screen.getByRole('button', { name: /Review Booking/i });
        await waitFor(() => expect(reviewBtn).toBeEnabled());
        fireEvent.click(reviewBtn);

        const paymentBtn = await screen.findByRole('button', { name: /Pay & Book/i });
        fireEvent.click(paymentBtn);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/appointments/create-payment-order'),
                expect.any(Object),
                expect.any(Object)
            );
        });

        await act(async () => {
            mockHandler(mockRazorpayResponse);
        });

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Payment verification failed. Please contact support.');
        });
    });

    it('cleans up Razorpay script on unmount', async () => {
        const { unmount } = renderComponent();
        await waitFor(() => {
            expect(appendSpy).toHaveBeenCalledWith(
                expect.objectContaining({ src: 'https://checkout.razorpay.com/v1/checkout.js' })
            );
        });
        unmount();
        expect(removeSpy).toHaveBeenCalled();
    });

    it('handles "None of the above" logic for family history', async () => {
        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

        const famDiabetes = screen.getByLabelText('Diabetes');
        const noneFam = screen.getByTestId('none-fam');

        fireEvent.click(famDiabetes);
        expect(famDiabetes.checked).toBe(true);
        fireEvent.click(noneFam);
        expect(famDiabetes.checked).toBe(false);
    });

    it('handles changes in all "other" text fields and textareas', async () => {
        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

        const symptomsOther = screen.getByPlaceholderText('Other symptoms...');
        const preExistingOther = screen.getByPlaceholderText('Other conditions...');
        const pastSurgeries = screen.getByLabelText(/Past surgeries or hospitalizations/i);
        const familyHistoryOther = screen.getByPlaceholderText('If cancer, specify type...');
        const allergies = screen.getByLabelText(/Allergies \(Food, Drug, Seasonal\)/i);
        const medications = screen.getByLabelText(/Current Medications/i);

        fireEvent.change(symptomsOther, { target: { value: 'test1' } });
        fireEvent.change(preExistingOther, { target: { value: 'test2' } });
        fireEvent.change(pastSurgeries, { target: { value: 'test3' } });
        fireEvent.change(familyHistoryOther, { target: { value: 'test4' } });
        fireEvent.change(allergies, { target: { value: 'test5' } });
        fireEvent.change(medications, { target: { value: 'test6' } });

        expect(symptomsOther.value).toBe('test1');
        expect(preExistingOther.value).toBe('test2');
        expect(pastSurgeries.value).toBe('test3');
        expect(familyHistoryOther.value).toBe('test4');
        expect(allergies.value).toBe('test5');
        expect(medications.value).toBe('test6');
    });

    it('handles un-checking a symptom', async () => {
        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

        const feverCheckbox = await screen.findByLabelText('Fever');

        fireEvent.click(feverCheckbox);
        expect(feverCheckbox.checked).toBe(true);

        fireEvent.click(feverCheckbox);
        expect(feverCheckbox.checked).toBe(false);
    });

    it('does not book or pay if token is missing on button click', async () => {
        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
        await act(async () => { await fillStep2Form(); });
        const reviewBtn = screen.getByRole('button', { name: /Review Booking/i });
        await waitFor(() => expect(reviewBtn).toBeEnabled());
        fireEvent.click(reviewBtn);

        // Now remove the token
        localStorage.removeItem('token');

        fireEvent.click(await screen.findByRole('button', { name: /Pay & Book/i }));

        expect(axios.post).not.toHaveBeenCalled();
        expect(window.alert).toHaveBeenCalledWith("You must be logged in to make a payment.");
    });

    it('navigates to dashboard on nav button click', async () => {
        renderComponent();
        const dashboardButton = await screen.findByRole('button', { name: 'Dashboard' });
        fireEvent.click(dashboardButton);
        expect(mockNavigate).toHaveBeenCalledWith('/patient/dashboard');
    });

    // --- NEW TEST: Covers form errors blocking payment ---
    it('prevents payment if form errors exist', async () => {
        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

        // Trigger error
        const phoneInput = screen.getByTestId('phoneNumber');
        fireEvent.change(phoneInput, { target: { value: '123' } }); // Too short
        expect(screen.getByText('Phone number must be 10 digits.')).toBeInTheDocument();

        // Fill other required fields to enable "Review Booking"
        await act(async () => { await fillStep2Form(); }); // This overwrites phone to valid

        // Re-trigger error
        fireEvent.change(phoneInput, { target: { value: '123' } });

        const reviewBtn = screen.getByRole('button', { name: /Review Booking/i });
        expect(reviewBtn).toBeDisabled();
    });

    it('handles pre-existing conditions checklist correctly', async () => {
        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

        const hypertension = screen.getByLabelText('Hypertension (High Blood Pressure)');

        // Select item
        fireEvent.click(hypertension);
        expect(hypertension.checked).toBe(true);

        // Unselect item
        fireEvent.click(hypertension);
        expect(hypertension.checked).toBe(false);
    });

    it('handles family history checklist selection and unselection', async () => {
        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

        const diabetesFam = screen.getByLabelText('Diabetes');

        fireEvent.click(diabetesFam);
        expect(diabetesFam.checked).toBe(true);

        fireEvent.click(diabetesFam);
        expect(diabetesFam.checked).toBe(false);
    });


});