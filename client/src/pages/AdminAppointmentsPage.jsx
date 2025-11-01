import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Stethoscope, Users, Calendar, ArrowLeft } from "lucide-react";
import { useNavigate, Link } from 'react-router-dom';

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
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
        setAppointments(response.data);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-600" />
        <span className="ml-4 text-lg text-gray-700">Loading Appointments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
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

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Calendar className="w-6 h-6 mr-3 text-cyan-700" />
              All Appointments
            </CardTitle>
            <CardDescription>A complete list of all appointments in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.length > 0 ? (
                  appointments.map((appt) => (
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
    </div>
  );
}