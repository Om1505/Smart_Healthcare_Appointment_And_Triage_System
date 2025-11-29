import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DoctorReviewsPage from '@/pages/DoctorReviewsPage.jsx';
import axios from 'axios';

vi.mock('axios');

const renderWithRoute = (id = 'doc123') => {
  return render(
    <MemoryRouter initialEntries={[`/doctor/${id}/reviews`]}>\n      <Routes>\n        <Route path="/doctor/:id/reviews" element={<DoctorReviewsPage />} />\n      </Routes>\n    </MemoryRouter>
  );
};

describe('DoctorReviewsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    // Do not resolve promises yet
    axios.get.mockReturnValue(new Promise(() => {}));
    renderWithRoute();
    expect(screen.getByText(/Loading reviews.../i)).toBeInTheDocument();
  });

  it('renders error state when fetch fails', async () => {
    axios.get.mockRejectedValue(new Error('network fail'));
    renderWithRoute();
    expect(await screen.findByText(/Failed to load reviews/i)).toBeInTheDocument();
  });

  it('renders doctor info and reviews list on success', async () => {
    const doctorData = { fullName: 'Jane Doe', specialization: 'Cardiology', averageRating: 4.2, reviewCount: 2 };
    const reviewsData = [
      { _id: 'r1', rating: 5, comment: 'Excellent care', createdAt: new Date().toISOString(), patient: { fullName: 'Alice Smith' }, appointment: { patientNameForVisit: 'Alice Smith' } },
      { _id: 'r2', rating: 4, comment: 'Very good', createdAt: new Date().toISOString(), patient: { fullName: 'Bob Jones' }, appointment: { patientNameForVisit: 'Bob Jones' } }
    ];
    axios.get
      .mockResolvedValueOnce({ data: doctorData })
      .mockResolvedValueOnce({ data: reviewsData });
    renderWithRoute('abc999');
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('(2 reviews)')).toBeInTheDocument();
    // Review comments
    expect(screen.getByText(/Excellent care/i)).toBeInTheDocument();
    expect(screen.getByText(/Very good/i)).toBeInTheDocument();
    // Back button presence
    expect(screen.getByRole('button', { name: /Back to Search/i })).toBeInTheDocument();
  });

  it('rounds average rating when rendering stars (e.g., 3.6 -> 4 highlighted)', async () => {
    const doctorData = { fullName: 'Rounded Test', specialization: 'Neurology', averageRating: 3.6, reviewCount: 1 };
    const reviewsData = [ { _id: 'rX', rating: 3.6, comment: 'Decent', createdAt: new Date().toISOString(), patient: { fullName: 'Pat Name' }, appointment: { patientNameForVisit: 'Pat Name' } } ];
    axios.get
      .mockResolvedValueOnce({ data: doctorData })
      .mockResolvedValueOnce({ data: reviewsData });
    renderWithRoute('round1');
    await screen.findByText('Rounded Test');
    const reviewCountEl = screen.getByText(/\(1 reviews\)/i);
    const headerStars = reviewCountEl.parentElement.querySelectorAll('svg.lucide-star');
    expect(headerStars.length).toBe(5);
    const filled = Array.from(headerStars).filter(s => s.className.baseVal.includes('text-yellow-400')).length;
    expect(filled).toBe(4); // Math.round(3.6) === 4
  });

  it('shows fallback initials and patient name when optional data missing', async () => {
    const doctorData = { fullName: 'Fallback Doctor', specialization: 'Dermatology', averageRating: 2.5, reviewCount: 1 };
    const reviewsData = [ { _id: 'rB', rating: 2, comment: 'Okay', createdAt: new Date().toISOString(), patient: {}, appointment: {} } ];
    axios.get
      .mockResolvedValueOnce({ data: doctorData })
      .mockResolvedValueOnce({ data: reviewsData });
    renderWithRoute('fb1');
    await screen.findByText('Fallback Doctor');
    // Fallback patient label
    expect(screen.getByText('Patient')).toBeInTheDocument();
    // Fallback initials should be single 'P' in AvatarFallback
    const avatarFallback = document.querySelector('span');
    expect(avatarFallback.textContent).toContain('Fallback Doctor'.split(' ').map(n => n[0]).join('')); // doctor initials
    // Review comment present
    expect(screen.getByText(/Okay/i)).toBeInTheDocument();
  });

  it('renders no reviews message when list is empty', async () => {
    const doctorData = { fullName: 'Empty Reviews', specialization: 'ENT', averageRating: 0, reviewCount: 0 };
    axios.get
      .mockResolvedValueOnce({ data: doctorData })
      .mockResolvedValueOnce({ data: [] });
    renderWithRoute('empty1');
    await screen.findByText('Empty Reviews');
    expect(screen.getByText(/No reviews for this doctor yet/i)).toBeInTheDocument();
  });

  it('clears loading state after successful fetch', async () => {
    const doctorData = { fullName: 'Load Clear', specialization: 'Oncology', averageRating: 5, reviewCount: 0 };
    axios.get
      .mockResolvedValueOnce({ data: doctorData })
      .mockResolvedValueOnce({ data: [] });
    renderWithRoute('load1');
    await screen.findByText('Load Clear');
    expect(screen.queryByText(/Loading reviews.../i)).toBeNull();
  });

  it('includes gray (unfilled) stars for low ratings', async () => {
    const doctorData = { fullName: 'Low Rated', specialization: 'General', averageRating: 1.9, reviewCount: 1 };
    const reviewsData = [{ _id: 'lr1', rating: 1.9, comment: 'Needs improvement', createdAt: new Date().toISOString(), patient: { fullName: 'Low Pat' }, appointment: { patientNameForVisit: 'Low Pat' } }];
    axios.get.mockResolvedValueOnce({ data: doctorData }).mockResolvedValueOnce({ data: reviewsData });
    renderWithRoute('low1');
    await screen.findByText('Low Rated');
    const reviewCountEl = screen.getByText(/\(1 reviews\)/i);
    const stars = reviewCountEl.parentElement.querySelectorAll('svg.lucide-star');
    // Ensure at least one gray star exists (unfilled index >= Math.round(1.9)=2)
    const grayExists = Array.from(stars).some(s => s.className.baseVal.includes('text-gray-300'));
    expect(grayExists).toBe(true);
  });

  it('calls correct doctor and reviews endpoints with doctorId', async () => {
    const doctorData = { fullName: 'Endpoint Doc', specialization: 'Pathology', averageRating: 0, reviewCount: 0 };
    axios.get.mockResolvedValueOnce({ data: doctorData }).mockResolvedValueOnce({ data: [] });
    renderWithRoute('ep42');
    await screen.findByText('Endpoint Doc');
    expect(axios.get).toHaveBeenNthCalledWith(1, expect.stringContaining('/api/doctors/ep42'));
    expect(axios.get).toHaveBeenNthCalledWith(2, expect.stringContaining('/api/reviews/doctor/ep42'));
  });

  it('renders fallback P initial when appointment property missing entirely', async () => {
    const doctorData = { fullName: 'No Appt Doctor', specialization: 'Urology', averageRating: 2, reviewCount: 1 };
    const reviewsData = [{ _id: 'na1', rating: 2, comment: 'No appointment obj', createdAt: new Date().toISOString(), patient: { fullName: 'Joe' } }];
    axios.get.mockResolvedValueOnce({ data: doctorData }).mockResolvedValueOnce({ data: reviewsData });
    renderWithRoute('noappt');
    await screen.findByText('No Appt Doctor');
    // The avatar fallback for missing appointment property should render 'P'
    const fallbackPs = Array.from(document.querySelectorAll('div.border-b span')).filter(el => el.textContent === 'P');
    expect(fallbackPs.length).toBeGreaterThan(0);
  });

  it('renders fallback Patient label when patient property missing', async () => {
    const doctorData = { fullName: 'No Patient Doctor', specialization: 'Nutrition', averageRating: 1, reviewCount: 1 };
    const reviewsData = [{ _id: 'np1', rating: 1, comment: 'No patient obj', createdAt: new Date().toISOString(), appointment: { patientNameForVisit: 'Some One' } }];
    axios.get.mockResolvedValueOnce({ data: doctorData }).mockResolvedValueOnce({ data: reviewsData });
    renderWithRoute('nopatient');
    await screen.findByText('No Patient Doctor');
    expect(screen.getByText('Patient')).toBeInTheDocument();
  });

  it('forms initials correctly without injecting Stryker test strings', async () => {
    const doctorData = { fullName: 'Initials Doc', specialization: 'Ophthalmology', averageRating: 3, reviewCount: 1 };
    const reviewsData = [{ _id: 'in1', rating: 3, comment: 'Initial check', createdAt: new Date().toISOString(), patient: { fullName: 'Gamma Ray' }, appointment: { patientNameForVisit: 'Gamma Ray' } }];
    axios.get.mockResolvedValueOnce({ data: doctorData }).mockResolvedValueOnce({ data: reviewsData });
    renderWithRoute('initials');
    await screen.findByText('Initials Doc');
    // Fallback initials (computed by splitting spaces) should be "GR" not containing 'Stryker'
    const fallbackSpan = Array.from(document.querySelectorAll('div.border-b span')).find(el => el.textContent === 'GR');
    expect(fallbackSpan).toBeTruthy();
    expect(fallbackSpan.textContent).toBe('GR');
  });
});
