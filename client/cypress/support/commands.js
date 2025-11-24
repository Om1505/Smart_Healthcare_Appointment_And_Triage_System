// Custom commands for Cypress tests

// Login command
Cypress.Commands.add('login', (email, password, userType) => {
  cy.visit('/login');
  cy.get('[data-testid="user-type-select"]').click();
  cy.contains('[role="option"]', userType).click();
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-submit-btn"]').click();
});

// Logout command
Cypress.Commands.add('logout', () => {
  localStorage.removeItem('token');
});

// Select from Radix UI dropdown
Cypress.Commands.add('selectRadixOption', (triggerTestId, optionText) => {
  // Open the Radix select trigger
  cy.get(`[data-testid="${triggerTestId}"]`).click();
  // Normalize option text: accept phrases like "I am a doctor" and match case-insensitively.
  const lowered = optionText.toLowerCase();
  let matcher;
  if (/doctor/.test(lowered)) {
    matcher = /doctor/i;
  } else if (/patient/.test(lowered)) {
    matcher = /patient/i;
  } else if (/admin/.test(lowered)) {
    matcher = /admin/i;
  } else {
    matcher = new RegExp(optionText, 'i');
  }
  // Wait for Radix options (rendered in a portal) to appear, ensure visibility, then click.
  cy.get('[role="option"]', { timeout: 6000 })
    .contains(matcher)
    .should('be.visible')
    .click({ force: true });
});

// Check Radix UI checkbox
Cypress.Commands.add('checkRadixCheckbox', (testId) => {
  cy.get(`[data-testid="${testId}"]`).then($checkbox => {
    if ($checkbox.attr('data-state') !== 'checked') {
      cy.get(`[data-testid="${testId}"]`).click();
    }
  });
});
