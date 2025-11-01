import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const commonSymptoms = [
  "Fever", "Cough", "Headache", "Nausea", "Dizziness", "Abdominal Pain", 
  "Back Pain", "Shortness of Breath", "Fatigue"
];
const severeSymptoms = [
  "Severe chest pain or pressure",
  "Sudden difficulty breathing or shortness of breath",
  "Sudden confusion, disorientation, or difficulty speaking",
  "Sudden weakness, numbness, or drooping on one side of your face or body",
  "Sudden, severe headache (worst of your life)",
  "High fever (over 103°F / 39.4°C)",
  "Uncontrolled bleeding"
];
const preExistingConditions = [
  "Hypertension (High Blood Pressure)", "Diabetes (Type 1 or 2)", "Astma", 
  "Heart Disease", "Cancer", "Kidney Disease", "Thyroid Issues", "Depression", "Anxiety"
];
const familyHistoryOptions = [
  "Heart Disease", "Stroke", "Diabetes", "High BloodPressure", "Cancer"
];
// Mock available slots for now
const availableSlots = [
  { date: "2025-11-20", time: "10:00 AM" }, { date: "2025-11-20", time: "02:00 PM" },
  { date: "2025-11-21", time: "09:00 AM" }, { date: "2025-11-21", time: "11:00 AM" },
];

export default function BookAppointmentPage() {
  const { doctorId } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [step, setStep] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState({ date: "", time: "" });
  
  // --- 1. ADD `patientNameForVisit` TO STATE ---
  const [appointmentDetails, setAppointmentDetails] = useState({
    patientNameForVisit: "",
    birthDate: "",
    sex: "",
    primaryReason: "",
    symptomsList: [],
    symptomsOther: "",
    symptomsBegin: "",
    severeSymptomsCheck: [],
    preExistingConditions: [],
    preExistingConditionsOther: "",
    pastSurgeries: "",
    familyHistory: [],
    familyHistoryOther: "",
    allergies: "",
    medications: "",
    consentToAI: false,
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
              <CardContent className="space-y-6">
                
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Medical Emergency Disclaimer</AlertTitle>
                  <AlertDescription>
                    If you are experiencing a medical emergency (such as severe chest pain, difficulty breathing, uncontrolled bleeding, or sudden weakness), please call your local emergency services or go to the nearest emergency room immediately.
                  </AlertDescription>
                </Alert>

                {/* Patient Demographics */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-lg">Patient Information</h3>
                  <div className="space-y-2">
                    <Label htmlFor="patientNameForVisit">Patient's Full Name</Label>
                    <Input id="patientNameForVisit" value={appointmentDetails.patientNameForVisit} onChange={(e) => handleDetailsChange("patientNameForVisit", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="birthDate">Birth Date</Label>
                      <Input id="birthDate" type="date" value={appointmentDetails.birthDate} onChange={(e) => handleDetailsChange("birthDate", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sex">Sex</Label>
                      <Select value={appointmentDetails.sex} onValueChange={(value) => handleDetailsChange("sex", value)}>
                        <SelectTrigger id="sex"><SelectValue placeholder="Select sex" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                          <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Triage Questions */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-lg">Triage Questions</h3>
                  <div className="space-y-2">
                    <Label htmlFor="primaryReason">What is the primary reason for your visit?</Label>
                    <Input id="primaryReason" placeholder="e.g., Annual checkup, sore throat..." value={appointmentDetails.primaryReason} onChange={(e) => handleDetailsChange("primaryReason", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>What symptoms are you experiencing?</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {commonSymptoms.map((symptom) => (
                        <div key={symptom} className="flex items-center space-x-2">
                          <Checkbox id={symptom} onCheckedChange={(checked) => handleChecklistChange("symptomsList", symptom, checked)} />
                          <Label htmlFor={symptom} className="font-normal">{symptom}</Label>
                        </div>
                      ))}
                    </div>
                    <Input placeholder="Other symptoms..." value={appointmentDetails.symptomsOther} onChange={(e) => handleDetailsChange("symptomsOther", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>When did your main symptoms begin?</Label>
                    <RadioGroup value={appointmentDetails.symptomsBegin} onValueChange={(value) => handleDetailsChange("symptomsBegin", value)} className="space-y-1">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="Less than 24 hours ago" id="s1" /><Label htmlFor="s1" className="font-normal">Less than 24 hours ago</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="1-3 days ago" id="s2" /><Label htmlFor="s2" className="font-normal">1-3 days ago</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="4-7 days ago" id="s3" /><Label htmlFor="s3" className="font-normal">4-7 days ago</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="1-2 weeks ago" id="s4" /><Label htmlFor="s4" className="font-normal">1-2 weeks ago</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="More than 2 weeks ago" id="s5" /><Label htmlFor="s5" className="font-normal">More than 2 weeks ago</Label></div>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Have you experienced any of the following severe symptoms in the last 7 days?</Label>
                    {severeSymptoms.map((symptom) => (
                      <div key={symptom} className="flex items-center space-x-2">
                        <Checkbox id={symptom} onCheckedChange={(checked) => handleChecklistChange("severeSymptomsCheck", symptom, checked)} />
                        <Label htmlFor={symptom} className="font-normal">{symptom}</Label>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2">
                      <Checkbox id="none-severe" onCheckedChange={(checked) => handleChecklistChange("severeSymptomsCheck", "None of the above", checked)} />
                      <Label htmlFor="none-severe" className="font-normal">None of the above</Label>
                    </div>
                  </div>
                </div>

                {/* Medical History */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-lg">Medical History</h3>
                  <div className="space-y-2">
                    <Label>Do you have any pre-existing medical conditions?</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {preExistingConditions.map((condition) => (
                        <div key={condition} className="flex items-center space-x-2">
                          <Checkbox id={condition} onCheckedChange={(checked) => handleChecklistChange("preExistingConditions", condition, checked)} />
                          <Label htmlFor={condition} className="font-normal">{condition}</Label>
                        </div>
                      ))}
                    </div>
                    <Input placeholder="Other conditions (please specify)..." value={appointmentDetails.preExistingConditionsOther} onChange={(e) => handleDetailsChange("preExistingConditionsOther", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pastSurgeries">Have you had any past surgeries or hospitalizations? (Include procedure and year)</Label>
                    <Textarea id="pastSurgeries" placeholder="e.g., Appendectomy (2015), Knee surgery (2019)" value={appointmentDetails.pastSurgeries} onChange={(e) => handleDetailsChange("pastSurgeries", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Does your immediate family have a history of any of the following?</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {familyHistoryOptions.map((condition) => (
                        <div key={condition} className="flex items-center space-x-2">
                          <Checkbox id={condition+"-fam"} onCheckedChange={(checked) => handleChecklistChange("familyHistory", condition, checked)} />
                          <Label htmlFor={condition+"-fam"} className="font-normal">{condition}</Label>
                        </div>
                      ))}
                      <div className="flex items-center space-x-2">
                        <Checkbox id="none-fam" onCheckedChange={(checked) => handleChecklistChange("familyHistory", "None of the above", checked)} />
                        <Label htmlFor="none-fam" className="font-normal">None of the above</Label>
                      </div>
                    </div>
                    <Input placeholder="If cancer, please specify type..." value={appointmentDetails.familyHistoryOther} onChange={(e) => handleDetailsChange("familyHistoryOther", e.target.value)} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="allergies">Do you have any allergies (medication, food, seasonal, etc.)?</Label>
                    <Textarea id="allergies" placeholder="If yes, please list all allergies..." value={appointmentDetails.allergies} onChange={(e) => handleDetailsChange("allergies", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medications">Please list all medications, vitamins, and supplements you are currently taking.</Label>
                    <Textarea id="medications" placeholder="e.g., Lisinopril 10mg, Vitamin D 2000 IU..." value={appointmentDetails.medications} onChange={(e) => handleDetailsChange("medications", e.target.value)} />
                  </div>
                </div>

                {/* Consent */}
                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox id="consentToAI" checked={appointmentDetails.consentToAI} onCheckedChange={(checked) => handleDetailsChange("consentToAI", checked)} />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="consentToAI" className="font-semibold">Consent to AI Processing</Label>
                    <p className="text-sm text-muted-foreground">
                      I confirm the information is accurate and consent to it being processed by an AI to create a medical summary for my doctor.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                  <Button onClick={() => setStep(3)} disabled={!appointmentDetails.consentToAI || !appointmentDetails.primaryReason}>Review Booking <ArrowRight className="h-4 w-4 ml-2" /></Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* --- 6. REBUILT STEP 3 --- */}
          {step === 3 && (
            <Card className="bg-white border-gray-200">
              <CardHeader><CardTitle>Confirm Your Appointment</CardTitle><CardDescription>Review your details before confirming.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-emerald-50/50 p-4 rounded-lg space-y-3">
                  <h3 className="font-semibold mb-3">Booking Summary</h3>
                  <div className="flex justify-between"><span className="text-gray-600">Doctor:</span><span className="font-medium">{doctor.fullName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Date & Time:</span><span className="font-medium">{new Date(selectedSlot.date).toDateString()} at {selectedSlot.time}</span></div>
                  
                  <div className="border-t pt-3 mt-3 space-y-2">
                    <div className="flex justify-between"><span className="text-gray-600">Patient Name:</span><span className="font-medium">{appointmentDetails.patientNameForVisit}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Primary Reason:</span><span className="font-medium text-right">{appointmentDetails.primaryReason}</span></div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                  <Button onClick={handleBooking} size="lg" className="bg-teal-600 text-white hover:bg-teal-700">Confirm Booking</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}