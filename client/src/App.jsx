import { Routes, Route } from 'react-router-dom';

// Import all your page components
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PatientDashboard from './pages/PatientDashboard';
import FindDoctorsPage from './pages/FindDoctorsPage';
import BookAppointmentPage from './pages/BookAppointmentPage';
import DoctorProfilePage from './pages/DoctorProfilePage';
function App() {
 // This component now only contains the Routes.
 return (
 <Routes>
 <Route path="/" element={<LandingPage />} />
 <Route path="/login" element={<LoginPage />} />
 <Route path="/signup" element={<SignupPage />} />

 <Route path="/patient/dashboard" element={<PatientDashboard />} />
 <Route path="/patient/doctors" element={<FindDoctorsPage />} />
<Route path="/patient/book/:doctorId" element={<BookAppointmentPage />} />
<Route path="/doctor/:id" element={<DoctorProfilePage />} />
 </Routes>
);
}

export default App;