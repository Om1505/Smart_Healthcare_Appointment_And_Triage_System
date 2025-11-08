import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Plus, Search, Stethoscope, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserProfileModal } from '@/components/UserProfileModal';
import { Phone } from 'lucide-react'; // Import a call icon 
import { Check } from 'lucide-react'; // Import Check icon

export default function PatientDashboard() {
  const primaryColor = '#0F5257';

  // State for holding real data from the backend
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      try {
        // Fetch both profile and appointments in parallel for speed
        const [profileResponse, appointmentsResponse] = await Promise.all([
          axios.get('http://localhost:5001/api/users/profile', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:5001/api/appointments/my-appointments', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setPatient(profileResponse.data);
        setAppointments(appointmentsResponse.data);
      } catch (err) {
        setError(`Failed to fetch data (${err.response?.status || 'Network Error'}). Please try logging in again.`);
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleCancelAppointment = async (appointmentId) => {
    // Ask for confirmation before deleting
    if (!window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      // Call the new backend endpoint
      await axios.put(`http://localhost:5001/api/appointments/${appointmentId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update the state locally to reflect the change immediately
      setAppointments(prevAppointments =>
        prevAppointments.map(apt =>
          apt._id === appointmentId ? { ...apt, status: 'cancelled' } : apt
        )
      );
      
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel appointment.");
    }
  };


  // Render loading state while data is being fetched
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading your dashboard...</div>;
  }

  // Render error message if fetching fails
  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-600">{error}</div>;
  }

  // Filter the fetched appointments into upcoming and past
  const upcomingAppointments = appointments.filter((apt) => new Date(apt.date) >= new Date() && apt.status === 'upcoming');
  const pastAppointments = appointments.filter((apt) => new Date(apt.date) < new Date() || apt.status === 'completed' || apt.status === 'cancelled');

  return (
    <div className="min-h-screen bg-emerald-50 text-gray-800">
      <nav className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <img src="/Logo.svg" className="h-25 w-30" style={{ color: primaryColor }} alt="Logo" />
              <span className="text-3xl font-bold">IntelliConsult</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link to="/patient/doctors">
                <Button variant="outline" size="sm" className="border-teal-300 text-teal-800 hover:bg-teal-50 hover:text-teal-900">
                  <Search className="h-4 w-4 mr-2" /> Find Doctors
                </Button>
              </Link>
              <Button onClick={handleLogout} variant="outline" size="sm" className="border-slate-300 text-slate-800 hover:bg-slate-50 hover:text-slate-900">
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </Button>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="cursor-pointer">
                      <AvatarImage src="/patient-consultation.png" alt={patient.fullName} />
                      <AvatarFallback className="bg-teal-100 text-teal-800">
                        {patient.fullName.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setProfileModalOpen(true)}>
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleLogout} className="text-red-600">
                      Logout
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {patient.fullName.split(' ')[0]}!</h1>
          <p className="text-gray-600">Manage your appointments and health journey.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link to="/patient/doctors">
            <Card className="bg-white border-gray-200 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 cursor-pointer">
              <CardHeader className="pb-3 flex-row items-center space-x-4"><div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center"><Plus className="h-6 w-6" style={{ color: primaryColor }} /></div><div><CardTitle className="text-lg">Book Appointment</CardTitle><CardDescription>Find and book with doctors</CardDescription></div></CardHeader>
            </Card>
          </Link>
          <Card className="bg-white border-gray-200 hover:shadow-lg hover:-translate-y-2 transition-all duration-300">
            <CardHeader className="pb-3 flex-row items-center space-x-4"><div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center"><Calendar className="h-6 w-6" style={{ color: primaryColor }} /></div><div><CardTitle className="text-lg">Upcoming</CardTitle><CardDescription>{upcomingAppointments.length} appointments</CardDescription></div></CardHeader>
          </Card>
          <Card className="bg-white border-gray-200 hover:shadow-lg hover:-translate-y-2 transition-all duration-300">
            <CardHeader className="pb-3 flex-row items-center space-x-4"><div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center"><Clock className="h-6 w-6" style={{ color: primaryColor }} /></div><div><CardTitle className="text-lg">Past Visits</CardTitle><CardDescription>{pastAppointments.length} completed</CardDescription></div></CardHeader>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="bg-white border-gray-200">
            <CardHeader><CardTitle>Upcoming Appointments</CardTitle><CardDescription>Your scheduled consultations</CardDescription></CardHeader>
            <CardContent>
              {upcomingAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingAppointments.map((apt) => (
                      // --- THIS IS THE UPDATED CARD LAYOUT ---
                      <div key={apt._id} className="flex items-start space-x-4 p-4 border rounded-lg bg-emerald-50/50">
                        <Avatar><AvatarImage src="/female-doctor.jpg" /><AvatarFallback>Dr</AvatarFallback></Avatar>
                        
                        {/* Appointment Details */}
                        <div className="flex-1">
                          <h3 className="font-semibold">{apt.doctor.fullName}</h3>
                          <p className="text-sm font-medium text-teal-800">For: {apt.patientNameForVisit}</p>
                          <p className="text-sm text-gray-600">{apt.doctor.specialization}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center space-x-1 text-sm text-gray-600"><Calendar className="h-4 w-4" /><span>{new Date(apt.date).toLocaleDateString()}</span></div>
                            <div className="flex items-center space-x-1 text-sm text-gray-600"><Clock className="h-4 w-4" /><span>{apt.time}</span></div>
                          </div>
                        </div>
                        
                      {/* <Link to={`/call/${apt._id}`} state={{ userName: patient.fullName }}>
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-green-600 text-white hover:bg-green-700"
                            >
                              <Phone className="h-3 w-3 mr-1" />
                              Join Call
                            </Button>
                          </Link> */}

                        {/* New container for Badge and Button */}
                        <div className="flex flex-col items-end space-y-2">
                          <Badge className="bg-teal-100 text-teal-800">Upcoming</Badge>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 text-xs" // Made the button small
                            onClick={() => handleCancelAppointment(apt._id)}
                          >
                            Cancel Appointment
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No upcoming appointments</p>
                    <Link to="/patient/doctors">
                      <Button className="bg-teal-600 text-white hover:bg-teal-700">Book Your First Appointment</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          <Card className="bg-white border-gray-200">
            <CardHeader><CardTitle>Recent Visits</CardTitle><CardDescription>Your consultation history</CardDescription></CardHeader>
            <CardContent>
              {pastAppointments.length > 0 ? (
                <div className="space-y-4">
                  {pastAppointments.map((apt) => (
                    <div key={apt._id} className="flex items-center space-x-4 p-4 border rounded-lg bg-emerald-50/50">
                        <Avatar><AvatarImage src="/female-doctor.jpg" /><AvatarFallback>Dr</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">{apt.doctor.fullName}</h3>
                        <p className="text-sm font-medium text-teal-800">For: {apt.patientNameForVisit}</p>
                        <p className="text-sm text-gray-600">{apt.doctor.specialization}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <div className="flex items-center space-x-1 text-sm text-gray-600"><Calendar className="h-4 w-4" /><span>{new Date(apt.date).toLocaleDateString()}</span></div>
                        </div>
                      </div>
                      <Badge variant={apt.status === 'completed' ? 'outline' : 'destructive'}>
                          {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                        </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No past appointments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        patient={patient}
        onProfileUpdate={setPatient} // Pass the setter function to update the state
      />
    </div>
    
  );
}
