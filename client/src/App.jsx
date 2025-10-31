import { Routes, Route } from 'react-router-dom';

// Import all your page components
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDashboard from './pages/PatientDashboard';
import FindDoctorsPage from './pages/FindDoctorsPage';
import BookAppointmentPage from './pages/BookAppointmentPage';
import DoctorProfilePage from './pages/DoctorProfilePage';
import AdminDashboard from './pages/AdminDashboard'; 
import AppointmentsPage from './pages/Appointment'; 
import DoctorProfileAdmin from './pages/DoctorProfileAdmin';

function App() {
  // This component now only contains the Routes.
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/doctor/:id" element={<DoctorProfileAdmin />} />

      <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
      <Route path="/patient/dashboard" element={<PatientDashboard />} />
      <Route path="/patient/doctors" element={<FindDoctorsPage />} />
      <Route path="/patient/book/:doctorId" element={<BookAppointmentPage />} />
      <Route path="/doctor/:id" element={<DoctorProfilePage />} />
      <Route path="/appointments" element={<AppointmentsPage />} />
      
    </Routes>
  );
}

export default App;
