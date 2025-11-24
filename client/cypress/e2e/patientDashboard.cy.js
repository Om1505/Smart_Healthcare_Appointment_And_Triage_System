describe('Patient Dashboard Tests', () => {
  const mockPatient = {
    _id: '507f1f77bcf86cd799439012',
    fullName: 'John Doe',
    email: 'john@example.com',
    userType: 'patient'
  };

  const mockAppointments = [
    {
      _id: 'apt1',
      doctor: {
        _id: 'doc1',
        fullName: 'Dr. Sarah Johnson',
        specialization: 'Cardiology'
      },
      patientNameForVisit: 'John Doe',
      date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      time: '10:00 AM',
      status: 'upcoming',
      primaryReason: 'Regular checkup'
    },
    {
      _id: 'apt2',
      doctor: {
        _id: 'doc2',
        fullName: 'Dr. Michael Chen',
        specialization: 'Dermatology'
      },
      patientNameForVisit: 'John Doe',
      date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      time: '02:00 PM',
      status: 'completed',
      primaryReason: 'Skin consultation'
    }
  ];

  beforeEach(() => {
    // Mock authentication
    localStorage.setItem('token', 'mock-jwt-token');

    // Mock API calls
    cy.intercept('GET', '**/api/users/profile', {
      statusCode: 200,
      body: mockPatient
    }).as('getProfile');

    cy.intercept('GET', '**/api/appointments/my-appointments', {
      statusCode: 200,
      body: mockAppointments
    }).as('getAppointments');

    cy.visit('/patient/dashboard');
    cy.wait(['@getProfile', '@getAppointments']);
  });

  describe('Page Load and UI Elements', () => {
    it('should load the patient dashboard successfully', () => {
      cy.url().should('include', '/patient/dashboard');
    });

    it('should display welcome message with patient name', () => {
      cy.contains('Welcome back, John!').should('be.visible');
    });

    it('should display navigation bar', () => {
      cy.contains('IntelliConsult').should('be.visible');
      cy.contains('Find Doctors').should('be.visible');
      cy.contains('Logout').should('be.visible');
    });

    it('should display quick action cards', () => {
      cy.contains('Book Appointment').should('be.visible');
      cy.contains('Upcoming').should('be.visible');
      cy.contains('Past Visits').should('be.visible');
    });
  });

  describe('Appointments Display', () => {
    it('should display upcoming appointments', () => {
      cy.contains('Upcoming Appointments').should('be.visible');
      cy.contains('Dr. Sarah Johnson').should('be.visible');
      cy.contains('Cardiology').should('be.visible');
      cy.contains('10:00 AM').should('be.visible');
    });

    it('should display past appointments', () => {
      cy.contains('Recent Visits').should('be.visible');
      cy.contains('Dr. Michael Chen').should('be.visible');
      cy.contains('Dermatology').should('be.visible');
    });

    it('should show correct appointment counts', () => {
      cy.contains('1 appointments').should('be.visible'); // Upcoming
      cy.contains('1 completed').should('be.visible'); // Past
    });

    it('should display appointment status badges', () => {
      cy.contains('Upcoming').should('be.visible');
      cy.contains('Completed').should('be.visible');
    });
  });

  describe('Navigation Actions', () => {
    it('should navigate to find doctors page', () => {
      cy.contains('Find Doctors').click();
      cy.url().should('include', '/patient/doctors');
    });

    it('should navigate to book appointment from card', () => {
      cy.contains('Book Appointment').click();
      cy.url().should('include', '/patient/doctors');
    });

    it('should have join call button for upcoming appointments', () => {
      cy.contains('Join Call').should('be.visible');
    });

    it('should have view prescription button for completed appointments', () => {
      cy.contains('View Prescription').should('be.visible');
    });
  });

  describe('Cancel Appointment', () => {
    it('should show cancel button for upcoming appointments', () => {
      cy.contains('Cancel Appointment').should('be.visible');
    });

    it('should show confirmation dialog when canceling', () => {
      cy.intercept('PUT', '**/api/appointments/apt1/cancel', {
        statusCode: 200,
        body: { success: true }
      }).as('cancelAppointment');

      cy.on('window:confirm', () => true);
      cy.contains('Cancel Appointment').click();
    });

    it('should not cancel if user declines confirmation', () => {
      cy.on('window:confirm', () => false);
      cy.contains('Cancel Appointment').click();
      cy.contains('Upcoming').should('be.visible'); // Status unchanged
    });
  });

  describe('User Profile', () => {
it('should open profile modal when clicking avatar', () => {
  cy.contains('JD').click();       
  cy.contains('Profile').click();
});
it('should have logout option in dropdown', () => {
    cy.contains('JD').click();       
    cy.contains('Logout').should('be.visible');
    });
  });

  describe('Logout Functionality', () => {
    it('should logout and redirect to login page', () => {
      cy.contains('button', 'Logout').first().click();
      cy.url().should('include', '/login');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('token')).to.be.null;
      });
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no upcoming appointments', () => {
      cy.intercept('GET', '**/api/appointments/my-appointments', {
        statusCode: 200,
        body: []
      }).as('getEmptyAppointments');

      cy.reload();
      cy.wait('@getEmptyAppointments');

      cy.contains('No upcoming appointments').should('be.visible');
      cy.contains('Book Your First Appointment').should('be.visible');
    });
  });

  describe('Error Handling', () => {

    it('should display error message on appointments fetch failure', () => {
      cy.intercept('GET', '**/api/appointments/my-appointments', {
        statusCode: 500,
        body: { message: 'Server error' }
      }).as('getAppointmentsError');

      cy.reload();
      cy.wait('@getAppointmentsError');
      cy.contains('Failed to fetch data').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile', () => {
      cy.viewport('iphone-x');
      cy.contains('Welcome back, John!').should('be.visible');
      cy.contains('Book Appointment').should('be.visible');
    });

    it('should be responsive on tablet', () => {
      cy.viewport('ipad-2');
      cy.contains('Upcoming Appointments').should('be.visible');
    });
  });

  describe('Review Functionality', () => {
    it('should show leave review button for completed appointments', () => {
      cy.contains('Leave Review').should('be.visible');
    });

    it('should open review modal when clicking leave review', () => {
      cy.contains('Leave Review').click();
      // Modal should open (implementation depends on your modal component)
    });
  });
});
