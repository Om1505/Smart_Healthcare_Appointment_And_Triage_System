describe('Book Appointment Page Tests', () => {
  const mockDoctorId = '507f1f77bcf86cd799439011';
  
  beforeEach(() => {
    // Mock authentication
    localStorage.setItem('token', 'mock-jwt-token');
    
    // Mock doctor data
    cy.intercept('GET', `**/api/doctors/${mockDoctorId}`, {
      statusCode: 200,
      body: {
        _id: mockDoctorId,
        fullName: 'Dr. Sarah Johnson',
        specialization: 'Cardiology',
        consultationFee: 1000,
        experience: 15
      }
    }).as('getDoctor');
    
    // Mock user profile
    cy.intercept('GET', '**/api/users/profile', {
      statusCode: 200,
      body: {
        fullName: 'John Doe',
        email: 'john@example.com'
      }
    }).as('getProfile');
    
    // Mock available slots
    cy.intercept('GET', `**/api/appointments/available-slots/${mockDoctorId}`, {
      statusCode: 200,
      body: [
        { date: '2025-12-01', time: '10:00 AM' },
        { date: '2025-12-01', time: '11:00 AM' },
        { date: '2025-12-02', time: '02:00 PM' },
        { date: '2025-12-03', time: '09:00 AM' }
      ]
    }).as('getSlots');
    
    cy.visit(`/patient/book/${mockDoctorId}`);
    cy.wait(['@getDoctor', '@getProfile'], { timeout: 10000 });
    cy.wait('@getSlots', { timeout: 10000 });
  });

  describe('Page Load and Doctor Information', () => {
    it('should load the appointment booking page successfully', () => {
      cy.url().should('include', `/patient/book/${mockDoctorId}`);
    });

    it('should display doctor information', () => {
      cy.contains('Dr. Sarah Johnson').should('be.visible');
      cy.contains('Cardiology').should('be.visible');
      cy.contains('₹1000').should('be.visible');
    });

    it('should display progress steps', () => {
      cy.contains('1').should('be.visible');
      cy.contains('2').should('be.visible');
      cy.contains('3').should('be.visible');
    });
  });

  describe('Step 1: Time Slot Selection', () => {
    it('should display available time slots', () => {
      cy.contains('Select Appointment Time').should('be.visible');
      cy.contains('10:00 AM').should('be.visible');
      cy.contains('11:00 AM').should('be.visible');
      cy.contains('02:00 PM').should('be.visible');
    });

    it('should select a time slot', () => {
      cy.contains('10:00 AM')
        .closest('[data-testid="time-slot"]')
        .click();
      
      cy.contains('10:00 AM')
        .closest('[data-testid="time-slot"]')
        .should('have.class', 'bg-teal-600');
      
    });

    it('should disable next button when no slot selected', () => {
      cy.get('[data-testid="appointment-next-step-1-btn"]').should('be.disabled');
    });

    it('should enable next button when slot is selected', () => {
      cy.contains('10:00 AM')
        .closest('[data-testid="time-slot"]')
        .click();
      cy.get('[data-testid="appointment-next-step-1-btn"]').should('not.be.disabled');
    });

    it('should proceed to step 2 when next is clicked', () => {
      cy.contains('10:00 AM').closest('[data-testid="time-slot"]').click();

      cy.get('[data-testid="appointment-next-step-1-btn"]').click();
      cy.contains('Appointment Details').should('be.visible');
    });

    it('should display message when no slots available', () => {
      cy.intercept('GET', `**/api/appointments/available-slots/${mockDoctorId}`, {
        statusCode: 200,
        body: []
      }).as('getEmptySlots');
      
      cy.reload();
      cy.wait('@getEmptySlots');
      cy.contains('No available slots found').should('be.visible');
    });
  });

  describe('Step 2: Patient Details Form', () => {
    beforeEach(() => {
      cy.contains('10:00 AM').closest('[data-testid="time-slot"]').click();
      cy.get('[data-testid="appointment-next-step-1-btn"]').click();
    });

    it('should display patient information fields', () => {
      cy.get('[data-testid="appointment-patient-name-input"]').should('be.visible');
      cy.get('[data-testid="appointment-phone-input"]').should('be.visible');
      cy.get('[data-testid="appointment-email-input"]').should('be.visible');
      cy.get('[data-testid="appointment-birthdate-input"]').should('be.visible');
      cy.get('[data-testid="appointment-sex-select"]').should('be.visible');
      cy.get('[data-testid="appointment-language-input"]').should('be.visible');
    });

    it('should pre-fill patient name and email from profile', () => {
      cy.get('[data-testid="appointment-patient-name-input"]').should('have.value', 'John Doe');
      cy.get('[data-testid="appointment-email-input"]').should('have.value', 'john@example.com');
    });

    it('should validate phone number length', () => {
      cy.get('[data-testid="appointment-phone-input"]').type('123');
      cy.contains('Phone number must be 10 digits').should('be.visible');
      
      cy.get('[data-testid="appointment-phone-input"]').clear().type('9876543210');
      cy.contains('Phone number must be 10 digits').should('not.exist');
    });

    it('should not allow phone number longer than 10 digits', () => {
      cy.get('[data-testid="appointment-phone-input"]').type('12345678901234');
      cy.get('[data-testid="appointment-phone-input"]').should('have.value', '1234567890');
    });

    it('should validate birthdate is not in future', () => {
      const futureDate = '2030-01-01';
      cy.get('[data-testid="appointment-birthdate-input"]').type(futureDate);
      cy.contains('Date of birth cannot be in the future').should('be.visible');
    });

    it('should display emergency disclaimer', () => {
      cy.contains('Medical Emergency Disclaimer').should('be.visible');
      cy.get('[data-testid="appointment-emergency-disclaimer-checkbox"]').should('be.visible');
    });

    it('should require emergency disclaimer acknowledgment', () => {
      cy.get('[data-testid="appointment-emergency-disclaimer-checkbox"]').should('not.be.checked');
      cy.get('[data-testid="appointment-emergency-disclaimer-checkbox"]').click();
      cy.get('[data-testid="appointment-emergency-disclaimer-checkbox"]')
        .should('have.attr', 'data-state', 'checked');
      ;
    });

    it('should display medical details section', () => {
      cy.contains('Medical Details').should('be.visible');
      cy.get('[data-testid="appointment-primary-reason-input"]').should('be.visible');
    });

    it('should allow entering primary reason for visit', () => {
      const reason = 'Annual checkup and blood pressure monitoring';
      cy.get('[data-testid="appointment-primary-reason-input"]').type(reason);
      cy.get('[data-testid="appointment-primary-reason-input"]').should('have.value', reason);
    });

    it('should display common symptoms checkboxes', () => {
      cy.contains('What symptoms are you experiencing?').should('be.visible');
      cy.contains('Fever').should('be.visible');
      cy.contains('Cough').should('be.visible');
      cy.contains('Headache').should('be.visible');
    });

    it('should allow selecting multiple symptoms', () => {
      cy.contains('Fever').parent().find('button').click();
      cy.contains('Cough').parent().find('button').click();
      cy.contains('Fever').parent().find('button').should('have.attr', 'data-state', 'checked');
      cy.contains('Cough').parent().find('button').should('have.attr', 'data-state', 'checked');
    });

    it('should display severe symptoms checklist', () => {
      cy.contains('Have you experienced any of the following severe symptoms').should('be.visible');
      cy.contains('Severe chest pain').should('be.visible');
      cy.contains('None of the above').should('be.visible');
    });

    it('should require AI consent checkbox', () => {
      cy.get('[data-testid="appointment-consent-checkbox"]').should('be.visible');
      cy.contains('Consent to AI Processing').should('be.visible');
    });

    it('should check AI consent', () => {
      cy.get('[data-testid="appointment-consent-checkbox"]').click();
      cy.get('[data-testid="appointment-consent-checkbox"]')
        .should('have.attr', 'data-state', 'checked');
      
    });

    it('should disable next button when form is incomplete', () => {
      cy.get('[data-testid="appointment-next-step-2-btn"]').should('be.disabled');
    });

    it('should complete full form and enable next button', () => {
      // Fill patient info
      cy.get('[data-testid="appointment-phone-input"]').type('9876543210');
      cy.get('[data-testid="appointment-birthdate-input"]').type('1990-01-01');
      cy.get('[data-testid="appointment-sex-select"]').click();
      cy.contains('[role="option"]', 'Male').click();
      cy.get('[data-testid="appointment-language-input"]').type('English');
      
      // Fill medical details
      cy.get('[data-testid="appointment-primary-reason-input"]').type('Regular checkup');
      
      // Select symptoms begin timeframe
      cy.contains('Less than 24 hours ago').parent().find('button').click();
      
      // Check severe symptoms
      cy.contains('None of the above').parent().find('button').click();
      
      // Check disclaimers
      cy.get('[data-testid="appointment-emergency-disclaimer-checkbox"]').click();
      cy.get('[data-testid="appointment-consent-checkbox"]').click();
      
      cy.get('[data-testid="appointment-next-step-2-btn"]').should('not.be.disabled');
    });

    it('should navigate back to step 1', () => {
      cy.get('[data-testid="appointment-back-to-step-1-btn"]').click();
      cy.contains('Select Appointment Time').should('be.visible');
    });
  });

  describe('Step 3: Confirmation and Booking', () => {
    beforeEach(() => {
      // Navigate to step 2
      cy.contains('10:00 AM').closest('[data-testid="time-slot"]').click();
      cy.get('[data-testid="appointment-next-step-1-btn"]').click();
      
      // Fill required fields
      cy.get('[data-testid="appointment-phone-input"]').type('9876543210');
      cy.get('[data-testid="appointment-birthdate-input"]').type('1990-01-01');
      cy.get('[data-testid="appointment-sex-select"]').click();
      cy.contains('[role="option"]', 'Male').click();
      cy.get('[data-testid="appointment-language-input"]').type('English');
      cy.get('[data-testid="appointment-primary-reason-input"]').type('Regular checkup');
      cy.contains('Less than 24 hours ago').parent().find('button').click();
      cy.contains('None of the above').parent().find('button').click();
      cy.get('[data-testid="appointment-emergency-disclaimer-checkbox"]').click();
      cy.get('[data-testid="appointment-consent-checkbox"]').click();
      
      // Navigate to step 3
      cy.get('[data-testid="appointment-next-step-2-btn"]').click();
    });

    it('should display booking summary', () => {
      cy.contains('Confirm Your Appointment').should('be.visible');
      cy.contains('Booking Summary').should('be.visible');
      cy.contains('Dr. Sarah Johnson').should('be.visible');
      cy.contains('John Doe').should('be.visible');
      cy.contains('Regular checkup').should('be.visible');
    });

    it('should display booking buttons', () => {
      cy.get('[data-testid="appointment-confirm-book-btn"]').should('be.visible');
      cy.get('[data-testid="appointment-pay-book-btn"]').should('be.visible');
    });

    it('should navigate back to step 2', () => {
      cy.get('[data-testid="appointment-back-to-step-2-btn"]').click();
      cy.contains('Appointment Details').should('be.visible');
    });

    it('should handle confirm and book action', () => {
      cy.intercept('POST', '**/api/appointments/book', {
        statusCode: 200,
        body: { success: true, message: 'Appointment booked successfully' }
      }).as('bookAppointment');
      
      cy.get('[data-testid="appointment-confirm-book-btn"]').click();
      cy.wait('@bookAppointment');
    });

    it('should disable buttons while booking', () => {
      cy.intercept('POST', '**/api/appointments/book', (req) => {
        req.reply((res) => {
          res.delay = 1000;
        });
      }).as('bookAppointment');
      
      cy.get('[data-testid="appointment-confirm-book-btn"]').click();
      cy.get('[data-testid="appointment-confirm-book-btn"]').should('be.disabled');
      cy.contains('Booking...').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile', () => {
      cy.viewport('iphone-x');
      cy.contains('Dr. Sarah Johnson').should('be.visible');
      cy.contains('10:00 AM').should('be.visible');
    });

    it('should be responsive on tablet', () => {
      cy.viewport('ipad-2');
      cy.get('[data-testid="appointment-next-step-1-btn"]').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should handle doctor fetch error', () => {
      cy.intercept('GET', `**/api/doctors/${mockDoctorId}`, {
        statusCode: 404,
        body: { message: 'Doctor not found' }
      }).as('getDoctorError');
      
      cy.reload();
      cy.wait('@getDoctorError');
      cy.contains('Failed to fetch page details').should('be.visible');
    });

    it('should handle slots fetch error gracefully', () => {
      cy.intercept('GET', `**/api/appointments/available-slots/${mockDoctorId}`, {
        statusCode: 500,
        body: { message: 'Server error' }
      }).as('getSlotsError');
      
      cy.reload();
      cy.wait('@getSlotsError');
    });
  });

  describe('Navigation', () => {
    it('should have dashboard link in navigation', () => {
      cy.contains('Dashboard').should('be.visible');
    });

    it('should display IntelliConsult branding', () => {
      cy.contains('IntelliConsult').should('be.visible');
    });
  });
});
