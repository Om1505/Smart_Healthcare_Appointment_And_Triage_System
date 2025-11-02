import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Ensure axios is imported
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users, DollarSign, AlertTriangle, CheckCircle, Stethoscope, User, Settings, Brain, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { AITriageCard } from "@/components/AITriageCard"; // Assuming you have this component

// Mock data only for the completed count stat card
const mockTodayStats = { completed: 3 }; // Replace or remove later

const getUrgencyClasses = (score) => {
  if (score >= 4) return "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100";
  if (score === 3) return "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100";
  return "border-gray-300 text-gray-700";
};

const getUrgencyLabel = (score) => {
  if (score >= 4) return "High Priority";
  if (score === 3) return "Medium Priority";
  return "Low Priority";
};

export default function DoctorDashboard() {
  const primaryColor = '#0F5257';
  const secondaryColor = '#2E8B57';
  
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }
      try {
        const [profileRes, appointmentsRes] = await Promise.all([
          axios.get('http://localhost:5001/api/users/profile', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:5001/api/appointments/doctor', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        setDoctor(profileRes.data);
        setAppointments(appointmentsRes.data);
      } catch (err) {
        console.error("Error fetching data:", err.response || err);
        setError(`Failed to fetch dashboard data (${err.response?.status || 'Network Error'}).`);
        localStorage.removeItem('token'); // Log out on auth error
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

  // --- Handler to mark an appointment as completed ---
  // const handleStartConsultation = async (appointmentId) => {
  //   const token = localStorage.getItem('token');
  //   if (!token) {
  //     alert("Authentication error. Please log in again.");
  //     return;
  //   }
  
  //   try {
  //     // Call the backend endpoint to complete the appointment
  //     const response = await axios.put(`http://localhost:5001/api/appointments/${appointmentId}/complete`, {}, {
  //       headers: { Authorization: `Bearer ${token}` }
  //     });
  
  //     // Update the local state to reflect the change immediately
  //     setAppointments(prevAppointments =>
  //       prevAppointments.map(apt =>
  //         apt._id === appointmentId ? { ...apt, status: 'completed' } : apt
  //       )
  //     );
  
  //     console.log("Appointment marked as completed:", response.data.appointment);
  //     alert("Appointment marked as completed!"); // Simple feedback
  
  //   } catch (err) {
  //     console.error("Error completing appointment:", err.response || err);
  //     alert(err.response?.data?.message || "Failed to start consultation.");
  //   }
  // };


  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading Dashboard...</div>;
  if (error) return <div className="flex items-center justify-center h-screen text-red-600">{error}</div>;
  if (!doctor) return <div className="flex items-center justify-center h-screen">Loading doctor data...</div>; // Guard clause

  // Filter appointments for display logic
  const upcomingAppointmentsInQueue = appointments.filter(apt => apt.status === 'upcoming');
  const completedAppointmentsToday = appointments.filter(apt => apt.status === 'completed' && new Date(apt.date).toDateString() === new Date().toDateString()); // Example for stats card

  return (
    <div className="min-h-screen bg-emerald-50 text-gray-800">
      <nav className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <Stethoscope className="h-8 w-8" style={{ color: primaryColor }} />
              <span className="text-xl font-bold text-gray-900">IntelliConsult</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link to="/doctor/schedule"><Button variant="outline" size="sm" className="border-teal-300 text-teal-800 hover:bg-teal-50 hover:text-teal-900"><Calendar className="h-4 w-4 mr-2" />Schedule</Button></Link>
              <Button onClick={handleLogout} variant="outline" size="sm" className="border-slate-300 text-slate-800 hover:bg-slate-50 hover:text-slate-900"><LogOut className="h-4 w-4 mr-2" />Logout</Button>
              <Avatar><AvatarImage src="/female-doctor.jpg" alt={doctor.fullName}/><AvatarFallback className="bg-teal-100 text-teal-800">{doctor.fullName.split(" ").map((n) => n[0]).join("")}</AvatarFallback></Avatar>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Good morning, Dr. {doctor.fullName.split(' ').pop()}!</h1>
          <p className="text-gray-600">You have {upcomingAppointmentsInQueue.length} patients in your queue for today.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {/* Using filtered data for 'Today's Appointments' count */}
          <Card className="bg-white hover:shadow-lg hover:-translate-y-2 transition-all duration-300"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium text-gray-700">Upcoming Today</CardTitle><Calendar className="h-4 w-4 text-gray-500" /></div><div className="text-2xl font-bold">{upcomingAppointmentsInQueue.length}</div></CardHeader></Card>
          <Card className="bg-white hover:shadow-lg hover:-translate-y-2 transition-all duration-300"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium text-gray-700">High Priority</CardTitle><AlertTriangle className="h-4 w-4 text-orange-500" /></div><div className="text-2xl font-bold text-orange-600">0</div></CardHeader></Card> {/* Placeholder */}
          <Card className="bg-white hover:shadow-lg hover:-translate-y-2 transition-all duration-300"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium text-gray-700">AI Analyzed</CardTitle><Brain className="h-4 w-4" style={{ color: primaryColor }} /></div><div className="text-2xl font-bold" style={{ color: primaryColor }}>{upcomingAppointmentsInQueue.length}</div></CardHeader></Card>
          {/* Using filtered data for 'Completed' count */}
          <Card className="bg-white hover:shadow-lg hover:-translate-y-2 transition-all duration-300"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium text-gray-700">Completed Today</CardTitle><CheckCircle className="h-4 w-4" style={{ color: secondaryColor }} /></div><div className="text-2xl font-bold" style={{ color: secondaryColor }}>{completedAppointmentsToday.length}</div></CardHeader></Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-white hover:shadow-lg hover:-translate-y-2 transition-all duration-300">
              <CardHeader><CardTitle className="flex items-center text-gray-900"><Brain className="h-5 w-5 mr-2" style={{ color: primaryColor }} /> Triage Queue</CardTitle><CardDescription>Patients waiting for consultation</CardDescription></CardHeader>
              <CardContent>
                <Tabs defaultValue="queue" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-emerald-100"><TabsTrigger value="queue">Appointment Queue</TabsTrigger><TabsTrigger value="analysis">Patient Details</TabsTrigger></TabsList>
                  
                  <TabsContent value="queue" className="space-y-4 mt-4">
                    {upcomingAppointmentsInQueue.length > 0 ? upcomingAppointmentsInQueue.map((appointment) => (
                      <div key={appointment._id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-emerald-50">
                        {/* Ensure patient object and fullName exist before trying to split */}
                        <Avatar><AvatarImage src="/placeholder.svg" /><AvatarFallback>{appointment.patientNameForVisit ? appointment.patientNameForVisit.split(" ").map((n) => n[0]).join("") : 'N/A'}</AvatarFallback></Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">{appointment.patientNameForVisit || 'N/A'}</h3>
                            <Badge variant="outline" className={getUrgencyClasses(3)}>{getUrgencyLabel(3)}</Badge> {/* Placeholder Urgency */}
                          </div>
                          <p className="text-sm text-gray-600 mb-2 font-medium">Reason: {appointment.reasonForVisit || 'Not specified'}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1"><Clock className="h-4 w-4" /><span>{appointment.time} on {new Date(appointment.date).toLocaleDateString()}</span></div>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          {/* <Link to={`/call/${appointment._id}`} state={{ userName: doctor.fullName }}>
                            <Button 
                              size="sm" 
                              className="bg-teal-600 text-white hover:bg-teal-700 w-full"
                            >
                              Start Consultation
                            </Button>
                          </Link> */}
                        </div>
                      </div>
                    )) : <p className="text-center text-gray-500 py-8">You have no scheduled appointments.</p>}
                  </TabsContent>

                  <TabsContent value="analysis" className="space-y-4 mt-4">
                    {upcomingAppointmentsInQueue.length > 0 ? upcomingAppointmentsInQueue.map((appointment) => (
                      // Ensure AITriageCard exists and is imported correctly
                      <AITriageCard 
                        key={appointment._id} 
                        patientName={appointment.patientNameForVisit || 'N/A'} 
                        urgencyScore={3} // Placeholder Urgency
                        aiSummary={`Patient is scheduled for a consultation regarding: ${appointment.reasonForVisit || 'Not specified'}. Additional reported symptoms: ${appointment.symptoms || 'None provided'}.`} 
                        riskFactors={["Awaiting AI Analysis"]} 
                      />
                    )) : <p className="text-center text-gray-500 py-8">No patient details available.</p>}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="bg-white hover:shadow-lg hover:-translate-y-2 transition-all duration-300">
              <CardHeader><CardTitle className="text-gray-900">Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Link to="/doctor/schedule" className="w-full"><Button variant="outline" className="w-full justify-start"><Calendar className="h-4 w-4 mr-2" /> Manage Schedule</Button></Link>
                <Button variant="outline" className="w-full justify-start"><User className="h-4 w-4 mr-2" /> Update Profile</Button> {/* Add onClick handler later */}
                <Link to="/doctor/earnings" className="w-full"><Button variant="outline" className="w-full justify-start"><DollarSign className="h-4 w-4 mr-2" /> View Earnings</Button></Link>
              </CardContent>
            </Card>
            <Card className="bg-white hover:shadow-lg hover:-translate-y-2 transition-all duration-300">
              <CardHeader><CardTitle className="text-gray-900">Today's Schedule</CardTitle><CardDescription>Your upcoming appointments</CardDescription></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingAppointmentsInQueue.slice(0, 3).map(appointment => ( // Use filtered list
                    <div key={appointment._id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                      <div><div className="font-medium text-gray-800">{appointment.patientNameForVisit || 'N/A'}</div><div className="text-sm text-gray-600">Consultation</div></div>
                      <div className="text-sm font-medium text-gray-800">{appointment.time}</div>
                    </div>
                  ))}
                </div>
                <Link to="/doctor/schedule" className="w-full"><Button variant="outline" className="w-full mt-4">View Full Schedule</Button></Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}