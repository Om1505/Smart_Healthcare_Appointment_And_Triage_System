import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientPrescriptionView from '@/pages/PatientPrescriptionView.jsx';
import axios from 'axios';
import { vi } from 'vitest';

const mockNavigate = vi.fn();
const mockParams = { appointmentId: 'apt-123' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
    Link: ({ children, ...props }) => <a {...props}>{children}</a>,
  };
});

vi.mock('axios');

const buildMedicalRecord = () => ({
  _id: 'rec-1',
  diagnosis: 'Seasonal flu',
  notes: 'Drink fluids',
  followUpRequired: true,
  followUpDate: '2025-01-01T00:00:00.000Z',
  followUpNotes: 'Check temperature daily',
  prescription: [
    {
      medication: 'Med 1',
      dosage: '10mg',
      frequency: 'Once daily',
      instructions: 'After meals',
    },
  ],
  doctor: {
    fullName: 'Dr. Alice',
    specialization: 'General Physician',
  },
  patient: {
    fullName: 'John Doe',
    email: 'john@doe.com',
  },
  appointment: {
    date: '2024-12-01T00:00:00.000Z',
  },
});

describe('PatientPrescriptionView', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'fake-token');
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders prescription details after successful fetch', async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, medicalRecord: buildMedicalRecord() },
    });

    render(<PatientPrescriptionView />);

    // Wait for loading to complete and prescription details to appear
    await waitFor(() => {
      expect(screen.getByText(/Your Prescription/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(
      screen.getByText(/Details from your consultation/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Dr. Alice')).toBeInTheDocument();
    expect(screen.getByText('Seasonal flu')).toBeInTheDocument();
  });

  it('shows error card when prescription is missing', async () => {
    axios.get.mockRejectedValueOnce({
      response: { status: 404 },
    });

    render(<PatientPrescriptionView />);

    await waitFor(() => {
      expect(
        screen.getByText(/No prescription given by doctor till now/i),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: /Back to Dashboard/i }),
    ).toBeInTheDocument();
  });

  it('navigates to login when token is missing', () => {
    localStorage.removeItem('token');
    render(<PatientPrescriptionView />);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('downloads PDF when Download button is clicked', async () => {
    const record = buildMedicalRecord();
    axios.get
      .mockResolvedValueOnce({
        data: { success: true, medicalRecord: record },
      })
      .mockResolvedValueOnce({ data: new ArrayBuffer(8) });

    const createObjectURLSpy = vi
      .spyOn(window.URL, 'createObjectURL')
      .mockReturnValue('blob:url');
    const revokeObjectURLSpy = vi.spyOn(window.URL, 'revokeObjectURL');

    render(<PatientPrescriptionView />);

    const downloadButton = await screen.findByRole('button', {
      name: /Download PDF/i,
    });

    await userEvent.click(downloadButton);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(`/api/prescriptions/${record._id}/pdf`),
        expect.objectContaining({
          headers: { Authorization: 'Bearer fake-token' },
          responseType: 'blob',
        }),
      );
    });

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('shows loading state initially', () => {
    axios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { container } = render(<PatientPrescriptionView />);

    // Check for loading spinner by class name
    const loader = container.querySelector('.lucide-loader-circle');
    expect(loader).toBeInTheDocument();
  });

  it('shows error when response success is false', async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: false },
    });

    render(<PatientPrescriptionView />);

    await waitFor(() => {
      expect(
        screen.getByText(/Could not find a prescription for this appointment/i),
      ).toBeInTheDocument();
    });
  });

  it('shows error when fetch fails with non-404 error', async () => {
    axios.get.mockRejectedValueOnce({
      response: { status: 500 },
    });

    render(<PatientPrescriptionView />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to fetch prescription details/i),
      ).toBeInTheDocument();
    });
  });

  it('shows error when PDF download fails', async () => {
    const record = buildMedicalRecord();
    axios.get
      .mockResolvedValueOnce({
        data: { success: true, medicalRecord: record },
      })
      .mockRejectedValueOnce(new Error('Download failed'));

    render(<PatientPrescriptionView />);

    const downloadButton = await screen.findByRole('button', {
      name: /Download PDF/i,
    });

    await userEvent.click(downloadButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to download PDF. Please try again/i),
      ).toBeInTheDocument();
    });
  });

  it('navigates to dashboard when Back to Dashboard button is clicked in error state', async () => {
    axios.get.mockRejectedValueOnce({
      response: { status: 404 },
    });

    render(<PatientPrescriptionView />);

    const backButton = await screen.findByRole('button', {
      name: /Back to Dashboard/i,
    });

    await userEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/patient/dashboard');
  });

  it('navigates to dashboard when Back button is clicked', async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, medicalRecord: buildMedicalRecord() },
    });

    render(<PatientPrescriptionView />);

    await waitFor(() => {
      expect(screen.getByText(/Your Prescription/i)).toBeInTheDocument();
    });

    const backButton = screen.getByRole('button', { name: /Back/i });
    await userEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/patient/dashboard');
  });

  it('renders prescription without frequency', async () => {
    const record = buildMedicalRecord();
    record.prescription[0].frequency = null;

    axios.get.mockResolvedValueOnce({
      data: { success: true, medicalRecord: record },
    });

    render(<PatientPrescriptionView />);

    await waitFor(() => {
      expect(screen.getByText(/Your Prescription/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/N\/A/i)).toBeInTheDocument();
  });

  it('renders prescription without notes', async () => {
    const record = buildMedicalRecord();
    record.notes = null;

    axios.get.mockResolvedValueOnce({
      data: { success: true, medicalRecord: record },
    });

    render(<PatientPrescriptionView />);

    await waitFor(() => {
      expect(screen.getByText(/Your Prescription/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Doctor's Notes/i)).not.toBeInTheDocument();
  });

  it('renders prescription without follow-up notes', async () => {
    const record = buildMedicalRecord();
    record.followUpNotes = null;

    axios.get.mockResolvedValueOnce({
      data: { success: true, medicalRecord: record },
    });

    render(<PatientPrescriptionView />);

    await waitFor(() => {
      expect(screen.getByText(/Your Prescription/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Follow-up Required/i)).toBeInTheDocument();
    // Should show Date but not Notes within follow-up section
    expect(screen.getByText(/Date:/i)).toBeInTheDocument();
    expect(screen.queryByText(/Check temperature daily/i)).not.toBeInTheDocument();
  });

  it('renders prescription without follow-up required', async () => {
    const record = buildMedicalRecord();
    record.followUpRequired = false;

    axios.get.mockResolvedValueOnce({
      data: { success: true, medicalRecord: record },
    });

    render(<PatientPrescriptionView />);

    await waitFor(() => {
      expect(screen.getByText(/Your Prescription/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Follow-up Required/i)).not.toBeInTheDocument();
  });

  it('renders prescription without medications when array is empty', async () => {
    const record = buildMedicalRecord();
    record.prescription = [];

    axios.get.mockResolvedValueOnce({
      data: { success: true, medicalRecord: record },
    });

    render(<PatientPrescriptionView />);

    await waitFor(() => {
      expect(screen.getByText(/Your Prescription/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Medications/i)).not.toBeInTheDocument();
  });

  it('renders prescription without medications when prescription is null', async () => {
    const record = buildMedicalRecord();
    record.prescription = null;

    axios.get.mockResolvedValueOnce({
      data: { success: true, medicalRecord: record },
    });

    render(<PatientPrescriptionView />);

    await waitFor(() => {
      expect(screen.getByText(/Your Prescription/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Medications/i)).not.toBeInTheDocument();
  });

  it('verifies API endpoint and Authorization header are used', async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, medicalRecord: buildMedicalRecord() },
    });

    render(<PatientPrescriptionView />);

    await waitFor(() => {
      expect(screen.getByText(/Your Prescription/i)).toBeInTheDocument();
    });

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/prescriptions/appointment/apt-123'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-token',
        }),
      })
    );
  });

  it('verifies PDF download creates blob with correct type', async () => {
    const record = buildMedicalRecord();
    axios.get
      .mockResolvedValueOnce({
        data: { success: true, medicalRecord: record },
      })
      .mockResolvedValueOnce({ data: new ArrayBuffer(8) });

    const createObjectURLSpy = vi
      .spyOn(window.URL, 'createObjectURL')
      .mockReturnValue('blob:url');
    const createElementSpy = vi.spyOn(document, 'createElement');

    render(<PatientPrescriptionView />);

    const downloadButton = await screen.findByRole('button', {
      name: /Download PDF/i,
    });

    await userEvent.click(downloadButton);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(`/api/prescriptions/${record._id}/pdf`),
        expect.objectContaining({
          headers: { Authorization: 'Bearer fake-token' },
          responseType: 'blob',
        })
      );
    });

    const anchorCall = createElementSpy.mock.calls.find(
      (call) => call[0] === 'a'
    );
    expect(anchorCall).toBeDefined();
    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('sets isDownloading to false after successful download', async () => {
    const record = buildMedicalRecord();
    axios.get
      .mockResolvedValueOnce({
        data: { success: true, medicalRecord: record },
      })
      .mockResolvedValueOnce({ data: new ArrayBuffer(8) });

    vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:url');

    render(<PatientPrescriptionView />);

    const downloadButton = await screen.findByRole('button', {
      name: /Download PDF/i,
    });

    await userEvent.click(downloadButton);

    // Wait for download to complete and button to be re-enabled
    await waitFor(() => {
      expect(downloadButton).not.toBeDisabled();
    });
  });

  it('shows error card after failed PDF download', async () => {
    const record = buildMedicalRecord();
    axios.get
      .mockResolvedValueOnce({ data: { success: true, medicalRecord: record } }) // initial fetch
      .mockRejectedValueOnce(new Error('Download failed')); // first download attempt

    vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:url');

    render(<PatientPrescriptionView />);

    const downloadButton = await screen.findByRole('button', { name: /Download PDF/i });
    await userEvent.click(downloadButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to download PDF. Please try again/i)).toBeInTheDocument();
    });

    // Ensure no download button in error state (component early returns error card)
    expect(screen.queryByRole('button', { name: /Download PDF/i })).not.toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledTimes(2); // fetch + failed download
  });

  it('renders avatar initials from patient full name', async () => {
    const record = buildMedicalRecord();
    axios.get.mockResolvedValueOnce({ data: { success: true, medicalRecord: record } });

    render(<PatientPrescriptionView />);

    await waitFor(() => {
      expect(screen.getByText(/Your Prescription/i)).toBeInTheDocument();
    });

    // Should show first letters of each part of patient full name
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders follow-up notes when present', async () => {
    const record = buildMedicalRecord();
    axios.get.mockResolvedValueOnce({
      data: { success: true, medicalRecord: record },
    });

    render(<PatientPrescriptionView />);

    await waitFor(() => {
      expect(screen.getByText(/Your Prescription/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Check temperature daily/i)).toBeInTheDocument();
    expect(screen.getByText(/Notes:/i)).toBeInTheDocument();
  });

  it('does not render follow-up notes section when notes are missing', async () => {
    const record = buildMedicalRecord();
    // Remove notes completely to ensure condition is falsy
    delete record.followUpNotes;

    axios.get.mockResolvedValueOnce({ data: { success: true, medicalRecord: record } });

    render(<PatientPrescriptionView />);

    await waitFor(() => {
      expect(screen.getByText(/Your Prescription/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Check temperature daily/i)).not.toBeInTheDocument();
  });

  it('renders notes section when present', async () => {
    const record = buildMedicalRecord();
    axios.get.mockResolvedValueOnce({
      data: { success: true, medicalRecord: record },
    });

    render(<PatientPrescriptionView />);

    await waitFor(() => {
      expect(screen.getByText(/Your Prescription/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Drink fluids/i)).toBeInTheDocument();
    expect(screen.getByText(/Doctor's Notes/i)).toBeInTheDocument();
  });
});

