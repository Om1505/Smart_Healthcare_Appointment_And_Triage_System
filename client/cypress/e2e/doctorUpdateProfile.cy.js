describe('Doctor Update Profile Page Tests', () => {
  const mockDoctor = {
    _id: 'doc123',
    fullName: 'Dr. Jane Smith',
    email: 'jane.smith@example.com',
    userType: 'doctor',
    specialization: 'Cardiology',
    experience: 10,
    licenseNumber: 'MED123456',
    address: '123 Medical Center, Health City',
    consultationFee: 1000,
    bio: 'Experienced cardiologist with 10 years of practice',
    phoneNumber: '+91 9876543210',
    isVerified: true
  };

  beforeEach(() => {
    // Mock authentication
    localStorage.setItem('token', 'mock-jwt-token');

    // Mock API calls
    cy.intercept('GET', '**/api/users/profile', {
      statusCode: 200,
      body: mockDoctor
    }).as('getProfile');

    cy.visit('/doctor/update-profile');
    cy.wait('@getProfile', { timeout: 10000 });
  });

  describe('Page Load and UI Elements', () => {
    it('should load the update profile page successfully', () => {
      cy.url().should('include', '/doctor/update-profile');
    });

    it('should display page title and description', () => {
      cy.contains('Update Profile').should('be.visible');
      cy.contains('Update your professional information').should('be.visible');
    });

    it('should display all form sections', () => {
      cy.contains('Personal Information').should('be.visible');
      cy.contains('Professional Information').should('be.visible');
    });

    it('should display save and cancel buttons', () => {
      cy.get('[data-testid="doctor-update-save-btn"]').should('be.visible');
      cy.get('[data-testid="doctor-update-cancel-btn"]').should('be.visible');
    });
  });

  describe('Form Pre-population', () => {
    it('should pre-fill all personal information fields', () => {
      cy.get('[data-testid="doctor-update-fullname-input"]').should('have.value', 'Dr. Jane Smith');
      cy.get('[data-testid="doctor-update-email-input"]').should('have.value', 'jane.smith@example.com');
      cy.get('[data-testid="doctor-update-phone-input"]').should('have.value', '+91 9876543210');
      cy.get('[data-testid="doctor-update-license-input"]').should('have.value', 'MED123456');
      cy.get('[data-testid="doctor-update-address-input"]').should('have.value', '123 Medical Center, Health City');
    });

    it('should pre-fill all professional information fields', () => {
      cy.get('[data-testid="doctor-update-specialization-select"]').should('contain', 'Cardiology');
      cy.get('[data-testid="doctor-update-experience-input"]').should('have.value', '10');
      cy.get('[data-testid="doctor-update-fee-input"]').should('have.value', '1000');
      cy.get('[data-testid="doctor-update-bio-input"]').should('have.value', 'Experienced cardiologist with 10 years of practice');
    });
  });

  describe('Personal Information Section', () => {
    it('should allow updating full name', () => {
      cy.get('[data-testid="doctor-update-fullname-input"]').clear().type('Dr. Jane M. Smith');
      cy.get('[data-testid="doctor-update-fullname-input"]').should('have.value', 'Dr. Jane M. Smith');
    });

    it('should allow updating email', () => {
      cy.get('[data-testid="doctor-update-email-input"]').clear().type('jane.m.smith@example.com');
      cy.get('[data-testid="doctor-update-email-input"]').should('have.value', 'jane.m.smith@example.com');
    });

    it('should allow updating phone number', () => {
      cy.get('[data-testid="doctor-update-phone-input"]').clear().type('+91 9999999999');
      cy.get('[data-testid="doctor-update-phone-input"]').should('have.value', '+91 9999999999');
    });

    it('should allow updating license number', () => {
      cy.get('[data-testid="doctor-update-license-input"]').clear().type('MED654321');
      cy.get('[data-testid="doctor-update-license-input"]').should('have.value', 'MED654321');
    });

    it('should allow updating address', () => {
      const newAddress = '456 New Medical Center, Wellness City';
      cy.get('[data-testid="doctor-update-address-input"]').clear().type(newAddress);
      cy.get('[data-testid="doctor-update-address-input"]').should('have.value', newAddress);
    });
  });

  describe('Professional Information Section', () => {
    it('should allow changing specialization', () => {
      cy.get('[data-testid="doctor-update-specialization-select"]').click();
      cy.contains('[role="option"]', 'Neurology').click();
      cy.get('[data-testid="doctor-update-specialization-select"]').should('contain', 'Neurology');
    });

    it('should display all specialization options', () => {
      cy.get('[data-testid="doctor-update-specialization-select"]').click();
      const specializations = ['Cardiology', 'Dermatology', 'Neurology', 'Pediatrics', 'Orthopedics'];
      specializations.forEach(spec => {
        cy.contains('[role="option"]', spec).should('be.visible');
      });
      cy.get('body').type('{esc}'); // Close dropdown
    });

    it('should allow updating years of experience', () => {
      cy.get('[data-testid="doctor-update-experience-input"]').clear().type('15');
      cy.get('[data-testid="doctor-update-experience-input"]').should('have.value', '15');
    });

    it('should validate experience as number', () => {
      cy.get('[data-testid="doctor-update-experience-input"]').clear().type('abc');
      cy.get('[data-testid="doctor-update-experience-input"]').should('have.value', '');
    });

    it('should allow updating consultation fee', () => {
      cy.get('[data-testid="doctor-update-fee-input"]').clear().type('1500');
      cy.get('[data-testid="doctor-update-fee-input"]').should('have.value', '1500');
    });

    it('should validate consultation fee as number', () => {
      cy.get('[data-testid="doctor-update-fee-input"]').clear().type('abc');
      cy.get('[data-testid="doctor-update-fee-input"]').should('have.value', '');
    });

    it('should allow updating bio', () => {
      const newBio = 'Updated bio with more experience and expertise in cardiology';
      cy.get('[data-testid="doctor-update-bio-input"]').clear().type(newBio);
      cy.get('[data-testid="doctor-update-bio-input"]').should('have.value', newBio);
    });
  });

  describe('Form Validation', () => {
    it('should require full name', () => {
      cy.get('[data-testid="doctor-update-fullname-input"]').clear();
      cy.get('[data-testid="doctor-update-save-btn"]').click();
      cy.get('[data-testid="doctor-update-fullname-input"]').then($input => {
        expect($input[0].validationMessage).to.not.be.empty;
      });
    });

    it('should require email', () => {
      cy.get('[data-testid="doctor-update-email-input"]').clear();
      cy.get('[data-testid="doctor-update-save-btn"]').click();
      cy.get('[data-testid="doctor-update-email-input"]').then($input => {
        expect($input[0].validationMessage).to.not.be.empty;
      });
    });

    it('should validate email format', () => {
      cy.get('[data-testid="doctor-update-email-input"]').clear().type('invalid-email');
      cy.get('[data-testid="doctor-update-save-btn"]').click();
      cy.get('[data-testid="doctor-update-email-input"]').then($input => {
        expect($input[0].validationMessage).to.include('email');
      });
    });

    it('should require license number', () => {
      cy.get('[data-testid="doctor-update-license-input"]').clear();
      cy.get('[data-testid="doctor-update-save-btn"]').click();
      cy.get('[data-testid="doctor-update-license-input"]').then($input => {
        expect($input[0].validationMessage).to.not.be.empty;
      });
    });

    it('should require experience', () => {
      cy.get('[data-testid="doctor-update-experience-input"]').clear();
      cy.get('[data-testid="doctor-update-save-btn"]').click();
      cy.get('[data-testid="doctor-update-experience-input"]').then($input => {
        expect($input[0].validationMessage).to.not.be.empty;
      });
    });

    it('should require consultation fee', () => {
      cy.get('[data-testid="doctor-update-fee-input"]').clear();
      cy.get('[data-testid="doctor-update-save-btn"]').click();
      cy.get('[data-testid="doctor-update-fee-input"]').then($input => {
        expect($input[0].validationMessage).to.not.be.empty;
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit updated profile successfully', () => {
      cy.intercept('PUT', '**/api/users/update-profile', {
        statusCode: 200,
        body: { ...mockDoctor, fullName: 'Dr. Jane Updated Smith' }
      }).as('updateProfile');

      cy.get('[data-testid="doctor-update-fullname-input"]').clear().type('Dr. Jane Updated Smith');
      cy.get('[data-testid="doctor-update-save-btn"]').click();

      cy.wait('@updateProfile');
      cy.on('window:alert', (text) => {
        expect(text).to.contains('Profile updated successfully');
      });
    });

    it('should disable save button while saving', () => {
      cy.intercept('PUT', '**/api/users/update-profile', {
        delay: 1000,
        statusCode: 200,
        body: mockDoctor
      }).as('slowUpdate');
      cy.get('[data-testid="doctor-update-save-btn"]').click();
      cy.get('[data-testid="doctor-update-save-btn"]').should('be.disabled');
      cy.contains('Saving...').should('be.visible');
      cy.wait('@slowUpdate');
    });

    it('should show loading spinner while saving', () => {
      cy.intercept('PUT', '**/api/users/update-profile', (req) => {
        req.reply((res) => {
          res.delay = 1000;
        });
      }).as('slowUpdate');

      cy.get('[data-testid="doctor-update-save-btn"]').click();
      cy.get('.animate-spin').should('be.visible');
    });

    it('should navigate to dashboard after successful update', () => {
      cy.intercept('PUT', '**/api/users/update-profile', {
        statusCode: 200,
        body: mockDoctor
      }).as('updateProfile');

      cy.get('[data-testid="doctor-update-save-btn"]').click();
      cy.wait('@updateProfile');
      
      cy.on('window:alert', () => true);
      cy.url().should('include', '/doctor/dashboard');
    });
  });

  describe('Error Handling', () => {
    it('should display error message on update failure', () => {
      cy.intercept('PUT', '**/api/users/update-profile', {
        statusCode: 500,
        body: { message: 'Failed to update profile' }
      }).as('updateError');

      cy.get('[data-testid="doctor-update-save-btn"]').click();
      cy.wait('@updateError');
      cy.contains('Failed to update profile').should('be.visible');
    });

    it('should handle unauthorized access', () => {
      cy.intercept('GET', '**/api/users/profile', {
        statusCode: 401,
        body: { message: 'Unauthorized' }
      }).as('unauthorized');

      cy.reload();
      cy.wait('@unauthorized');
      cy.url().should('include', '/login');
    });

    it('should handle non-doctor user type', () => {
      const patientUser = { ...mockDoctor, userType: 'patient' };
      cy.intercept('GET', '**/api/users/profile', {
        statusCode: 200,
        body: patientUser
      }).as('patientProfile');

      cy.reload();
      cy.wait('@patientProfile');
      cy.contains('Access denied. Not a doctor account').should('be.visible');
    });
  });

  describe('Navigation', () => {
    it('should navigate to dashboard on cancel', () => {
      cy.get('[data-testid="doctor-update-cancel-btn"]').click();
      cy.url().should('include', '/doctor/dashboard');
    });

    it('should navigate to dashboard via nav button', () => {
      cy.contains('Dashboard').click();
      cy.url().should('include', '/doctor/dashboard');
    });

    it('should have logout functionality', () => {
      cy.contains('Logout').click();
      cy.url().should('include', '/login');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('token')).to.be.null;
      });
    });
  });
 
  describe('Loading State', () => {
    it('should show loading spinner while fetching profile', () => {
      cy.intercept('GET', '**/api/users/profile', (req) => {
        req.reply((res) => {
          res.delay = 1000;
          res.send({ statusCode: 200, body: mockDoctor });
        });
      }).as('slowProfile');

      cy.reload();
      cy.get('.animate-spin').should('be.visible');
      cy.wait('@slowProfile');
      cy.contains('Update Profile').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile', () => {
      cy.viewport('iphone-x');
      cy.contains('Update Profile').should('be.visible');
      cy.get('[data-testid="doctor-update-fullname-input"]').should('be.visible');
    });

    it('should be responsive on tablet', () => {
      cy.viewport('ipad-2');
      cy.get('[data-testid="doctor-update-save-btn"]').should('be.visible');
    });
  });

  describe('Accessibility', () => {
    it('should support keyboard navigation', () => {
      cy.get('[data-testid="doctor-update-fullname-input"]').focus().should('have.focus');
      cy.get('[data-testid="doctor-update-fullname-input"]').tab();
      cy.get('[data-testid="doctor-update-email-input"]').should('have.focus');
    });
  });

  describe('Complete Update Flow', () => {
    it('should update all fields and save successfully', () => {
      cy.intercept('PUT', '**/api/users/update-profile', {
        statusCode: 200,
        body: mockDoctor
      }).as('updateProfile');

      // Update personal information
      cy.get('[data-testid="doctor-update-fullname-input"]').clear().type('Dr. Jane Updated Smith');
      cy.get('[data-testid="doctor-update-phone-input"]').clear().type('+91 9999999999');
      cy.get('[data-testid="doctor-update-address-input"]').clear().type('456 New Medical Center');

      // Update professional information
      cy.get('[data-testid="doctor-update-specialization-select"]').click();
      cy.contains('[role="option"]', 'Neurology').click();
      cy.get('[data-testid="doctor-update-experience-input"]').clear().type('15');
      cy.get('[data-testid="doctor-update-fee-input"]').clear().type('1500');
      cy.get('[data-testid="doctor-update-bio-input"]').clear().type('Updated comprehensive bio');

      // Submit
      cy.get('[data-testid="doctor-update-save-btn"]').click();
      cy.wait('@updateProfile');

      cy.on('window:alert', (text) => {
        expect(text).to.contains('Profile updated successfully');
      });
    });
  });
});
