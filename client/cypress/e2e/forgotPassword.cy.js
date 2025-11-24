describe('Forgot Password Page Tests', () => {
  beforeEach(() => {
    cy.visit('/forgot-password');
  });

  describe('Page Load and UI Elements', () => {
    it('should load the forgot password page successfully', () => {
      cy.url().should('include', '/forgot-password');
    });

    it('should display page title and description', () => {
      cy.contains('Forgot Password').should('be.visible');
      cy.contains('Enter your email to reset your password').should('be.visible');
    });

    it('should display IntelliConsult branding', () => {
      cy.contains('IntelliConsult').should('be.visible');
    });

    it('should display all form elements', () => {
      cy.get('[data-testid="forgot-password-usertype-select"]').should('be.visible');
      cy.get('[data-testid="forgot-password-email-input"]').should('be.visible');
      cy.get('[data-testid="forgot-password-submit-btn"]').should('be.visible');
    });

    it('should display link to login page', () => {
      cy.get('[data-testid="forgot-password-login-link"]').should('be.visible');
      cy.contains('Remembered your password?').should('be.visible');
    });
  });

  describe('User Type Selection', () => {
    it('should allow selecting patient role', () => {
      cy.get('[data-testid="forgot-password-usertype-select"]').click();
      cy.contains('[role="option"]', 'Patient').should('be.visible').click();
      cy.get('[data-testid="forgot-password-usertype-select"]').should('contain', 'Patient');
    });

    it('should allow selecting doctor role', () => {
      cy.get('[data-testid="forgot-password-usertype-select"]').click();
      cy.contains('[role="option"]', 'Doctor').should('be.visible').click();
      cy.get('[data-testid="forgot-password-usertype-select"]').should('contain', 'Doctor');
    });

    it('should allow selecting admin role', () => {
      cy.get('[data-testid="forgot-password-usertype-select"]').click();
      cy.contains('[role="option"]', 'Admin').should('be.visible').click();
      cy.get('[data-testid="forgot-password-usertype-select"]').should('contain', 'Admin');
    });
  });

  describe('Form Validation', () => {
    it('should show error when submitting without user type', () => {
      cy.get('[data-testid="forgot-password-email-input"]').type('test@example.com');
      cy.get('[data-testid="forgot-password-submit-btn"]').click();
      cy.contains('Please enter your email and select your role').should('be.visible');
    });

    it('should show error when submitting without email', () => {
      cy.get('[data-testid="forgot-password-usertype-select"]').click();
      cy.contains('[role="option"]', 'Patient').click();
      cy.get('[data-testid="forgot-password-submit-btn"]').click();
      // HTML5 validation will prevent submission
      cy.get('[data-testid="forgot-password-email-input"]').then($input => {
        expect($input[0].validationMessage).to.not.be.empty;
      });
    });

    it('should validate email format', () => {
      cy.get('[data-testid="forgot-password-usertype-select"]').click();
      cy.contains('[role="option"]', 'Patient').click();
      cy.get('[data-testid="forgot-password-email-input"]').type('invalid-email');
      cy.get('[data-testid="forgot-password-submit-btn"]').click();
      cy.get('[data-testid="forgot-password-email-input"]').then($input => {
        expect($input[0].validationMessage).to.include('email');
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', () => {
      cy.intercept('POST', '**/api/auth/forgot-password', {
        statusCode: 200,
        body: { message: 'Password reset link sent to your email' }
      }).as('forgotPassword');

      cy.get('[data-testid="forgot-password-usertype-select"]').click();
      cy.contains('[role="option"]', 'Patient').click();
      cy.get('[data-testid="forgot-password-email-input"]').type('test@example.com');
      cy.get('[data-testid="forgot-password-submit-btn"]').click();

      cy.wait('@forgotPassword');
      cy.contains('Password reset link sent to your email').should('be.visible');
    });

    it('should show error for non-existent email', () => {
      cy.intercept('POST', '**/api/auth/forgot-password', {
        statusCode: 404,
        body: { message: 'No account found with this email' }
      }).as('forgotPasswordError');

      cy.get('[data-testid="forgot-password-usertype-select"]').click();
      cy.contains('[role="option"]', 'Patient').click();
      cy.get('[data-testid="forgot-password-email-input"]').type('nonexistent@example.com');
      cy.get('[data-testid="forgot-password-submit-btn"]').click();

      cy.wait('@forgotPasswordError');
      cy.contains('No account found with this email').should('be.visible');
    });

    it('should disable submit button while loading', () => {
      cy.intercept('POST', '**/api/auth/forgot-password', (req) => {
        req.reply((res) => {
          res.delay = 1000;
          res.send({ statusCode: 200, body: { message: 'Success' } });
        });
      }).as('slowRequest');

      cy.get('[data-testid="forgot-password-usertype-select"]').click();
      cy.contains('[role="option"]', 'Patient').click();
      cy.get('[data-testid="forgot-password-email-input"]').type('test@example.com');
      cy.get('[data-testid="forgot-password-submit-btn"]').click();

      cy.get('[data-testid="forgot-password-submit-btn"]').should('be.disabled');
      cy.get('[data-testid="forgot-password-submit-btn"]').should('contain', 'Sending Email...');
    });

    it('should hide form after successful submission', () => {
      cy.intercept('POST', '**/api/auth/forgot-password', {
        statusCode: 200,
        body: { message: 'Password reset link sent' }
      }).as('forgotPassword');

      cy.get('[data-testid="forgot-password-usertype-select"]').click();
      cy.contains('[role="option"]', 'Patient').click();
      cy.get('[data-testid="forgot-password-email-input"]').type('test@example.com');
      cy.get('[data-testid="forgot-password-submit-btn"]').click();

      cy.wait('@forgotPassword');
      cy.get('[data-testid="forgot-password-email-input"]').should('not.exist');
    });
  });

  describe('Navigation', () => {
    it('should navigate to login page', () => {
      cy.get('[data-testid="forgot-password-login-link"]').click();
      cy.url().should('include', '/login');
    });
  });

  describe('Error Handling', () => {
    it('should handle server error', () => {
      cy.intercept('POST', '**/api/auth/forgot-password', {
        statusCode: 500,
        body: { message: 'Server error occurred' }
      }).as('serverError');

      cy.get('[data-testid="forgot-password-usertype-select"]').click();
      cy.contains('[role="option"]', 'Patient').click();
      cy.get('[data-testid="forgot-password-email-input"]').type('test@example.com');
      cy.get('[data-testid="forgot-password-submit-btn"]').click();

      cy.wait('@serverError');
      cy.contains('Server error occurred').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile', () => {
      cy.viewport('iphone-x');
      cy.get('[data-testid="forgot-password-email-input"]').should('be.visible');
      cy.get('[data-testid="forgot-password-submit-btn"]').should('be.visible');
    });

    it('should be responsive on tablet', () => {
      cy.viewport('ipad-2');
      cy.contains('Forgot Password').should('be.visible');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels', () => {
      cy.get('label[for="email"]').should('exist');
      cy.get('label[for="userType"]').should('exist');
    });

    it('should support keyboard navigation', () => {
      cy.get('[data-testid="forgot-password-email-input"]').focus().should('have.focus');
    });
  });
});
