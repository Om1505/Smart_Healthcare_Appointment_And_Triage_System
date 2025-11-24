describe('Login Page Tests', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  describe('Page Load and UI Elements', () => {
    it('should load the login page successfully', () => {
      cy.url().should('include', '/login');
      cy.contains('Welcome Back').should('be.visible');
      cy.contains('Sign in to your account').should('be.visible');
    });

    it('should display all form elements', () => {
      cy.get('[data-testid="user-type-select"]').should('be.visible');
      cy.get('[data-testid="email-input"]').should('be.visible');
      cy.get('[data-testid="password-input"]').should('be.visible');
      cy.get('[data-testid="login-submit-btn"]').should('be.visible');
      cy.get('[data-testid="google-login-btn"]').should('be.visible');
    });

    it('should display navigation links', () => {
      cy.get('[data-testid="forgot-password-link"]').should('be.visible');
      cy.get('[data-testid="signup-link"]').should('be.visible');
    });

    it('should display IntelliConsult logo and branding', () => {
      cy.contains('IntelliConsult').should('be.visible');
    });
  });

  describe('Form Validation', () => {
    it('should show validation error when submitting empty form', () => {
      cy.get('[data-testid="login-submit-btn"]').click();
      // HTML5 validation will prevent submission
      cy.get('[data-testid="email-input"]').then($input => {
        expect($input[0].validationMessage).to.not.be.empty;
      });
    });

    it('should validate email format', () => {
      cy.get('[data-testid="user-type-select"]').click()
      cy.contains('[role="option"]', 'Patient').click();
      cy.get('[data-testid="email-input"]').type('invalid-email');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-submit-btn"]').click();
      
      cy.get('[data-testid="email-input"]').then($input => {
        expect($input[0].validationMessage).to.include('email');
      });
    });

    it('should require user type selection', () => {
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-submit-btn"]').click();
      
      // Should show error message about selecting role
      cy.contains('Please select a user role', { timeout: 5000 }).should('be.visible');
    });
  });

  describe('User Type Selection', () => {
    it('should allow selecting patient role', () => {
      cy.get('[data-testid="user-type-select"]').click();
      cy.contains('[role="option"]', 'Patient').click();
      cy.get('[data-testid="user-type-select"]').should('contain', 'Patient');
    });

    it('should allow selecting doctor role', () => {
      cy.get('[data-testid="user-type-select"]').click();
      cy.contains('[role="option"]', 'Doctor').click();
      cy.get('[data-testid="user-type-select"]').should('contain', 'Doctor');
    });

    it('should allow selecting admin role', () => {
      cy.get('[data-testid="user-type-select"]').click();
      cy.contains('[role="option"]', 'Admin').click();
      cy.get('[data-testid="user-type-select"]').should('contain', 'Admin');
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', () => {
      cy.get('[data-testid="password-input"]').type('mypassword');
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
      
      cy.get('[data-testid="toggle-password-btn"]').click();
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'text');
      
      cy.get('[data-testid="toggle-password-btn"]').click ();
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
    });
  });

  describe('Form Input', () => {
    it('should accept valid email input', () => {
      const email = 'test@example.com';
      cy.get('[data-testid="email-input"]').type(email);
      cy.get('[data-testid="email-input"]').should('have.value', email);
    });

    it('should accept password input', () => {
      const password = 'SecurePassword123!';
      cy.get('[data-testid="password-input"]').type(password);
      cy.get('[data-testid="password-input"]').should('have.value', password);
    });

    it('should clear input fields', () => {
      cy.get('[data-testid="email-input"]').type('test@example.com').clear();
      cy.get('[data-testid="email-input"]').should('have.value', '');
    });
  });

  describe('Navigation', () => {
    it('should navigate to signup page', () => {
      cy.get('[data-testid="signup-link"]').click();
      cy.url().should('include', '/signup');
    });

    it('should navigate to forgot password page', () => {
      cy.get('[data-testid="forgot-password-link"]').click();
      cy.url().should('include', '/forgot-password');
    });
  });

  describe('Login Attempt with Invalid Credentials', () => {
    it('should show error for invalid credentials', () => {
      cy.get('[data-testid="user-type-select"]').click();
      cy.contains('[role="option"]', 'Patient').click();
      cy.get('[data-testid="email-input"]').type('invalid@example.com');
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="login-submit-btn"]').click();
      
      // Wait for API response and check for error message
      cy.contains('Invalid credentials or user role.', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Button States', () => {
    it('should disable submit button while loading', () => {
      cy.get('[data-testid="user-type-select"]').click();
      cy.contains('[role="option"]', 'Patient').click();
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      
      cy.intercept('POST', '**/api/auth/login', (req) => {
        req.reply((res) => {
          res.delay = 1000;
        });
      }).as('loginRequest');
      
      cy.get('[data-testid="login-submit-btn"]').click();
      cy.get('[data-testid="login-submit-btn"]').should('be.disabled');
      cy.get('[data-testid="login-submit-btn"]').should('contain', 'Signing In...');
    });
  });

  describe('Google Login', () => {
    it('should have Google login button', () => {
      cy.get('[data-testid="google-login-btn"]').should('be.visible');
      cy.get('[data-testid="google-login-btn"]').should('contain', 'Sign in with Google');
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile', () => {
      cy.viewport('iphone-x');
      cy.get('[data-testid="user-type-select"]').should('be.visible');
      cy.get('[data-testid="email-input"]').should('be.visible');
      cy.get('[data-testid="password-input"]').should('be.visible');
    });

    it('should be responsive on tablet', () => {
      cy.viewport('ipad-2');
      cy.get('[data-testid="login-submit-btn"]').should('be.visible');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', () => {
      cy.get('label[for="email"]').should('exist');
      cy.get('label[for="password"]').should('exist');
    });

    it('should support keyboard navigation', () => {
      cy.get('[data-testid="email-input"]').focus().should('have.focus');
      cy.get('[data-testid="email-input"]').tab();
      cy.get('[data-testid="password-input"]').should('have.focus');
    });
  });
});
