describe('Prescription Page Tests', () => {
  const mockAppointmentId = '507f1f77bcf86cd799439011';
  const mockAppointment = {
    _id: mockAppointmentId,
    patient: {
      fullName: 'John Doe',
      email: 'john@example.com'
    },
    patientNameForVisit: 'John Doe',
    date: '2024-12-01',
    time: '10:00 AM',
    primaryReason: 'Regular checkup',
    symptomsList: ['Fever', 'Headache'],
    symptoms: ['Fever', 'Headache'],
    preExistingConditions: ['Hypertension'],
    allergies: 'Penicillin',
    medications: 'Lisinopril 10mg'
  };

  beforeEach(() => {
    // Mock authentication
    localStorage.setItem('token', 'mock-jwt-token');
    
    // Mock doctor appointments
    cy.intercept('GET', '**/api/appointments/doctor', {
      statusCode: 200,
      body: [mockAppointment]
    }).as('getDoctorAppointments');
    
    // Mock existing prescription (404 means no prescription yet)
    cy.intercept('GET', `**/api/prescriptions/appointment/${mockAppointmentId}`, {
      statusCode: 404,
      body: { message: 'No prescription found' }
    }).as('getPrescription');
  
    cy.visit(`/doctor/prescription/${mockAppointmentId}`);
    cy.wait(['@getDoctorAppointments']);
  });

  describe('Page Load and Patient Information', () => {
    it('should load the prescription page successfully', () => {
      cy.url().should('include', `/doctor/prescription/${mockAppointmentId}`);
    });

    it('should display page title and description', () => {
      cy.contains('Prescription & Consultation Notes').should('be.visible');
      cy.contains('Complete the prescription and notes for this consultation').should('be.visible');
    });

    it('should display patient information', () => {
      cy.contains('John Doe').should('be.visible');
      cy.contains('john@example.com').should('be.visible');
    });

    it('should display appointment details', () => {
      cy.contains('12/1/2024').should('be.visible');
      cy.contains('10:00 AM').should('be.visible');
      cy.contains('Regular checkup').should('be.visible');
    });

    it('should display patient summary', () => {
      cy.contains('Patient Summary').should('be.visible');
      cy.contains('Symptoms:').should('be.visible');
      cy.contains('Fever, Headache').should('be.visible');
      cy.contains('Pre-existing Conditions:').should('be.visible');
      cy.contains('Hypertension').should('be.visible');
      cy.contains('Allergies:').should('be.visible');
      cy.contains('Penicillin').should('be.visible');
    });
  });

  describe('Diagnosis Section', () => {
    it('should display diagnosis input field', () => {
      cy.get('[data-testid="prescription-diagnosis-input"]').should('be.visible');
    });

    it('should allow entering diagnosis', () => {
      const diagnosis = 'Upper Respiratory Tract Infection';
      cy.get('[data-testid="prescription-diagnosis-input"]').type(diagnosis);
      cy.get('[data-testid="prescription-diagnosis-input"]').should('have.value', diagnosis);
    });

    it('should show diagnosis as required field', () => {
      cy.contains('Diagnosis *').should('be.visible');
    });

    it('should clear diagnosis input', () => {
      cy.get('[data-testid="prescription-diagnosis-input"]').type('Test diagnosis').clear();
      cy.get('[data-testid="prescription-diagnosis-input"]').should('have.value', '');
    });
  });

  describe('Prescription/Medication Section', () => {
    it('should display prescription section', () => {
      cy.contains('Prescription').should('be.visible');
      cy.contains('Add medications prescribed to the patient').should('be.visible');
    });

    it('should display initial medication row', () => {
      cy.get('[data-testid="prescription-medication-0-input"]').should('be.visible');
      cy.get('[data-testid="prescription-dosage-0-input"]').should('be.visible');
      cy.get('[data-testid="prescription-instructions-0-input"]').should('be.visible');
      cy.get('[data-testid="prescription-duration-0-input"]').should('be.visible');
    });

    it('should allow entering medication details', () => {
      cy.get('[data-testid="prescription-medication-0-input"]').type('Paracetamol');
      cy.get('[data-testid="prescription-dosage-0-input"]').type('500mg');
      cy.get('[data-testid="prescription-instructions-0-input"]').type('Take twice daily after meals');
      cy.get('[data-testid="prescription-duration-0-input"]').type('7 days');
      
      cy.get('[data-testid="prescription-medication-0-input"]').should('have.value', 'Paracetamol');
      cy.get('[data-testid="prescription-dosage-0-input"]').should('have.value', '500mg');
      cy.get('[data-testid="prescription-instructions-0-input"]').should('have.value', 'Take twice daily after meals');
      cy.get('[data-testid="prescription-duration-0-input"]').should('have.value', '7 days');
    });

    it('should add new medication row', () => {
      cy.get('[data-testid="prescription-add-medication-btn"]').click();
      cy.get('[data-testid="prescription-medication-1-input"]').should('be.visible');
      cy.get('[data-testid="prescription-dosage-1-input"]').should('be.visible');
    });

    it('should add multiple medication rows', () => {
      cy.get('[data-testid="prescription-add-medication-btn"]').click();
      cy.get('[data-testid="prescription-add-medication-btn"]').click();
      cy.get('[data-testid="prescription-medication-2-input"]').should('be.visible');
    });

    it('should remove medication row', () => {
      // Find and click the remove button for the second medication
      cy.get('[data-testid="prescription-add-medication-btn"]').click();
      cy.get('[data-testid="prescription-medication-1-input"]')
        .parents('.p-4')
        .find('button')
        .click();
      cy.get('[data-testid="prescription-medication-1-input"]').should('not.exist');
    });

    it('should not remove the last medication row', () => {
      // Try to find remove button on first row - should not exist when it's the only row
      cy.get('[data-testid="prescription-medication-0-input"]').should('exist');
    });

    it('should display medication labels correctly', () => {
      cy.contains('Medication Name *').should('be.visible');
      cy.contains('Dosage *').should('be.visible');
      cy.contains('Instructions *').should('be.visible');
      cy.contains('Duration').should('be.visible');
    });
  });

  describe('Consultation Notes Section', () => {
    it('should display notes textarea', () => {
      cy.get('[data-testid="prescription-notes-input"]').should('be.visible');
    });

    it('should allow entering consultation notes', () => {
      const notes = 'Patient shows improvement. Continue current treatment plan.';
      cy.get('[data-testid="prescription-notes-input"]').type(notes);
      cy.get('[data-testid="prescription-notes-input"]').should('have.value', notes);
    });

    it('should display notes as optional field', () => {
      cy.contains('Optional: Add any relevant clinical notes').should('be.visible');
    });
  });

  describe('Follow-up Section', () => {
    it('should display follow-up checkbox', () => {
      cy.get('[data-testid="prescription-followup-checkbox"]').should('be.visible');
      cy.contains('Follow-up required').should('be.visible');
    });

    it('should not show follow-up fields initially', () => {
      cy.get('[data-testid="prescription-followup-date-input"]').should('not.exist');
      cy.get('[data-testid="prescription-followup-notes-input"]').should('not.exist');
    });

    it('should show follow-up fields when checkbox is checked', () => {
      cy.get('[data-testid="prescription-followup-checkbox"]').click();
      cy.get('[data-testid="prescription-followup-date-input"]').should('be.visible');
      cy.get('[data-testid="prescription-followup-notes-input"]').should('be.visible');
    });

    it('should hide follow-up fields when checkbox is unchecked', () => {
      cy.get('[data-testid="prescription-followup-checkbox"]').click();
      cy.get('[data-testid="prescription-followup-date-input"]').should('be.visible');
      
      cy.get('[data-testid="prescription-followup-checkbox"]').click();
      cy.get('[data-testid="prescription-followup-date-input"]').should('not.exist');
    });

    it('should allow entering follow-up date', () => {
      cy.get('[data-testid="prescription-followup-checkbox"]').click();
      const futureDate = '2025-12-15';
      cy.get('[data-testid="prescription-followup-date-input"]').type(futureDate);
      cy.get('[data-testid="prescription-followup-date-input"]').should('have.value', futureDate);
    });

    it('should allow entering follow-up notes', () => {
      cy.get('[data-testid="prescription-followup-checkbox"]').click();
      const notes = 'Review blood pressure and adjust medication if needed';
      cy.get('[data-testid="prescription-followup-notes-input"]').type(notes);
      cy.get('[data-testid="prescription-followup-notes-input"]').should('have.value', notes);
    });

    it('should set minimum date for follow-up to today', () => {
      cy.get('[data-testid="prescription-followup-checkbox"]').click();
      const today = new Date().toISOString().split('T')[0];
      cy.get('[data-testid="prescription-followup-date-input"]').should('have.attr', 'min', today);
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      // Fill required fields
      cy.get('[data-testid="prescription-diagnosis-input"]').type('Common Cold');
      cy.get('[data-testid="prescription-medication-0-input"]').type('Paracetamol');
      cy.get('[data-testid="prescription-dosage-0-input"]').type('500mg');
      cy.get('[data-testid="prescription-instructions-0-input"]').type('Take twice daily');
    });

    it('should display save and cancel buttons', () => {
      cy.get('[data-testid="prescription-save-btn"]').should('be.visible');
      cy.get('[data-testid="prescription-cancel-btn"]').should('be.visible');
    });

    it('should submit prescription successfully', () => {
      cy.intercept('POST', '**/api/prescriptions', {
        statusCode: 200,
        body: { success: true, message: 'Prescription saved successfully' }
      }).as('savePrescription');
      
      cy.get('[data-testid="prescription-save-btn"]').click();
      cy.wait('@savePrescription');
    });

    it('should disable save button while saving', () => {
      cy.intercept('POST', '**/api/prescriptions', (req) => {
        req.reply((res) => {
          res.delay = 1000;
        });
      }).as('savePrescription');
      
      cy.get('[data-testid="prescription-save-btn"]').click();
      cy.get('[data-testid="prescription-save-btn"]').should('be.disabled');
      cy.contains('Saving...').should('be.visible');
    });

    it('should show validation error when diagnosis is missing', () => {
      cy.get('[data-testid="prescription-diagnosis-input"]').clear();
      cy.get('[data-testid="prescription-save-btn"]').click();
      // Alert will be shown
      cy.on('window:alert', (text) => {
        expect(text).to.contains('Please enter a diagnosis');
      });
    });

    it('should validate medication fields when medication name is entered', () => {
      cy.get('[data-testid="prescription-dosage-0-input"]').clear();
      cy.get('[data-testid="prescription-save-btn"]').click();
      cy.on('window:alert', (text) => {
        expect(text).to.contains('Please complete dosage and instructions');
      });
    });

    it('should submit with follow-up information', () => {
      cy.get('[data-testid="prescription-followup-checkbox"]').click();
      cy.get('[data-testid="prescription-followup-date-input"]').type('2025-12-15');
      cy.get('[data-testid="prescription-followup-notes-input"]').type('Review progress');
      
      cy.intercept('POST', '**/api/prescriptions', {
        statusCode: 200,
        body: { success: true }
      }).as('savePrescription');
      
      cy.get('[data-testid="prescription-save-btn"]').click();
      cy.wait('@savePrescription').its('request.body').should('include', {
        followUpRequired: true
      });
    });

    it('should submit with multiple medications', () => {
      cy.get('[data-testid="prescription-add-medication-btn"]').click();
      cy.get('[data-testid="prescription-medication-1-input"]').type('Amoxicillin');
      cy.get('[data-testid="prescription-dosage-1-input"]').type('250mg');
      cy.get('[data-testid="prescription-instructions-1-input"]').type('Take three times daily');
      
      cy.intercept('POST', '**/api/prescriptions', {
        statusCode: 200,
        body: { success: true }
      }).as('savePrescription');
      
      cy.get('[data-testid="prescription-save-btn"]').click();
      cy.wait('@savePrescription').its('request.body.prescription').should('have.length', 2);
    });
  });

  describe('Cancel Action', () => {
    it('should navigate back to dashboard on cancel', () => {
      cy.get('[data-testid="prescription-cancel-btn"]').click();
      cy.url().should('include', '/doctor/dashboard');
    });
  });

  describe('Navigation', () => {
    it('should have back to dashboard button in header', () => {
      cy.contains('Back to Dashboard').should('be.visible');
    });

    it('should display IntelliConsult branding', () => {
      cy.contains('IntelliConsult').should('be.visible');
    });
  });

  describe('Loading Existing Prescription', () => {
    it('should load existing prescription data', () => {
      const existingPrescription = {
        success: true,
        medicalRecord: {
          diagnosis: 'Hypertension',
          notes: 'Patient responding well to treatment',
          prescription: [
            {
              medication: 'Lisinopril',
              dosage: '10mg',
              instructions: 'Take once daily',
              duration: '30 days'
            }
          ],
          followUpRequired: true,
          followUpDate: '2025-12-20',
          followUpNotes: 'Check blood pressure'
        }
      };
      
      cy.intercept('GET', `**/api/prescriptions/appointment/${mockAppointmentId}`, {
        statusCode: 200,
        body: existingPrescription
      }).as('getExistingPrescription');
      
      cy.reload();
      cy.wait('@getExistingPrescription');
      
      cy.get('[data-testid="prescription-diagnosis-input"]').should('have.value', 'Hypertension');
      cy.get('[data-testid="prescription-medication-0-input"]').should('have.value', 'Lisinopril');
      cy.get('[data-testid="prescription-dosage-0-input"]').should('have.value', '10mg');
      cy.get('[data-testid="prescription-followup-checkbox"]')
        .should('have.attr', 'aria-checked', 'true');
    });
  });

  describe('Error Handling', () => {
    it('should handle appointment not found error', () => {
      cy.intercept('GET', '**/api/appointments/doctor', {
        statusCode: 200,
        body: []
      }).as('getNoAppointments');
      
      cy.reload();
      cy.wait('@getNoAppointments');
      cy.contains('Appointment not found').should('be.visible');
    });

    it('should handle save error', () => {
      cy.get('[data-testid="prescription-diagnosis-input"]').type('Test Diagnosis');
      cy.get('[data-testid="prescription-medication-0-input"]').type('Test Med');
      cy.get('[data-testid="prescription-dosage-0-input"]').type('100mg');
      cy.get('[data-testid="prescription-instructions-0-input"]').type('Test instructions');
      
      cy.intercept('POST', '**/api/prescriptions', {
        statusCode: 500,
        body: { message: 'Server error' }
      }).as('saveError');
      
      cy.get('[data-testid="prescription-save-btn"]').click();
      cy.wait('@saveError');
      
      cy.on('window:alert', (text) => {
        expect(text).to.contains('Server error');
      });
      
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile', () => {
      cy.viewport('iphone-x');
      cy.get('[data-testid="prescription-diagnosis-input"]').should('be.visible');
      cy.get('[data-testid="prescription-save-btn"]').should('be.visible');
    });

    it('should be responsive on tablet', () => {
      cy.viewport('ipad-2');
      cy.get('[data-testid="prescription-medication-0-input"]').should('be.visible');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', () => {
      cy.contains('Diagnosis *').should('exist');
      cy.contains('Medication Name *').should('exist');
      cy.contains('Dosage *').should('exist');
    });
  });
});
