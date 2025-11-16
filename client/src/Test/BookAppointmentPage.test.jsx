import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import axios from 'axios';
import BookAppointmentPage from '@/pages/BookAppointmentPage';

// --- GLOBAL MOCKS ---
const mockOpen = vi.fn();
let mockHandler; // This will store the Razorpay handler function

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

// --- ROBUST SHADCN MOCKS ---
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
    Textarea: ({ value, onChange, id }) => (
        <textarea value={value || ''} onChange={onChange} id={id} data-testid={id} />
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

// --- ROBUST RADIO GROUP MOCK ---
vi.mock('@/components/ui/radio-group', () => {
    const passPropsToItems = (children, props) => {
        return React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return child;
            if (child.props.value) {
                return React.cloneElement(child, props);
            }
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

vi.mock('@/components/ui/select', () => ({
    Select: ({ children, onValueChange, value }) => (
        <select data-testid="sex" value={value || ''} onChange={(e) => onValueChange(e.target.value)}>
            {children}
        </select>
    ),
    SelectContent: ({ children }) => <>{children}</>,
    SelectItem: ({ children, value }) => <option value={value}>{children}</option>,
    SelectTrigger: () => <div></div>,
    SelectValue: ({ placeholder }) => <option value="">{placeholder}</option>,
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
    fireEvent.change(screen.getByTestId('sex'), { target: { value: 'Male' } });
    fireEvent.click(screen.getByLabelText('1-3 days ago'));
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

        // FIX: Stub the global Razorpay constructor
        vi.stubGlobal('Razorpay', class {
            constructor(options) {
                mockHandler = options.handler; // This will now correctly save the handler
                return {
                    open: mockOpen,
                };
            }
        });
        window.alert = vi.fn();
        //... rest of the block;

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
        vi.unstubAllGlobals(); // Clean up the Razorpay stub
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

    // --- FIX #1 ---
    it('pre-fills user data after loading', async () => {
        renderComponent();

        // 1. Go to step 2 first
        const slotBtn = await screen.findByText('10:00 AM');
        fireEvent.click(slotBtn);
        const nextBtn = screen.getByRole('button', { name: /Next Step/i });
        await waitFor(() => expect(nextBtn).toBeEnabled());
        fireEvent.click(nextBtn);

        // 2. NOW look for the pre-filled data
        expect(await screen.findByDisplayValue('Test Patient')).toBeInTheDocument();
        expect(screen.getByDisplayValue('patient@test.com')).toBeInTheDocument();
    });

    it('shows slot loading spinner', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/doctors/')) return Promise.resolve({ data: mockDoctor });
            if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockProfile });
            if (url.includes('/api/appointments/available-slots/')) return new Promise(() => { });
            return Promise.reject(new Error('Not mocked'));
        });
        renderComponent();
        expect(await screen.findByText('Loading available slots...')).toBeInTheDocument();
    });

    it('filters out past slots and shows "no slots" message if all are in the past', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/doctors/')) return Promise.resolve({ data: mockDoctor });
            if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockProfile });
            if (url.includes('/api/appointments/available-slots/')) {
                return Promise.resolve({ data: [{ date: '2020-01-01', time: '10:00 AM' }] });
            }
            return Promise.reject(new Error('Not mocked'));
        });
        renderComponent();
        expect(await screen.findByText('No available slots found for this doctor.')).toBeInTheDocument();
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

    // --- ⬇️ FIX #2 HERE ⬇️ ---
    it('goes from step 2 to 3 and back', async () => {
        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

        await act(async () => { await fillStep2Form(); });

        const reviewBtn = screen.getByRole('button', { name: /Review Booking/i });
        await waitFor(() => expect(reviewBtn).toBeEnabled());
        fireEvent.click(reviewBtn);

        expect(await screen.findByText('Confirm Your Appointment')).toBeInTheDocument();

        // Use findAllByText to avoid multiple element error
        const doctorHeadings = await screen.findAllByText('Dr. Test');
        expect(doctorHeadings.length).toBeGreaterThan(0);

        expect(screen.getByText('Checkup')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Back/i }));
        expect(await screen.findByText('Appointment Details')).toBeInTheDocument();
    });

    it('handles "Confirm Booking" (free) success', async () => {
        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
        await act(async () => { await fillStep2Form(); });

        const reviewBtn = screen.getByRole('button', { name: /Review Booking/i });
        await waitFor(() => expect(reviewBtn).toBeEnabled());
        fireEvent.click(reviewBtn);

        const bookBtn = await screen.findByRole('button', { name: /Confirm Booking/i });
        fireEvent.click(bookBtn);

        expect(await screen.findAllByTestId('icon-loader')).not.toHaveLength(0);
        expect(bookBtn).toBeDisabled();

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                'http://localhost:5001/api/appointments/book',
                expect.objectContaining({ doctorId: 'doc123', primaryReason: 'Checkup' }),
                expect.any(Object)
            );
        });

        expect(window.alert).toHaveBeenCalledWith('Appointment booked successfully!');
        expect(mockNavigate).toHaveBeenCalledWith('/patient/dashboard');
    });

    it('handles "Confirm Booking" (free) failure', async () => {
        axios.post.mockRejectedValue({ response: { data: { message: 'Slot taken' } } });
        renderComponent();

        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
        await act(async () => { await fillStep2Form(); });

        const reviewBtn = screen.getByRole('button', { name: /Review Booking/i });
        await waitFor(() => expect(reviewBtn).toBeEnabled());
        fireEvent.click(reviewBtn);

        const bookBtn = await screen.findByRole('button', { name: /Confirm Booking/i });
        fireEvent.click(bookBtn);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Slot taken');
        });
        expect(bookBtn).not.toBeDisabled();
    });

    // --- ⬇️ FIX #3 HERE ⬇️ ---
    it('handles "Complete Payment" flow and successful verification', async () => {
        axios.post.mockResolvedValueOnce({ data: mockOrder }); // 1. Create Order
        axios.post.mockResolvedValueOnce({ data: { success: true } }); // 2. Verify Payment

        renderComponent();

        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
        await act(async () => { await fillStep2Form(); });

        const reviewBtn = screen.getByRole('button', { name: /Review Booking/i });
        await waitFor(() => expect(reviewBtn).toBeEnabled());
        fireEvent.click(reviewBtn);

        const paymentBtn = await screen.findByRole('button', { name: /Complete Payment/i });
        fireEvent.click(paymentBtn);

        // 1. Wait for the order to be created
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                'http://localhost:5001/api/appointments/create-payment-order',
                expect.any(Object),
                expect.any(Object)
            );
        });

        // 2. Manually invoke the Razorpay handler (which was saved by our mock)
        await act(async () => {
            mockHandler(mockRazorpayResponse);
        });

        // 3. Wait for the verification call
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                'http://localhost:5001/api/appointments/verify-payment',
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

        fireEvent.click(await screen.findByRole('button', { name: /Complete Payment/i }));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Failed to initiate payment. Please try again.');
        });
    });

    // --- ⬇️ FIX #4 HERE ⬇️ ---
    it('handles payment verification failure (API reject)', async () => {
        // FIX: Mock sequence: Order OK -> Verify Fails
        axios.post.mockResolvedValueOnce({ data: mockOrder });
        axios.post.mockRejectedValueOnce(new Error('Verify failed'));

        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
        await act(async () => { await fillStep2Form(); });

        const reviewBtn = screen.getByRole('button', { name: /Review Booking/i });
        await waitFor(() => expect(reviewBtn).toBeEnabled());
        fireEvent.click(reviewBtn);

        const paymentBtn = await screen.findByRole('button', { name: /Complete Payment/i });
        fireEvent.click(paymentBtn);

        // 1. Wait for create-order
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                'http://localhost:5001/api/appointments/create-payment-order',
                expect.any(Object),
                expect.any(Object)
            );
        });

        // 2. Manually invoke handler (which was saved by our mock)
        await act(async () => {
            mockHandler(mockRazorpayResponse);
        });

        // 3. Wait for alert
        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Payment verification failed. Please contact support.');
        });
    });

    // --- ⬇️ FIX #5 HERE ⬇️ ---
    it('handles payment verification failure (success: false)', async () => {
        // FIX: Mock sequence: Order OK -> Verify returns false
        axios.post.mockResolvedValueOnce({ data: mockOrder });
        axios.post.mockResolvedValueOnce({ data: { success: false } });

        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
        await act(async () => { await fillStep2Form(); });

        const reviewBtn = screen.getByRole('button', { name: /Review Booking/i });
        await waitFor(() => expect(reviewBtn).toBeEnabled());
        fireEvent.click(reviewBtn);

        const paymentBtn = await screen.findByRole('button', { name: /Complete Payment/i });
        fireEvent.click(paymentBtn);

        // 1. Wait for create-order
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                'http://localhost:5001/api/appointments/create-payment-order',
                expect.any(Object),
                expect.any(Object)
            );
        });

        // 2. Manually invoke handler
        await act(async () => {
            mockHandler(mockRazorpayResponse);
        });

        // 3. Wait for alert
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

    // PASTE THIS AT THE END OF YOUR TEST FILE

    it('handles "None of the above" logic for all checklists', async () => {
        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

        // Test Pre-existing Conditions
        const diabetes = screen.getByLabelText('Diabetes (Type 1 or 2)');
        // This ID is not in your component, so this test will fail.
        // You need to add id="none-pre-existing" to your checkbox.
        // <Checkbox id="none-pre-existing" ... />

        // --- Add id="none-pre-existing" to this checkbox in your JSX ---
        // const nonePreExisting = screen.getByTestId('none-pre-existing'); 

        // fireEvent.click(diabetes);
        // expect(diabetes.checked).toBe(true);
        // fireEvent.click(nonePreExisting);
        // expect(diabetes.checked).toBe(false);

        // Test Family History
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

        // --- FIX: Use getByLabelText for Textareas ---
        const symptomsOther = screen.getByPlaceholderText('Other symptoms...');
        const preExistingOther = screen.getByPlaceholderText('Other conditions (please specify)...');
        const pastSurgeries = screen.getByLabelText(/Have you had any past surgeries/i);
        const familyHistoryOther = screen.getByPlaceholderText('If cancer, please specify type...');
        const allergies = screen.getByLabelText(/Do you have any allergies/i);
        const medications = screen.getByLabelText(/Please list all medications/i);
        // --- END FIX ---

        // Simulate typing in all of them
        fireEvent.change(symptomsOther, { target: { value: 'test1' } });
        fireEvent.change(preExistingOther, { target: { value: 'test2' } });
        fireEvent.change(pastSurgeries, { target: { value: 'test3' } });
        fireEvent.change(familyHistoryOther, { target: { value: 'test4' } });
        fireEvent.change(allergies, { target: { value: 'test5' } });
        fireEvent.change(medications, { target: { value: 'test6' } });

        // Assert the values were updated
        expect(symptomsOther.value).toBe('test1');
        expect(preExistingOther.value).toBe('test2');
        expect(pastSurgeries.value).toBe('test3');
        expect(familyHistoryOther.value).toBe('test4');
        expect(allergies.value).toBe('test5');
        expect(medications.value).toBe('test6');
    });

    // Add these tests to the end of your file

    it('handles un-checking a symptom', async () => {
        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

        const feverCheckbox = await screen.findByLabelText('Fever');

        // 1. Check the box
        fireEvent.click(feverCheckbox);
        expect(feverCheckbox.checked).toBe(true);

        // 2. Un-check the box (this covers the 'else' branch)
        fireEvent.click(feverCheckbox);
        expect(feverCheckbox.checked).toBe(false);
    });

    it('does not book or pay if token is missing', async () => {
        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
        await act(async () => { await fillStep2Form(); });
        const reviewBtn = screen.getByRole('button', { name: /Review Booking/i });
        await waitFor(() => expect(reviewBtn).toBeEnabled());
        fireEvent.click(reviewBtn);

        // Now remove the token
        localStorage.removeItem('token');

        // Click buttons and assert no API call
        fireEvent.click(await screen.findByRole('button', { name: /Confirm Booking/i }));
        fireEvent.click(await screen.findByRole('button', { name: /Complete Payment/i }));

        expect(axios.post).not.toHaveBeenCalled();
        expect(window.alert).toHaveBeenCalledWith("You must be logged in to book an appointment.");
        expect(window.alert).toHaveBeenCalledWith("You must be logged in to make a payment.");
    });

    it('navigates to dashboard on nav button click', async () => {
        renderComponent();
        // Wait for page to be interactive
        const dashboardButton = await screen.findByRole('button', { name: 'Dashboard' });
        fireEvent.click(dashboardButton);
        expect(mockNavigate).toHaveBeenCalledWith('/patient/dashboard');
    });



    it('does not book or pay if token is missing', async () => {
        renderComponent();
        fireEvent.click(await screen.findByText('10:00 AM'));
        fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
        await act(async () => { await fillStep2Form(); });
        const reviewBtn = screen.getByRole('button', { name: /Review Booking/i });
        await waitFor(() => expect(reviewBtn).toBeEnabled());
        fireEvent.click(reviewBtn);

        // Now remove the token
        localStorage.removeItem('token');

        // Click buttons and assert no API call
        fireEvent.click(await screen.findByRole('button', { name: /Confirm Booking/i }));
        fireEvent.click(await screen.findByRole('button', { name: /Complete Payment/i }));

        expect(axios.post).not.toHaveBeenCalled();
        expect(window.alert).toHaveBeenCalledWith("You must be logged in to book an appointment.");
        expect(window.alert).toHaveBeenCalledWith("You must be logged in to make a payment.");
    });
});