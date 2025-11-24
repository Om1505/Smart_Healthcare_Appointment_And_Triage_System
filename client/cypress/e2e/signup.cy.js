describe('Signup Page Tests', () => {
  beforeEach(() => {
    cy.visit('/signup');
  });

  describe('Page Load and UI Elements', () => {
    it('should load the signup page successfully', () => {
      cy.url().should('include', '/signup');
      cy.contains('Create an Account').should('be.visible');
      cy.contains('Get started with IntelliConsult').should('be.visible');
    });

    it('should display common form fields', () => {
      cy.get('[data-testid="signup-fullname-input"]').should('be.visible');
      cy.get('[data-testid="signup-email-input"]').should('be.visible');
      cy.get('[data-testid="signup-usertype-select"]').should('be.visible');
      cy.get('[data-testid="signup-password-input"]').should('be.visible');
      cy.get('[data-testid="signup-confirm-password-input"]').should('be.visible');
      cy.get('[data-testid="signup-submit-btn"]').should('be.visible');
    });

    it('should display navigation link to login', () => {
      cy.get('[data-testid="login-link"]').should('be.visible');
      cy.contains('Already have an account?').should('be.visible');
    });
  });

  describe('Patient Signup Flow', () => {
    it('should complete patient signup form', () => {
      cy.get('[data-testid="signup-fullname-input"]').type('John Doe');
      cy.get('[data-testid="signup-email-input"]').type('john.doe@example.com');
      
      cy.get('[data-testid="signup-usertype-select"]').click();
      cy.contains('[role="option"]', 'Patient').click();
      
      cy.get('[data-testid="signup-password-input"]').type('SecurePass123!');
      cy.get('[data-testid="signup-confirm-password-input"]').type('SecurePass123!');
      
      cy.get('[data-testid="signup-submit-btn"]').should('not.be.disabled');
    });

    it('should not show doctor-specific fields for patient', () => {
      cy.get('[data-testid="signup-usertype-select"]').click();
      cy.contains('[role="option"]', 'Patient').click();
      
      cy.get('[data-testid="signup-specialization-select"]').should('not.exist');
      cy.get('[data-testid="signup-experience-input"]').should('not.exist');
      cy.get('[data-testid="signup-license-input"]').should('not.exist');
    });
  });

  describe('Doctor Signup Flow', () => {
    beforeEach(() => {
      cy.get('[data-testid="signup-fullname-input"]').type('Dr. Jane Smith');
      cy.get('[data-testid="signup-email-input"]').type('jane.smith@example.com');
      cy.get('[data-testid="signup-usertype-select"]').click();
      cy.contains('[role="option"]', 'Doctor').click();
    });

    it('should display doctor-specific fields', () => {
      cy.get('[data-testid="signup-specialization-select"]').should('be.visible');
      cy.get('[data-testid="signup-experience-input"]').should('be.visible');
      cy.get('[data-testid="signup-license-input"]').should('be.visible');
      cy.get('[data-testid="signup-address-input"]').should('be.visible');
      cy.get('[data-testid="signup-fee-input"]').should('be.visible');
      cy.get('[data-testid="signup-bio-input"]').should('be.visible');
    });

    it('should complete doctor signup form with all fields', () => {
      
      cy.get('[data-testid="signup-specialization-select"]').click({ force: true });
      cy.contains('[role="option"]', 'Cardiology').click({ force: true });
      cy.get('[data-testid="signup-experience-input"]').type('10');
      cy.get('[data-testid="signup-license-input"]').type('MED123456');
      cy.get('[data-testid="signup-address-input"]').type('123 Medical Center, Health City');
      cy.get('[data-testid="signup-fee-input"]').type('1000');
      cy.get('[data-testid="signup-bio-input"]').type('Experienced cardiologist with 10 years of practice');
      
      cy.get('[data-testid="signup-password-input"]').type('SecurePass123!');
      cy.get('[data-testid="signup-confirm-password-input"]').type('SecurePass123!');
      
      cy.get('[data-testid="signup-submit-btn"]').should('not.be.disabled');
    });

    it('should allow selecting different specializations', () => {
      const specializations = ['Cardiology', 'Dermatology', 'Pediatrics', 'Neurology', 'Orthopedics'];
      
      specializations.forEach(spec => {
        cy.get('[data-testid="signup-specialization-select"]').click();
        cy.contains(spec).should('be.visible');
        cy.get('body').type('{esc}'); // Close dropdown
      });
    });

    it('should validate experience as number', () => {
      cy.get('[data-testid="signup-experience-input"]').type('abc');
      cy.get('[data-testid="signup-experience-input"]').should('have.value', '');
      
      cy.get('[data-testid="signup-experience-input"]').type('15');
      cy.get('[data-testid="signup-experience-input"]').should('have.value', '15');
    });

    it('should validate consultation fee as number', () => {
      cy.get('[data-testid="signup-fee-input"]').type('abc');
      cy.get('[data-testid="signup-fee-input"]').should('have.value', '');
      
      cy.get('[data-testid="signup-fee-input"]').type('800');
      cy.get('[data-testid="signup-fee-input"]').should('have.value', '800');
    });
  });

  // describe('Admin Signup Flow', () => {
  //   it('should complete admin signup form', () => {
  //     cy.get('[data-testid="signup-fullname-input"]').type('Admin User');
  //     cy.get('[data-testid="signup-email-input"]').type('admin@example.com');
      
  //     cy.get('[data-testid="signup-usertype-select"]').click();
  //     cy.contains('[role="option"]', 'Admin').click();
      
  //     cy.get('[data-testid="signup-password-input"]').type('AdminPass123!');
  //     cy.get('[data-testid="signup-confirm-password-input"]').type('AdminPass123!');
      
  //     cy.get('[data-testid="signup-submit-btn"]').should('not.be.disabled');
  //   });

  //   it('should not show doctor-specific fields for admin', () => {
  //     cy.get('[data-testid="signup-usertype-select"]').click();
  //     cy.contains('[role="option"]', 'Admin').click();
      
  //     cy.get('[data-testid="signup-specialization-select"]').should('not.exist');
  //     cy.get('[data-testid="signup-experience-input"]').should('not.exist');
  //   });
  // });

  describe('Form Validation', () => {
    it('should validate email format', () => {
      cy.get('[data-testid="signup-email-input"]').type('invalid-email');
      cy.get('[data-testid="signup-fullname-input"]').click();
      
      cy.get('[data-testid="signup-email-input"]').then($input => {
        expect($input[0].validationMessage).to.not.be.empty;
      });
    });

    it('should validate password match', () => {
      cy.get('[data-testid="signup-fullname-input"]').type('Test User');
      cy.get('[data-testid="signup-email-input"]').type('test@example.com');
      cy.get('[data-testid="signup-usertype-select"]').click();
      cy.contains('[role="option"]', 'Patient').click();
      
      cy.get('[data-testid="signup-password-input"]').type('Password123!');
      cy.get('[data-testid="signup-confirm-password-input"]').type('DifferentPass123!');
      cy.get('[data-testid="signup-submit-btn"]').click();
      
      cy.contains('Passwords do not match').should('be.visible');
    });

    it('should require user type selection', () => {
      cy.get('[data-testid="signup-fullname-input"]').type('Test User');
      cy.get('[data-testid="signup-email-input"]').type('test@example.com');
      cy.get('[data-testid="signup-password-input"]').type('Password123!');
      cy.get('[data-testid="signup-confirm-password-input"]').type('Password123!');
      cy.get('[data-testid="signup-submit-btn"]').click();
      
      cy.contains('Please select a user role', { timeout: 5000 }).should('be.visible');
    });

    it('should validate full name length', () => {
         cy.get('[data-testid="signup-fullname-input"]').type('A');
                
         // Fill all other required fields so form reaches fullname validation
         cy.get('[data-testid="signup-email-input"]').type('test1@example.com');
         cy.get('[data-testid="signup-usertype-select"]').click();
         cy.contains('[role="option"]', 'Patient').click();
         cy.get('[data-testid="signup-password-input"]').type('Password123!');
         cy.get('[data-testid="signup-confirm-password-input"]').type('Password123!');
                
         cy.get('[data-testid="signup-submit-btn"]').click();
                
         // Assert the custom error message
         cy.contains('Name must be at least 2 characters').should('be.visible');
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', () => {
      cy.get('[data-testid="signup-password-input"]').type('mypassword');
      cy.get('[data-testid="signup-password-input"]').should('have.attr', 'type', 'password');
      
      cy.get('[data-testid="signup-toggle-password-btn"]').click();
      cy.get('[data-testid="signup-password-input"]').should('have.attr', 'type', 'text');
      
      cy.get('[data-testid="signup-toggle-password-btn"]').click();
      cy.get('[data-testid="signup-password-input"]').should('have.attr', 'type', 'password');
    });

    it('should toggle confirm password visibility', () => {
      cy.get('[data-testid="signup-confirm-password-input"]').type('mypassword');
      cy.get('[data-testid="signup-confirm-password-input"]').should('have.attr', 'type', 'password');
      
      cy.get('[data-testid="signup-toggle-confirm-password-btn"]').click();
      cy.get('[data-testid="signup-confirm-password-input"]').should('have.attr', 'type', 'text');
    });
  });

  describe('Navigation', () => {
    it('should navigate to login page', () => {
      cy.get('[data-testid="login-link"]').click();
      cy.url().should('include', '/login');
    });
  });

  describe('Button States', () => {
    it('should disable submit button while loading', () => {
      cy.get('[data-testid="signup-fullname-input"]').type('Test User');
      cy.get('[data-testid="signup-email-input"]').type('test@example.com');
      cy.get('[data-testid="signup-usertype-select"]').click();
      cy.contains('[role="option"]', 'Patient').click();
      cy.get('[data-testid="signup-password-input"]').type('Password123!');
      cy.get('[data-testid="signup-confirm-password-input"]').type('Password123!');
      
      cy.intercept('POST', '**/api/auth/signup', (req) => {
        req.reply((res) => {
          res.delay = 1000;
        });
      }).as('signupRequest');
      
      cy.get('[data-testid="signup-submit-btn"]').click();
      cy.get('[data-testid="signup-submit-btn"]').should('be.disabled');
      cy.get('[data-testid="signup-submit-btn"]').should('contain', 'Creating Account...');
    });
  });

  describe('Success Message', () => {
    it('should display success message after signup', () => {
      cy.intercept('POST', '**/api/auth/signup', {
        statusCode: 200,
        body: { message: 'Signup successful! Please check your email to verify your account.' }
      }).as('signupRequest');
      
      cy.get('[data-testid="signup-fullname-input"]').type('Test User');
      cy.get('[data-testid="signup-email-input"]').type('test@example.com');
      cy.get('[data-testid="signup-usertype-select"]').click();
      cy.contains('[role="option"]', 'Patient').click();
      cy.get('[data-testid="signup-password-input"]').type('Password123!');
      cy.get('[data-testid="signup-confirm-password-input"]').type('Password123!');
      cy.get('[data-testid="signup-submit-btn"]').click();
      
      cy.wait('@signupRequest');
      cy.contains('Signup successful').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile', () => {
      cy.viewport('iphone-x');
      cy.get('[data-testid="signup-fullname-input"]').should('be.visible');
      cy.get('[data-testid="signup-email-input"]').should('be.visible');
    });

    it('should be responsive on tablet', () => {
      cy.viewport('ipad-2');
      cy.get('[data-testid="signup-submit-btn"]').should('be.visible');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', () => {
      cy.get('label[for="fullName"]').should('exist');
      cy.get('label[for="email"]').should('exist');
      cy.get('label[for="password"]').should('exist');
    });

    it('should support keyboard navigation', () => {
      cy.get('[data-testid="signup-fullname-input"]').focus().should('have.focus');
      cy.get('[data-testid="signup-fullname-input"]').tab();
      cy.get('[data-testid="signup-email-input"]').should('have.focus');
    });
  });
});
