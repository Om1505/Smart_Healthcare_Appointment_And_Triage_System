import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UserProfileModal({ isOpen, onClose, patient, onProfileUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ fullName: '' });

  // When the patient data is available, populate the form
  useEffect(() => {
    if (patient) {
      setFormData({ fullName: patient.fullName });
    }
  }, [patient]);

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    try {    
      const response = await axios.put('http://localhost:5001/api/users/profile', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onProfileUpdate(response.data); // Update the state in the parent component
      setIsEditing(false); // Switch back to view mode
    } catch (error) {
      console.error("Failed to update profile", error);
      alert("Could not update profile. Please try again.");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data to the original patient data
    setFormData({ fullName: patient.fullName });
  };

  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Profile' : 'Your Profile'}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Make changes to your profile here. Click save when you're done." : "View your personal details."}
          </DialogDescription>
        </DialogHeader>
        
        {isEditing ? (
          // --- EDITING VIEW ---
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fullName" className="text-right">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
        ) : (
          // --- VIEWING VIEW ---
          <div className="py-4 space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Full Name</Label>
              <p className="text-base">{patient.fullName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Email</Label>
              <p className="text-base">{patient.email}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}