import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button"; // <-- 1. IMPORTED BUTTON
import { Loader2, AlertCircle, Stethoscope, CalendarCheck, LogOut, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from 'react-router-dom'; // <-- 2. IMPORTED BROWSERROUTER

// Mock data to display in the table immediately.
// You can remove this when your API call is working.
const mockAppointments = [
  { _id: 'a1', doctorName: 'Dr. Om Patel', patientName: 'Jane Doe', patientEmail: 'jane_doe@gmail.com', date: '2025-11-02T10:30:00Z', time: '10:30 AM' },
  { _id: 'a2', doctorName: 'Dr. Aryan Patel', patientName: 'Virat Kohli', patientEmail: 'virat_kohli1@gmail.com', date: '2025-11-02T11:00:00Z', time: '11:00 AM' },
  { _id: 'a3', doctorName: 'Dr. Rohit Sharma', patientName: 'Ammar', patientEmail: 'ahmar@gmail.com', date: '2025-11-03T14:00:00Z', time: '02:00 PM' },
  { _id: 'a4', doctorName: 'Dr. Kavy Sanghani', patientName: 'Jon Jones', patientEmail: 'abcd@gmail.com', date: '2025-11-04T09:00:00Z', time: '09:00 AM' },
  { _id: 'a5', doctorName: 'Dr. Om Patel', patientName: 'ABC', patientEmail: 'abcdefg@gmail.com', date: '2025-11-05T16:15:00Z', time: '04:15 PM' },
];

export default function AppointmentsPage() {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Set initial state to mock data to show layout.
  // Change useState(mockAppointments) to useState([]) when using API.
  const [appointments, setAppointments] = useState(mockAppointments);
  
  // Set initial loading to false to show mock data.
  // Change useState(false) to useState(true) when using API.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /*
  // --- UNCOMMENT THIS SECTION TO FETCH LIVE DATA ---
  
  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true); // Make sure to set loading to true initially
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Authorization token not found. Please log in.");
        setLoading(false);
        return;
      }

      try {
        // !!! IMPORTANT: Update this URL to your actual appointments endpoint
        const response = await axios.get('http://localhost:5001/api/appointments/all', {
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Assuming your API returns { appointments: [...] }
        setAppointments(response.data.appointments); 
      } catch (err) {
        const errorMessage = err.response?.data?.message || "An error occurred while fetching appointments.";
        setError(errorMessage);
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);
  
  */

  if (loading) {
    return (
      // <-- 3. WRAPPED ERROR/LOADING STATES IN ROUTER
      <div className="flex items-center justify-center min-h-screen bg-emerald-50">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-600" />
        <span className="ml-4 text-lg text-gray-700">Loading appointments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-emerald-50 p-8">
        <AlertCircle className="w-12 h-12 text-red-600" />
        <span className="mt-4 text-lg text-red-700 text-center">Error: {error}</span>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50 text-gray-800">
        
      {/* --- Simplified Navbar as requested --- */}
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-8 h-8 text-cyan-600" />
            <Link 
              to="/" 
              className="text-xl font-bold text-gray-800 hover:text-cyan-600 transition-colors duration-200"
            >
              IntelliConsult
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin/dashboard')}
              className="border-cyan-500 text-cyan-600 hover:bg-cyan-50 hover:text-cyan-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="border-red-600 text-red-700 hover:bg-red-100 hover:text-red-800 hover:scale-105 
              transition-all duration-200 ease-in-out transform hover:shadow-md active:scale-95"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </nav>
      </header>

      {/* --- Main Content Area --- */}
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="container mx-auto">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CalendarCheck className="w-7 h-7 text-cyan-700" />
                <div>
                  <CardTitle className="text-2xl">Appointments</CardTitle>
                  <CardDescription>A list of all scheduled appointments.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor Name</TableHead>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Patient Email</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.length > 0 ? (
                    appointments.map((appt) => (
                      <TableRow key={appt._id}>
                        <TableCell className="font-medium">{appt.doctorName}</TableCell>
                        <TableCell>{appt.patientName}</TableCell>
                        <TableCell>{appt.patientEmail}</TableCell>
                        <TableCell>{new Date(appt.date).toLocaleDateString()}</TableCell>
                        <TableCell>{appt.time}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No appointments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

