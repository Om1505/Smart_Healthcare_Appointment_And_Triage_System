describe('Reset Password Page Tests', () => {
  const mockToken = 'mock-reset-token-123';

  beforeEach(() => {
    cy.visit(`/reset-password/${mockToken}`);
  });

  describe('Page Load and UI Elements', () => {
    it('should load the reset password page successfully', () => {
      cy.url().should('include', `/reset-password/${mockToken}`);
    });

    it('should display page title and description', () => {
      cy.contains('Reset Your Password').should('be.visible');
      cy.contains('Enter your new password below').should('be.visible');
    });

    it('should display IntelliConsult branding', () => {
      cy.contains('IntelliConsult').should('be.visible');
    });

    it('should display all form elements', () => {
      cy.get('[data-testid="reset-password-input"]').should('be.visible');
      cy.get('[data-testid="reset-confirm-password-input"]').should('be.visible');
      cy.get('[data-testid="reset-password-submit-btn"]').should('be.visible');
    });

    it('should display password requirements', () => {
      cy.contains('Must be 8+ characters').should('be.visible');
    });

    it('should display link to login page', () => {
      cy.get('[data-testid="reset-password-login-link"]').should('be.visible');
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle new password visibility', () => {
      cy.get('[data-testid="reset-password-input"]').type('MyPassword123!');
      cy.get('[data-testid="reset-password-input"]').should('have.attr', 'type', 'password');

      cy.get('[data-testid="reset-toggle-password-btn"]').click();
      cy.get('[data-testid="reset-password-input"]').should('have.attr', 'type', 'text');

      cy.get('[data-testid="reset-toggle-password-btn"]').click();
      cy.get('[data-testid="reset-password-input"]').should('have.attr', 'type', 'password');
    });

    it('should toggle confirm password visibility', () => {
      cy.get('[data-testid="reset-confirm-password-input"]').type('MyPassword123!');
      cy.get('[data-testid="reset-confirm-password-input"]').should('have.attr', 'type', 'password');

      cy.get('[data-testid="reset-toggle-confirm-password-btn"]').click();
      cy.get('[data-testid="reset-confirm-password-input"]').should('have.attr', 'type', 'text');
    });
  });

  describe('Form Validation', () => {
    it('should show error when passwords do not match', () => {
      cy.get('[data-testid="reset-password-input"]').type('Password123!');
      cy.get('[data-testid="reset-confirm-password-input"]').type('DifferentPass123!');
      cy.get('[data-testid="reset-password-submit-btn"]').click();

      cy.contains('Passwords do not match').should('be.visible');
    });

    it('should validate password strength - missing uppercase', () => {
      cy.get('[data-testid="reset-password-input"]').type('password123!');
      cy.get('[data-testid="reset-confirm-password-input"]').type('password123!');
      cy.get('[data-testid="reset-password-submit-btn"]').click();

      cy.contains('Password must be at least 8 characters').should('be.visible');
    });

    it('should validate password strength - missing lowercase', () => {
      cy.get('[data-testid="reset-password-input"]').type('PASSWORD123!');
      cy.get('[data-testid="reset-confirm-password-input"]').type('PASSWORD123!');
      cy.get('[data-testid="reset-password-submit-btn"]').click();

      cy.contains('Password must be at least 8 characters').should('be.visible');
    });

    it('should validate password strength - missing number', () => {
      cy.get('[data-testid="reset-password-input"]').type('Password!');
      cy.get('[data-testid="reset-confirm-password-input"]').type('Password!');
      cy.get('[data-testid="reset-password-submit-btn"]').click();

      cy.contains('Password must be at least 8 characters').should('be.visible');
    });

    it('should validate password strength - missing special character', () => {
      cy.get('[data-testid="reset-password-input"]').type('Password123');
      cy.get('[data-testid="reset-confirm-password-input"]').type('Password123');
      cy.get('[data-testid="reset-password-submit-btn"]').click();

      cy.contains('Password must be at least 8 characters').should('be.visible');
    });

    it('should validate password strength - too short', () => {
      cy.get('[data-testid="reset-password-input"]').type('Pass1!');
      cy.get('[data-testid="reset-confirm-password-input"]').type('Pass1!');
      cy.get('[data-testid="reset-password-submit-btn"]').click();

      cy.contains('Password must be at least 8 characters').should('be.visible');
    });

    it('should accept valid password', () => {
      cy.intercept('PUT', `**/api/auth/reset-password/${mockToken}`, {
        statusCode: 200,
        body: { message: 'Password reset successful' }
      }).as('resetPassword');

      cy.get('[data-testid="reset-password-input"]').type('ValidPass123!');
      cy.get('[data-testid="reset-confirm-password-input"]').type('ValidPass123!');
      cy.get('[data-testid="reset-password-submit-btn"]').click();

      cy.wait('@resetPassword');
      cy.contains('Password reset successful').should('be.visible');
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid password', () => {
      cy.intercept('PUT', `**/api/auth/reset-password/${mockToken}`, {
        statusCode: 200,
        body: { message: 'Password has been reset successfully' }
      }).as('resetPassword');

      cy.get('[data-testid="reset-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="reset-confirm-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="reset-password-submit-btn"]').click();

      cy.wait('@resetPassword');
      cy.contains('Password has been reset successfully').should('be.visible');
    });

    it('should disable submit button while loading', () => {
      cy.intercept('PUT', `**/api/auth/reset-password/${mockToken}`, (req) => {
        req.reply((res) => {
          res.delay = 1000;
          res.send({ statusCode: 200, body: { message: 'Success' } });
        });
      }).as('slowRequest');

      cy.get('[data-testid="reset-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="reset-confirm-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="reset-password-submit-btn"]').click();

      cy.get('[data-testid="reset-password-submit-btn"]').should('be.disabled');
      cy.get('[data-testid="reset-password-submit-btn"]').should('contain', 'Resetting Password...');
    });

    it('should show login link after successful reset', () => {
      cy.intercept('PUT', `**/api/auth/reset-password/${mockToken}`, {
        statusCode: 200,
        body: { message: 'Password reset successful' }
      }).as('resetPassword');

      cy.get('[data-testid="reset-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="reset-confirm-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="reset-password-submit-btn"]').click();

      cy.wait('@resetPassword');
      cy.contains('Click here to log in').should('be.visible');
    });

    it('should hide form after successful submission', () => {
      cy.intercept('PUT', `**/api/auth/reset-password/${mockToken}`, {
        statusCode: 200,
        body: { message: 'Password reset successful' }
      }).as('resetPassword');

      cy.get('[data-testid="reset-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="reset-confirm-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="reset-password-submit-btn"]').click();

      cy.wait('@resetPassword');
      cy.get('[data-testid="reset-password-input"]').should('not.exist');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid or expired token', () => {
      cy.intercept('PUT', `**/api/auth/reset-password/${mockToken}`, {
        statusCode: 400,
        body: { message: 'Invalid or expired reset token' }
      }).as('invalidToken');

      cy.get('[data-testid="reset-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="reset-confirm-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="reset-password-submit-btn"]').click();

      cy.wait('@invalidToken');
      cy.contains('Invalid or expired reset token').should('be.visible');
    });

    it('should handle server error', () => {
      cy.intercept('PUT', `**/api/auth/reset-password/${mockToken}`, {
        statusCode: 500,
        body: { message: 'Server error occurred' }
      }).as('serverError');

      cy.get('[data-testid="reset-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="reset-confirm-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="reset-password-submit-btn"]').click();

      cy.wait('@serverError');
      cy.contains('Server error occurred').should('be.visible');
    });
  });

  describe('Navigation', () => {
    it('should navigate to login page', () => {
      cy.get('[data-testid="reset-password-login-link"]').click();
      cy.url().should('include', '/login');
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile', () => {
      cy.viewport('iphone-x');
      cy.get('[data-testid="reset-password-input"]').should('be.visible');
      cy.get('[data-testid="reset-confirm-password-input"]').should('be.visible');
    });

    it('should be responsive on tablet', () => {
      cy.viewport('ipad-2');
      cy.contains('Reset Your Password').should('be.visible');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels', () => {
      cy.get('label[for="password"]').should('exist');
      cy.get('label[for="confirmPassword"]').should('exist');
    });
  });
});
