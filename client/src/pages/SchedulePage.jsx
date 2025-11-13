import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Plus, Edit, Trash2, User, ArrowLeft, LogOut, CalendarDays, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";

const daysOfWeek = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
];

export default function DoctorSchedulePage() {
    const [scheduleData, setScheduleData] = useState(null);
    const [doctor, setDoctor] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // State for managing working hours locally before saving
    const [workingHours, setWorkingHours] = useState(null);
    const [blockedTimes, setBlockedTimes] = useState([]);
    const [newBlock, setNewBlock] = useState({
        reason: "",
        date: new Date().toISOString().split('T')[0],
        startTime: "12:00",
        endTime: "13:00",
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [isPatientDetailsOpen, setIsPatientDetailsOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/login';
                return;
            }
            try {
                const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
                const [profileRes, appointmentsRes, scheduleRes] = await Promise.all([
                    axios.get('http://localhost:5001/api/users/profile', authHeaders),
                    axios.get('http://localhost:5001/api/appointments/doctor', authHeaders),
                    axios.get('http://localhost:5001/api/schedule/working-hours', authHeaders)
                ]);

                setDoctor(profileRes.data);
                setAppointments(appointmentsRes.data);

                // Set dummy schedule data for now
                setWorkingHours(scheduleRes.data);
                setBlockedTimes(profileRes.data.blockedTimes || []);
            } catch (err) {
                console.error("Error fetching data:", err.response || err);
                setError(`Failed to fetch schedule data (${err.response?.status || 'Network Error'}).`);
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

    const handleWorkingHoursChange = (day, field, value) => {
        setWorkingHours(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value },
        }));
    };

    const handleSaveChanges = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5001/api/schedule/working-hours',
                { workingHours },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Working hours updated successfully!');
        } catch (err) {
            console.error("Error saving working hours:", err);
            alert('Failed to update working hours.');
        }
    };

    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'upcoming':
                return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Upcoming</Badge>;
            case 'completed':
                return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">Completed</Badge>;
            case 'cancelled':
                return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Cancelled</Badge>;
            default:
                return <Badge className="bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100">Unknown</Badge>;
        }
    };

    const handleBlockInputChange = (field, value) => {
        setNewBlock(prev => ({ ...prev, [field]: value }));
    };

    const handleAddBlock = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await axios.post(
                'http://localhost:5001/api/schedule/blocked-times',
                newBlock,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setBlockedTimes(prev => [...prev, response.data]);
            setIsModalOpen(false);
            setNewBlock({
                reason: "",
                date: new Date().toISOString().split('T')[0],
                startTime: "12:00",
                endTime: "13:00",
            });
        } catch (err) {
            console.error("Error adding block:", err);
            alert(err.response?.data?.message || 'Failed to add block.');
        }
    };

    const handleDeleteBlock = async (blockId) => {
        if (!window.confirm("Are you sure you want to delete this block?")) return;

        const token = localStorage.getItem('token');
        try {
            await axios.delete(
                `http://localhost:5001/api/schedule/blocked-times/${blockId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setBlockedTimes(prev => prev.filter(block => block._id !== blockId));
        } catch (err) {
            console.error("Error deleting block:", err);
            alert(err.response?.data?.message || 'Failed to delete block.');
        }
    };

    const groupAppointmentsByDate = (appointments) => {
        const grouped = {};
        // Filter out appointments with null patients first
        const validAppointments = appointments.filter(appointment => appointment.patient);

        validAppointments.forEach(appointment => {
            const date = new Date(appointment.date).toDateString();
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(appointment);
        });
        return grouped;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return "Today";
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return "Tomorrow";
        } else {
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
        }
    };

    const handleViewDetails = (appointment) => {
        setSelectedAppointment(appointment);
        setIsPatientDetailsOpen(true);
    };

    if (isLoading || !workingHours) return <div className="flex items-center justify-center h-screen">Loading Schedule...</div>;
    if (error) return <div className="flex items-center justify-center h-screen text-red-600">{error}</div>;

    return (
        <div className="min-h-screen bg-emerald-50 text-gray-800">
            <nav className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                            <img src="/Logo.svg" className="h-25 w-30" alt="Logo" />
                            <span className="text-3xl font-bold">IntelliConsult</span>
                        </Link>
                        <div className="flex items-center space-x-4">
                            <Link to="/doctor/dashboard">
                                <Button variant="outline" size="sm" className="border-gray-300">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Dashboard
                                </Button>
                            </Link>
                            <Button onClick={handleLogout} variant="outline" size="sm" className="border-gray-300">
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </Button>
                            <Avatar>
                                <AvatarImage src="/female-doctor.jpg" alt={doctor.fullName} />
                                <AvatarFallback className="bg-teal-100 text-teal-800">
                                    {doctor.fullName.split(" ").map((n) => n[0]).join("")}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Schedule Management</h1>
                    <p className="text-gray-600">View your appointments and manage your availability</p>
                </div>

                <Tabs defaultValue="appointments" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-emerald-100 mb-8">
                        <TabsTrigger value="appointments" className="flex items-center space-x-2">
                            <CalendarDays className="h-4 w-4" />
                            <span>All Appointments</span>
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="flex items-center space-x-2">
                            <Settings className="h-4 w-4" />
                            <span>Schedule Settings</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="appointments" className="space-y-6">
                        <div className="grid md:grid-cols-3 gap-6 mb-6">
                            <Card className="bg-white">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium text-gray-700">Total Appointments</CardTitle>
                                        <Calendar className="h-4 w-4 text-gray-500" />
                                    </div>
                                    <div className="text-2xl font-bold text-teal-600">{appointments.length}</div>
                                </CardHeader>
                            </Card>
                            <Card className="bg-white">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium text-gray-700">Today's Appointments</CardTitle>
                                        <Clock className="h-4 w-4 text-gray-500" />
                                    </div>
                                    <div className="text-2xl font-bold text-blue-600">
                                        {appointments.filter(apt =>
                                            new Date(apt.date).toDateString() === new Date().toDateString()
                                        ).length}
                                    </div>
                                </CardHeader>
                            </Card>
                            <Card className="bg-white">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium text-gray-700">Upcoming</CardTitle>
                                        <CalendarDays className="h-4 w-4 text-gray-500" />
                                    </div>
                                    <div className="text-2xl font-bold text-green-600">
                                        {appointments.filter(apt =>
                                            new Date(apt.date) > new Date()
                                        ).length}
                                    </div>
                                </CardHeader>
                            </Card>
                        </div>

                        <Card className="bg-white">
                            <CardHeader>
                                <CardTitle>All Appointments</CardTitle>
                                <CardDescription>Complete list of your scheduled appointments</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {appointments.length > 0 ? (
                                    <div className="space-y-6">
                                        {Object.entries(groupAppointmentsByDate(appointments))
                                            .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
                                            .map(([date, dateAppointments]) => (
                                                <div key={date} className="space-y-3">
                                                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                                                        {formatDate(date)}
                                                        <span className="text-sm font-normal text-gray-500 ml-2">
                                                            ({dateAppointments.length} appointment{dateAppointments.length !== 1 ? 's' : ''})
                                                        </span>
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {dateAppointments
                                                            .sort((a, b) => a.time.localeCompare(b.time))
                                                            .map((appointment) => (
                                                                <div key={appointment._id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-emerald-50 transition-colors">
                                                                    <Avatar>
                                                                        <AvatarImage src="/placeholder.svg" />
                                                                        <AvatarFallback className="bg-teal-100 text-teal-800">
                                                                            {appointment.patient?.fullName ?
                                                                                appointment.patient.fullName.split(" ").map((n) => n[0]).join("") :
                                                                                "??"
                                                                            }
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <h4 className="font-semibold text-gray-900">{appointment.patient?.fullName || "Unknown Patient"}</h4>
                                                                            <div className="flex items-center space-x-2">
                                                                                {getStatusBadge(appointment.status)}
                                                                                <Badge variant="outline" className="text-xs">
                                                                                    {appointment.time}
                                                                                </Badge>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-sm text-gray-600 mb-1">
                                                                            <span className="font-medium">Reason:</span> {appointment.reasonForVisit || appointment.primaryReason || "No reason specified"}
                                                                        </p>
                                                                        {appointment.symptoms && (
                                                                            <p className="text-sm text-gray-600 mb-2">
                                                                                <span className="font-medium">Symptoms:</span> {appointment.symptoms}
                                                                            </p>
                                                                        )}
                                                                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                                            <span>Contact: {appointment.patient?.email || "No email"}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col space-y-2 min-w-[140px]">
                                                                        {appointment.status === 'upcoming' && (
                                                                            <Button size="sm" className="bg-teal-600 text-white hover:bg-teal-700 w-full">
                                                                                Start Consultation
                                                                            </Button>
                                                                        )}
                                                                        <Button variant="outline" size="sm" className="w-full" onClick={() => handleViewDetails(appointment)}>
                                                                            View Details
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments scheduled</h3>
                                        <p className="text-gray-600">Your appointment schedule is currently empty.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-6">
                        <div className="grid lg:grid-cols-2 gap-8">
                            <Card className="bg-white">
                                <CardHeader>
                                    <CardTitle>Working Hours</CardTitle>
                                    <CardDescription>Set your availability for each day of the week</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {workingHours && daysOfWeek.map((day) => (
                                        <div key={day.key} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                                            <div className="w-20">
                                                <Label className="font-medium">{day.label}</Label>
                                            </div>
                                            <Switch
                                                checked={workingHours[day.key].enabled}
                                                onCheckedChange={(checked) => handleWorkingHoursChange(day.key, "enabled", checked)}
                                            />
                                            {workingHours[day.key].enabled && (
                                                <div className="flex items-center space-x-2 flex-1">
                                                    <Input
                                                        type="time"
                                                        value={workingHours[day.key].start}
                                                        onChange={(e) => handleWorkingHoursChange(day.key, "start", e.target.value)}
                                                        className="w-32"
                                                    />
                                                    <span className="text-gray-500">to</span>
                                                    <Input
                                                        type="time"
                                                        value={workingHours[day.key].end}
                                                        onChange={(e) => handleWorkingHoursChange(day.key, "end", e.target.value)}
                                                        className="w-32"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <Button onClick={handleSaveChanges} className="w-full bg-teal-600 text-white hover:bg-teal-700">Save Working Hours</Button>
                                </CardContent>
                            </Card>

                            <Card className="bg-white">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Blocked Times</CardTitle>
                                            <CardDescription>Block specific time slots</CardDescription>
                                        </div>
                                        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                                            <DialogTrigger asChild>
                                                <Button size="sm" className="bg-teal-600 text-white hover:bg-teal-700">
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add Block
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Add New Block</DialogTitle>
                                                    <DialogDescription>
                                                        Block off a time slot on a specific date.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="reason" className="text-right">Reason</Label>
                                                        <Input id="reason" value={newBlock.reason} onChange={(e) => handleBlockInputChange('reason', e.target.value)} className="col-span-3" placeholder="e.g., Lunch, Meeting" />
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="date" className="text-right">Date</Label>
                                                        <Input id="date" type="date" value={newBlock.date} onChange={(e) => handleBlockInputChange('date', e.target.value)} className="col-span-3" />
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="startTime" className="text-right">Start Time</Label>
                                                        <Input id="startTime" type="time" value={newBlock.startTime} onChange={(e) => handleBlockInputChange('startTime', e.target.value)} className="col-span-3" />
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="endTime" className="text-right">End Time</Label>
                                                        <Input id="endTime" type="time" value={newBlock.endTime} onChange={(e) => handleBlockInputChange('endTime', e.target.value)} className="col-span-3" />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button variant="outline">Cancel</Button>
                                                    </DialogClose>
                                                    <Button onClick={handleAddBlock}>Save Block</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {blockedTimes.map((block) => (
                                            <div key={block._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                                <div>
                                                    <div className="font-medium">{block.reason}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {new Date(block.date).toLocaleDateString()} • {block.startTime} - {block.endTime}
                                                    </div>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <Button variant="outline" size="icon" className="h-8 w-8" disabled><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="outline" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => handleDeleteBlock(block._id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        {blockedTimes.length === 0 && (
                                            <p className="text-sm text-gray-500 text-center py-4">No blocked times added.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Patient Details Modal */}
            <Dialog open={isPatientDetailsOpen} onOpenChange={setIsPatientDetailsOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <User className="h-5 w-5" />
                            <span>Patient Details</span>
                        </DialogTitle>
                        <DialogDescription>
                            Complete information about the patient and appointment
                        </DialogDescription>
                    </DialogHeader>

                    {selectedAppointment && (
                        <div className="space-y-6">
                            {/* Patient Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Patient Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Full Name</Label>
                                        <p className="text-sm text-gray-900">{selectedAppointment.patientNameForVisit || selectedAppointment.patient?.fullName || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Email</Label>
                                        <p className="text-sm text-gray-900">{selectedAppointment.email || selectedAppointment.patient?.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Phone Number</Label>
                                        <p className="text-sm text-gray-900">{selectedAppointment.phoneNumber || selectedAppointment.patient?.phoneNumber || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Date of Birth</Label>
                                        <p className="text-sm text-gray-900">
                                            {selectedAppointment.birthDate
                                                ? new Date(selectedAppointment.birthDate).toLocaleDateString()
                                                : selectedAppointment.patient?.dateOfBirth
                                                    ? new Date(selectedAppointment.patient.dateOfBirth).toLocaleDateString()
                                                    : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Sex</Label>
                                        <p className="text-sm text-gray-900">{selectedAppointment.sex || selectedAppointment.patient?.gender || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Primary Language</Label>
                                        <p className="text-sm text-gray-900">{selectedAppointment.primaryLanguage || 'N/A'}</p>
                                    </div>
                                </div>
                                {selectedAppointment.patient?.address && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Address</Label>
                                        <p className="text-sm text-gray-900">{selectedAppointment.patient.address}</p>
                                    </div>
                                )}
                            </div>

                            {/* Appointment Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Appointment Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Date & Time</Label>
                                        <p className="text-sm text-gray-900">
                                            {new Date(selectedAppointment.date).toLocaleDateString()} at {selectedAppointment.time}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Status</Label>
                                        <div className="mt-1">
                                            {getStatusBadge(selectedAppointment.status)}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Consultation Fee</Label>
                                        <p className="text-sm text-gray-900">₹{selectedAppointment.consultationFee || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Medical Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Medical Information</h3>

                                <div>
                                    <Label className="text-sm font-medium text-gray-700">Primary Reason for Visit</Label>
                                    <p className="text-sm text-gray-900 mt-1">
                                        {selectedAppointment.primaryReason || selectedAppointment.reasonForVisit || 'Not specified'}
                                    </p>
                                </div>

                                {selectedAppointment.symptomsList && selectedAppointment.symptomsList.length > 0 && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Symptoms</Label>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {selectedAppointment.symptomsList.map((symptom, index) => (
                                                <Badge key={index} variant="outline" className="text-xs">
                                                    {symptom}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedAppointment.symptomsOther && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Other Symptoms</Label>
                                        <p className="text-sm text-gray-900 mt-1">{selectedAppointment.symptomsOther}</p>
                                    </div>
                                )}

                                {selectedAppointment.symptomsBegin && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">When Symptoms Began</Label>
                                        <p className="text-sm text-gray-900 mt-1">{selectedAppointment.symptomsBegin}</p>
                                    </div>
                                )}

                                {selectedAppointment.severeSymptomsCheck && selectedAppointment.severeSymptomsCheck.length > 0 && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Severe Symptoms (Last 7 Days)</Label>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {selectedAppointment.severeSymptomsCheck.map((symptom, index) => (
                                                <Badge key={index} variant="outline" className="text-xs bg-red-50 text-red-800 border-red-200">
                                                    {symptom}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedAppointment.preExistingConditions && selectedAppointment.preExistingConditions.length > 0 && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Pre-existing Conditions</Label>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {selectedAppointment.preExistingConditions.map((condition, index) => (
                                                <Badge key={index} variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200">
                                                    {condition}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedAppointment.preExistingConditionsOther && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Other Pre-existing Conditions</Label>
                                        <p className="text-sm text-gray-900 mt-1">{selectedAppointment.preExistingConditionsOther}</p>
                                    </div>
                                )}

                                {selectedAppointment.familyHistory && selectedAppointment.familyHistory.length > 0 && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Family History</Label>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {selectedAppointment.familyHistory.map((history, index) => (
                                                <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-800 border-blue-200">
                                                    {history}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedAppointment.familyHistoryOther && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Other Family History</Label>
                                        <p className="text-sm text-gray-900 mt-1">{selectedAppointment.familyHistoryOther}</p>
                                    </div>
                                )}

                                {selectedAppointment.pastSurgeries && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Past Surgeries & Hospitalizations</Label>
                                        <p className="text-sm text-gray-900 mt-1">{selectedAppointment.pastSurgeries}</p>
                                    </div>
                                )}

                                {selectedAppointment.allergies && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Allergies</Label>
                                        <p className="text-sm text-gray-900 mt-1">{selectedAppointment.allergies}</p>
                                    </div>
                                )}

                                {selectedAppointment.medications && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Current Medications & Supplements</Label>
                                        <p className="text-sm text-gray-900 mt-1">{selectedAppointment.medications}</p>
                                    </div>
                                )}

                                {selectedAppointment.urgency && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Urgency Level</Label>
                                        <div className="mt-1">
                                            <Badge className={
                                                selectedAppointment.urgency === 'High' ? 'bg-red-100 text-red-800 border-red-200' :
                                                    selectedAppointment.urgency === 'Medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                        'bg-gray-100 text-gray-800 border-gray-200'
                                            }>
                                                {selectedAppointment.urgency} Priority
                                            </Badge>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Additional Notes */}
                            {selectedAppointment.additionalNotes && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Additional Notes</h3>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="text-sm text-gray-900">{selectedAppointment.additionalNotes}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPatientDetailsOpen(false)}>
                            Close
                        </Button>
                        {selectedAppointment?.status === 'upcoming' && (
                            <Button className="bg-teal-600 text-white hover:bg-teal-700">
                                Start Consultation
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};