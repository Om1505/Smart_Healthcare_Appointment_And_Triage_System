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
import { Calendar, Clock, Plus, Edit, Trash2, Stethoscope, User, ArrowLeft, LogOut, CalendarDays, Settings } from "lucide-react";
import { Link } from "react-router-dom";

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

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/login';
                return;
            }
            try {
                const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
                const [profileRes, appointmentsRes] = await Promise.all([
                    axios.get('http://localhost:5001/api/users/profile', authHeaders),
                    axios.get('http://localhost:5001/api/appointments/doctor', authHeaders)
                ]);
                
                setDoctor(profileRes.data);
                setAppointments(appointmentsRes.data);
                
                // Set dummy schedule data for now
                setScheduleData({
                    workingHours: {
                        monday: { enabled: true, start: "09:00", end: "17:00" },
                        tuesday: { enabled: true, start: "09:00", end: "17:00" },
                        wednesday: { enabled: true, start: "09:00", end: "17:00" },
                        thursday: { enabled: true, start: "09:00", end: "17:00" },
                        friday: { enabled: true, start: "09:00", end: "17:00" },
                        saturday: { enabled: false, start: "", end: "" },
                        sunday: { enabled: false, start: "", end: "" }
                    },
                    blockedTimes: [
                        { id: 1, reason: "Lunch Break", date: new Date(), startTime: "13:00", endTime: "14:00" },
                        { id: 2, reason: "Meeting", date: new Date(), startTime: "15:00", endTime: "16:00" }
                    ]
                });
                setWorkingHours({
                    monday: { enabled: true, start: "09:00", end: "17:00" },
                    tuesday: { enabled: true, start: "09:00", end: "17:00" },
                    wednesday: { enabled: true, start: "09:00", end: "17:00" },
                    thursday: { enabled: true, start: "09:00", end: "17:00" },
                    friday: { enabled: true, start: "09:00", end: "17:00" },
                    saturday: { enabled: false, start: "", end: "" },
                    sunday: { enabled: false, start: "", end: "" }
                });
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
            await axios.post('http://localhost:5001/api/doctor/schedule/hours',
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
                return <Badge className="bg-green-100 text-green-800 border-green-200">Upcoming</Badge>;
            case 'completed':
                return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Completed</Badge>;
            case 'cancelled':
                return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
            default:
                return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Unknown</Badge>;
        }
    };

    const groupAppointmentsByDate = (appointments) => {
        const grouped = {};
        appointments.forEach(appointment => {
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

    if (isLoading) return <div className="flex items-center justify-center h-screen">Loading Schedule...</div>;
    if (error) return <div className="flex items-center justify-center h-screen text-red-600">{error}</div>;

    return (
        <div className="min-h-screen bg-emerald-50 text-gray-800">
            <nav className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                            <Stethoscope className="h-8 w-8 text-teal-600" />
                            <span className="text-xl font-bold text-gray-900">IntelliConsult</span>
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
                                                                    {appointment.patient.fullName.split(" ").map((n) => n[0]).join("")}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <h4 className="font-semibold text-gray-900">{appointment.patient.fullName}</h4>
                                                                    <div className="flex items-center space-x-2">
                                                                        {getStatusBadge(appointment.status)}
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {appointment.time}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                                <p className="text-sm text-gray-600 mb-1">
                                                                    <span className="font-medium">Reason:</span> {appointment.reasonForVisit}
                                                                </p>
                                                                {appointment.symptoms && (
                                                                    <p className="text-sm text-gray-600 mb-2">
                                                                        <span className="font-medium">Symptoms:</span> {appointment.symptoms}
                                                                    </p>
                                                                )}
                                                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                                    <span>Patient ID: {appointment.patient._id}</span>
                                                                    <span>•</span>
                                                                    <span>Contact: {appointment.patient.email}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col space-y-2">
                                                                <Button size="sm" className="bg-teal-600 text-white hover:bg-teal-700">
                                                                    Start Consultation
                                                                </Button>
                                                                <Button variant="outline" size="sm">
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
                                            <CardDescription>Block specific time slots when you're unavailable</CardDescription>
                                        </div>
                                        <Button size="sm" className="bg-teal-600 text-white hover:bg-teal-700">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Block
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {scheduleData?.blockedTimes?.map((block) => (
                                            <div key={block.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                                <div>
                                                    <div className="font-medium">{block.reason}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {new Date(block.date).toLocaleDateString()} • {block.startTime} - {block.endTime}
                                                    </div>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <Button variant="outline" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="outline" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}