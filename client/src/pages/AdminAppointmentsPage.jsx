import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Calendar, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from 'react-router-dom';

export default function AdminAppointmentsPage() {
  // Separate states for each appointment type
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [cancelledAppointments, setCancelledAppointments] = useState([]);
  const [completedAppointments, setCompletedAppointments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAppointments = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Authorization token not found. Please log in.");
        setLoading(false);
        navigate('/login');
        return;
      }

      try {
        const response = await axios.get('http://localhost:5001/api/admin/appointments', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const allAppointments = response.data;

        // 1. Filter by status
        const upcoming = allAppointments.filter(a => a.status === 'upcoming' || a.status === 'rescheduled');
        const cancelled = allAppointments.filter(a => a.status === 'cancelled');
        const completed = allAppointments.filter(a => a.status === 'completed');

        // 2. Sort upcoming appointments (soonest first)
        upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 3. Set the new states
        setUpcomingAppointments(upcoming);
        setCancelledAppointments(cancelled);
        setCompletedAppointments(completed);

      } catch (err) {
        const errorMessage = err.response?.data?.message || "An error occurred while fetching data.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [navigate]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Reusable component for the appointment table body
  const AppointmentTableBody = ({ appointments }) => {
    if (appointments.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center text-gray-500 py-8">
            No appointments found in this category.
          </TableCell>
        </TableRow>
      );
    }

    return appointments.map((appt) => (
      <TableRow key={appt._id}>
        <TableCell className="font-medium">
          {appt.patient?.fullName || 'N/A'}
        </TableCell>
        <TableCell>{appt.doctor?.fullName || 'N/A'}</TableCell>
        <TableCell>
          <Badge variant="outline">
            {appt.doctor?.specialization || 'N/A'}
          </Badge>
        </TableCell>
        <TableCell>
          {new Date(appt.date).toLocaleDateString()} at {appt.time}
        </TableCell>
        <TableCell>
          {getStatusBadge(appt.status)}
        </TableCell>
      </TableRow>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8 bg-emerald-50">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-600" />
        <span className="ml-4 text-lg text-gray-700">Loading Appointments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-emerald-50">
        <AlertCircle className="w-12 h-12 text-red-600" />
        <span className="mt-4 text-lg text-red-700">Error: {error}</span>
        <Button onClick={() => navigate('/admin/dashboard')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50 text-gray-800 p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto">
        <Button 
          variant="outline" 
          className="mb-4" 
          onClick={() => navigate('/admin/dashboard')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center">
          <Calendar className="w-8 h-8 mr-3 text-cyan-700" />
          All Appointments
        </h1>

        {/* Grid for Upcoming and Cancelled */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Upcoming Appointments Card */}
          <Card className="shadow-sm flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl text-blue-800">
                <Calendar className="w-6 h-6 mr-3" />
                Upcoming Appointments
              </CardTitle>
              <CardDescription>
                Sorted by soonest.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* SCROLLABLE CONTAINER (h-400px) */}
              <div className="h-[400px] overflow-y-auto relative border rounded-md"> 
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Spec</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AppointmentTableBody appointments={upcomingAppointments} />
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Cancelled Appointments Card */}
          <Card className="shadow-sm flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl text-red-800">
                <XCircle className="w-6 h-6 mr-3" />
                Cancelled Appointments
              </CardTitle>
              <CardDescription>
                List of cancelled appointments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* SCROLLABLE CONTAINER (h-400px) */}
              <div className="h-[400px] overflow-y-auto relative border rounded-md"> 
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Spec</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AppointmentTableBody appointments={cancelledAppointments} />
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Completed Appointments Card (Full Width) */}
        <Card className="shadow-sm mt-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl text-green-800">
              <CheckCircle className="w-6 h-6 mr-3" />
              Completed Appointments
            </CardTitle>
            <CardDescription>
              History of all completed appointments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* SCROLLABLE CONTAINER (h-500px) */}
            <div className="h-[500px] overflow-y-auto relative border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AppointmentTableBody appointments={completedAppointments} />
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}