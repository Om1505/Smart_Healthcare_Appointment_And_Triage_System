import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, ArrowRight, ArrowLeft } from "lucide-react";
import { useParams } from "react-router-dom";
import axios from "axios";

// Mock available slots for now
const availableSlots = [
  { date: "2025-10-20", time: "10:00 AM" }, { date: "2025-10-20", time: "02:00 PM" },
  { date: "2025-10-21", time: "09:00 AM" }, { date: "2025-10-21", time: "11:00 AM" },
];

export default function BookAppointmentPage() {
  const { doctorId } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [step, setStep] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState({ date: "", time: "" });
  
  // --- 1. ADD `patientNameForVisit` TO STATE ---
  const [appointmentDetails, setAppointmentDetails] = useState({
    patientNameForVisit: "", // This will hold the name for the visit
    reasonForVisit: "",
    symptoms: "",
    symptomDuration: "",
    previousTreatments: "",
    medications: "",
  });

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
        // --- 2. FETCH DOCTOR AND PATIENT PROFILE CONCURRENTLY ---
        const [doctorResponse, profileResponse] = await Promise.all([
          axios.get(`http://localhost:5001/api/doctors/${doctorId}`),
          axios.get('http://localhost:5001/api/users/profile', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setDoctor(doctorResponse.data);
        
        // --- 3. PRE-FILL THE NAME FIELD WITH THE LOGGED-IN USER'S NAME ---
        setAppointmentDetails(prev => ({ 
          ...prev, 
          patientNameForVisit: profileResponse.data.fullName 
        }));

      } catch (err) {
        setError("Failed to fetch page details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [doctorId]);

  const handleDetailsChange = (field, value) => {
    setAppointmentDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleBooking = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert("You must be logged in to book an appointment.");
      return;
    }

    // The new `patientNameForVisit` is already in `appointmentDetails`
    const bookingData = {
      doctorId,
      ...selectedSlot,
      ...appointmentDetails,
    };

    try {
      await axios.post('http://localhost:5001/api/appointments/book', bookingData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Appointment booked successfully!");
      window.location.href = '/patient/dashboard';
    } catch (err) {
      alert(err.response?.data?.message || "Failed to book appointment.");
    }
  };

  if (isLoading) return <div className="text-center p-8">Loading doctor details...</div>;
  if (error) return <div className="text-center p-8 text-red-600">{error}</div>;
  if (!doctor) return null; // Guard against null doctor

  return (
    <div className="min-h-screen bg-emerald-50 text-gray-800">
      <nav className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-50">{/* ...Nav JSX... */}</nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-500"}`}>1</div>
          <div className={`w-12 h-0.5 ${step >= 2 ? "bg-teal-600" : "bg-gray-200"}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-500"}`}>2</div>
          <div className={`w-12 h-0.5 ${step >= 3 ? "bg-teal-600" : "bg-gray-200"}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-500"}`}>3</div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="bg-white border-gray-200 mb-8">
            <CardContent className="p-6 flex items-center space-x-4">
              <Avatar className="w-16 h-16"><AvatarImage src="/female-doctor.jpg" /><AvatarFallback>Dr</AvatarFallback></Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{doctor.fullName}</h2>
                {/* --- 4. FIX: `specialty` to `specialization` --- */}
                <Badge className="bg-teal-100 text-teal-800 mb-2">{doctor.specialization}</Badge>
              </div>
            </CardContent>
          </Card>

          {step === 1 && (
            <Card className="bg-white border-gray-200">
              <CardHeader><CardTitle>Select Appointment Time</CardTitle><CardDescription>Choose an available time slot.</CardDescription></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {availableSlots.map((slot, index) => (
                    <Button key={index} variant={selectedSlot.date === slot.date && selectedSlot.time === slot.time ? "default" : "outline"} className="h-auto p-4 justify-start bg-emerald-50" onClick={() => setSelectedSlot(slot)}>
                      <div className="flex items-center space-x-3"><Calendar className="h-4 w-4" /><div><div className="font-medium">{new Date(slot.date).toDateString()}</div><div className="text-sm opacity-70">{slot.time}</div></div></div>
                    </Button>
                  ))}
                </div>
                <div className="flex justify-end mt-6"><Button onClick={() => setStep(2)} disabled={!selectedSlot.date}>Next Step <ArrowRight className="h-4 w-4 ml-2" /></Button></div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
  <Card className="bg-white border-gray-200">
    <CardHeader>
      <CardTitle>Appointment Details</CardTitle>
      <CardDescription>Please provide details about the patient's visit.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      
      {/* This field works */}
      <div className="space-y-2">
        <Label htmlFor="patientNameForVisit">Patient's Full Name</Label>
        <Input 
          id="patientNameForVisit" 
          placeholder="e.g., Jane Doe" 
          value={appointmentDetails.patientNameForVisit} 
          onChange={(e) => handleDetailsChange("patientNameForVisit", e.target.value)} 
        />
      </div>

      {/* This field works */}
      <div className="space-y-2"><Label htmlFor="reasonForVisit">Primary Reason for Visit</Label><Input id="reasonForVisit" placeholder="e.g., Annual checkup, chest pain" value={appointmentDetails.reasonForVisit} onChange={(e) => handleDetailsChange("reasonForVisit", e.target.value)} /></div>
      
      {/* This field works */}
      <div className="space-y-2"><Label htmlFor="symptoms">Current Symptoms</Label><Textarea id="symptoms" placeholder="Describe your symptoms..." value={appointmentDetails.symptoms} onChange={(e) => handleDetailsChange("symptoms", e.target.value)} /></div>
      
      {/* --- THESE ARE THE 3 FIXED FIELDS --- */}
      <div className="space-y-2">
        <Label htmlFor="symptomDuration">Symptom Duration</Label>
        <Input 
          id="symptomDuration" 
          placeholder="e.g., 3 days, 2 weeks" 
          value={appointmentDetails.symptomDuration} 
          onChange={(e) => handleDetailsChange("symptomDuration", e.target.value)} 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="medications">Current Medications</Label>
        <Textarea 
          id="medications" 
          placeholder="List any medications you are currently taking..." 
          value={appointmentDetails.medications} 
          onChange={(e) => handleDetailsChange("medications", e.target.value)} 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="previousTreatments">Previous Treatments (if any)</Label>
        <Textarea 
          id="previousTreatments" 
          placeholder="e.g., Physical therapy, past medications..." 
          value={appointmentDetails.previousTreatments} 
          onChange={(e) => handleDetailsChange("previousTreatments", e.target.value)} 
        />
      </div>
      
      <div className="flex justify-between mt-6"><Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button><Button onClick={() => setStep(3)} disabled={!appointmentDetails.patientNameForVisit || !appointmentDetails.reasonForVisit}>Review Booking <ArrowRight className="h-4 w-4 ml-2" /></Button></div>
    </CardContent>
  </Card>
)}

          {step === 3 && (
            <Card className="bg-white border-gray-200">
              <CardHeader><CardTitle>Confirm Your Appointment</CardTitle><CardDescription>Review your details before confirming.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-emerald-50/50 p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold mb-3">Booking Summary</h3>
                  
                  {/* --- 6. DISPLAY THE PATIENT NAME IN THE SUMMARY --- */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Patient:</span>
                    <span className="font-semibold">{appointmentDetails.patientNameForVisit}</span>
                  </div>

                  <div className="flex justify-between"><span className="text-gray-600">Doctor:</span><span>{doctor.fullName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Date & Time:</span><span>{new Date(selectedSlot.date).toDateString()} at {selectedSlot.time}</span></div>
                  <div className="flex justify-between border-t pt-2 mt-2"><span className="text-gray-600">Reason:</span><span className="text-right">{appointmentDetails.reasonForVisit}</span></div>
                </div>
                <div className="flex justify-between"><Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button><Button onClick={handleBooking} size="lg" className="bg-teal-600 text-white hover:bg-teal-700">Confirm Booking</Button></div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}