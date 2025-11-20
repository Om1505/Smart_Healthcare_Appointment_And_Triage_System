import { Routes, Route } from 'react-router-dom';

// Import all your page components using alias paths
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DoctorDashboard from '@/pages/DoctorDashboard';
import PatientDashboard from '@/pages/PatientDashboard';
import FindDoctorsPage from '@/pages/FindDoctorsPage';
import BookAppointmentPage from '@/pages/BookAppointmentPage';
import DoctorProfilePage from '@/pages/DoctorProfilePage';
import AuthCallback from '@/pages/AuthCallback';
import CompleteProfilePage from '@/pages/CompleteProfilePage';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminDoctorProfilePage from '@/pages/AdminDoctorProfilePage';
import AdminAppointmentsPage from '@/pages/AdminAppointmentsPage'; 
import DoctorEarningsPage from '@/pages/EarningPage';
import DoctorSchedulePage from '@/pages/SchedulePage';
import DoctorUpdateProfile from '@/pages/DoctorUpdateProfile';
import VideoCallPage from '@/pages/VideoCallPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import PrescriptionPage from '@/pages/PrescriptionPage';
import HelpCenterPage from '@/pages/HelpCenter';
import PatientPrescriptionView from './pages/PatientPrescriptionView.jsx';
import DoctorReviewsPage from './pages/DoctorReviewsPage';

function App() {
  return (
    
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/complete-profile" element={<CompleteProfilePage />} />
      <Route path="/help-center" element={<HelpCenterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      
      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/appointments" element={<AdminAppointmentsPage />} /> 
      <Route path="/admin/doctor-profile/:id" element={<AdminDoctorProfilePage />} />

      {/* Doctor Routes */}
      <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
      <Route path="/doctor/:id" element={<DoctorProfilePage />} />
      <Route path="/doctor/earnings" element={<DoctorEarningsPage />} />
      <Route path="/doctor/schedule" element={<DoctorSchedulePage />} />
      <Route path="/doctor/update-profile" element={<DoctorUpdateProfile />} />
      <Route path="/doctor/prescription/:appointmentId" element={<PrescriptionPage />} />

      {/* Patient Routes */}
      <Route path="/patient/dashboard" element={<PatientDashboard />} />
      <Route path="/patient/doctors" element={<FindDoctorsPage />} />
      <Route path="/patient/book/:doctorId" element={<BookAppointmentPage />} />
      <Route path="/call/:roomId" element={<VideoCallPage />} />
      <Route path="/patient/prescription/:appointmentId" element={<PatientPrescriptionView />} />
      <Route path="/doctor/:id/reviews" element={<DoctorReviewsPage />} />
      
    </Routes>
  );
}

export default App;