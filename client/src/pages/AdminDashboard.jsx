import React, { useState, useEffect, useMemo } from 'react'; // <-- Import useMemo
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, Stethoscope, Users } from "lucide-react";
import { // <-- Import Select components for the filter
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [specializationFilter, setSpecializationFilter] = useState('all'); // <-- New state for filter

  useEffect(() => {
    const fetchAllUsers = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Authorization token not found. Please log in.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('http://localhost:5001/api/users/all', {
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        setDoctors(response.data.doctors);
        setPatients(response.data.patients);
      } catch (err) {
        const errorMessage = err.response?.data?.message || "An error occurred while fetching user data.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsers();
  }, []);

  const handleVerify = async (userId, userType) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert("Session expired. Please log in again.");
      return;
    }

    setVerifyingId(userId);

    try {
      const response = await axios.patch(
        `http://localhost:5001/api/users/verify/${userId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const updatedUser = response.data.user;

      if (userType === 'doctor') {
        setDoctors(docs =>
          docs.map(doc => doc._id === userId ? { ...doc, isVerified: updatedUser.isVerified } : doc)
        );
      } else if (userType === 'patient') {
        setPatients(pats =>
          pats.map(pat => pat._id === userId ? { ...pat, isVerified: updatedUser.isVerified } : pat)
        );
      }

    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to verify user.";
      alert(`Error: ${errorMessage}`);
    } finally {
      setVerifyingId(null);
    }
  };

  // --- New Filter Logic ---

  // 1. Get a list of unique specializations from the doctors array
  // useMemo ensures this list is only recalculated when 'doctors' changes
  const uniqueSpecializations = useMemo(() => {
    const specs = new Set(doctors.map(doc => doc.specialization).filter(Boolean)); // .filter(Boolean) removes any null/undefined
    return Array.from(specs);
  }, [doctors]);

  // 2. Create the filtered list of doctors based on the filter state
  const filteredDoctors = useMemo(() => {
    if (specializationFilter === 'all') {
      return doctors;
    }
    return doctors.filter(doc => doc.specialization === specializationFilter);
  }, [doctors, specializationFilter]);

  // --- End New Filter Logic ---


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <span className="ml-4 text-lg text-gray-700">Loading user data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <AlertCircle className="w-12 h-12 text-red-600" />
        <span className="mt-4 text-lg text-red-700">Error: {error}</span>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* Doctors Table */}
        <Card className="mb-8 shadow-sm">
          <CardHeader>
            {/* --- MODIFIED CardHeader to include filter --- */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center text-2xl">
                  <Stethoscope className="w-6 h-6 mr-3 text-blue-700" />
                  Doctors
                </CardTitle>
                <CardDescription>A list of all registered doctors and their verification status.</CardDescription>
              </div>
              
              {/* --- NEW Filter Dropdown --- */}
              <div className="w-full sm:w-auto sm:min-w-[200px]">
                <Select
                  value={specializationFilter}
                  onValueChange={(value) => setSpecializationFilter(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by specialization..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specializations</SelectItem>
                    {uniqueSpecializations.map(spec => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* --- END MODIFICATION --- */}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>License Number</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* --- MODIFIED to use filteredDoctors --- */}
                {filteredDoctors.length > 0 ? (
                  filteredDoctors.map((doctor) => (
                    <TableRow key={doctor._id}>
                      <TableCell className="font-medium">{doctor.fullName}</TableCell>
                      <TableCell>{doctor.email}</TableCell>
                      <TableCell><Badge variant="outline">{doctor.specialization}</Badge></TableCell>
                      <TableCell>{doctor.experience} years</TableCell>
                      <TableCell>{doctor.licenseNumber}</TableCell>
                      <TableCell className="text-center">
                        {doctor.isVerified ? (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleVerify(doctor._id, 'doctor')}
                            disabled={verifyingId === doctor._id}
                          >
                            {verifyingId === doctor._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Verify'
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  // --- NEW: Show message if filter results in no doctors ---
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No doctors found for the selected specialization.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Patients Table (unchanged) */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Users className="w-6 h-6 mr-3 text-purple-700" />
              Patients
            </CardTitle>
            <CardDescription>A list of all registered patients and their verification status.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined On</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* This table remains unfiltered, but you could add filtering here too if needed */}
                {patients.map((patient) => (
                  <TableRow key={patient._id}>
                    <TableCell className="font-medium">{patient.fullName}</TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>{new Date(patient.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-center">
                      {patient.isVerified ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleVerify(patient._id, 'patient')}
                          disabled={verifyingId === patient._id}
                        >
                          {verifyingId === patient._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Verify'
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}