# Test IDs Reference Guide

Quick reference for all `data-testid` attributes added to the application for Cypress testing.

## 🔐 Login Page (`/login`)

| Element | Test ID | Description |
|---------|---------|-------------|
| User Type Dropdown | `user-type-select` | Select Patient/Doctor/Admin |
| Email Input | `email-input` | Email address field |
| Password Input | `password-input` | Password field |
| Toggle Password | `toggle-password-btn` | Show/hide password |
| Login Button | `login-submit-btn` | Submit login form |
| Google Login | `google-login-btn` | Sign in with Google |
| Forgot Password Link | `forgot-password-link` | Navigate to password reset |
| Signup Link | `signup-link` | Navigate to signup page |

## 📝 Signup Page (`/signup`)

### Common Fields
| Element | Test ID | Description |
|---------|---------|-------------|
| Full Name | `signup-fullname-input` | User's full name |
| Email | `signup-email-input` | Email address |
| User Type | `signup-usertype-select` | Patient/Doctor/Admin |
| Password | `signup-password-input` | Password field |
| Confirm Password | `signup-confirm-password-input` | Password confirmation |
| Toggle Password | `signup-toggle-password-btn` | Show/hide password |
| Toggle Confirm | `signup-toggle-confirm-password-btn` | Show/hide confirm password |
| Submit Button | `signup-submit-btn` | Create account |
| Login Link | `login-link` | Navigate to login |

### Doctor-Specific Fields
| Element | Test ID | Description |
|---------|---------|-------------|
| Specialization | `signup-specialization-select` | Medical specialization |
| Experience | `signup-experience-input` | Years of experience |
| License Number | `signup-license-input` | Medical license |
| Address | `signup-address-input` | Clinic address |
| Consultation Fee | `signup-fee-input` | Fee in ₹ |
| Bio | `signup-bio-input` | Doctor biography |

## 📅 Book Appointment Page (`/book-appointment/:doctorId`)

### Step 1: Time Selection
| Element | Test ID | Description |
|---------|---------|-------------|
| Next Button | `appointment-next-step-1-btn` | Proceed to step 2 |

### Step 2: Patient Details
| Element | Test ID | Description |
|---------|---------|-------------|
| Patient Name | `appointment-patient-name-input` | Full name |
| Phone Number | `appointment-phone-input` | 10-digit phone |
| Email | `appointment-email-input` | Email address |
| Birth Date | `appointment-birthdate-input` | Date of birth |
| Sex | `appointment-sex-select` | Gender selection |
| Language | `appointment-language-input` | Primary language |
| Primary Reason | `appointment-primary-reason-input` | Visit reason |
| Emergency Disclaimer | `appointment-emergency-disclaimer-checkbox` | Not an emergency |
| AI Consent | `appointment-consent-checkbox` | Consent to AI processing |
| Back Button | `appointment-back-to-step-1-btn` | Return to step 1 |
| Next Button | `appointment-next-step-2-btn` | Proceed to step 3 |

### Step 3: Confirmation
| Element | Test ID | Description |
|---------|---------|-------------|
| Back Button | `appointment-back-to-step-2-btn` | Return to step 2 |
| Confirm & Book | `appointment-confirm-book-btn` | Book without payment |
| Pay & Book | `appointment-pay-book-btn` | Book with payment |

## 💊 Prescription Page (`/prescription/:appointmentId`)

### Diagnosis
| Element | Test ID | Description |
|---------|---------|-------------|
| Diagnosis Input | `prescription-diagnosis-input` | Primary diagnosis |

### Medications (Dynamic Index)
| Element | Test ID Pattern | Description |
|---------|-----------------|-------------|
| Medication Name | `prescription-medication-{index}-input` | Medicine name |
| Dosage | `prescription-dosage-{index}-input` | Dosage amount |
| Instructions | `prescription-instructions-{index}-input` | Usage instructions |
| Duration | `prescription-duration-{index}-input` | Treatment duration |
| Add Medication | `prescription-add-medication-btn` | Add new medication row |

**Example**: First medication uses `prescription-medication-0-input`, second uses `prescription-medication-1-input`, etc.

### Notes & Follow-up
| Element | Test ID | Description |
|---------|---------|-------------|
| Notes | `prescription-notes-input` | Consultation notes |
| Follow-up Checkbox | `prescription-followup-checkbox` | Require follow-up |
| Follow-up Date | `prescription-followup-date-input` | Follow-up date |
| Follow-up Notes | `prescription-followup-notes-input` | Follow-up notes |

### Actions
| Element | Test ID | Description |
|---------|---------|-------------|
| Save Button | `prescription-save-btn` | Save prescription |
| Cancel Button | `prescription-cancel-btn` | Cancel and return |

## 🎯 Usage in Cypress Tests

### Basic Selection
```javascript
cy.get('[data-testid="email-input"]').type('user@example.com');
cy.get('[data-testid="login-submit-btn"]').click();
```

### Dynamic Index (Medications)
```javascript
// First medication
cy.get('[data-testid="prescription-medication-0-input"]').type('Paracetamol');
cy.get('[data-testid="prescription-dosage-0-input"]').type('500mg');

// Second medication
cy.get('[data-testid="prescription-medication-1-input"]').type('Amoxicillin');
cy.get('[data-testid="prescription-dosage-1-input"]').type('250mg');
```

### Checkboxes
```javascript
cy.get('[data-testid="appointment-consent-checkbox"]').check();
cy.get('[data-testid="appointment-consent-checkbox"]').should('be.checked');
```

### Dropdowns (Radix UI Select)
```javascript
// Method 1: Direct interaction
cy.get('[data-testid="user-type-select"]').click();
cy.contains('[role="option"]', 'Patient').click();

// Method 2: Using custom command
cy.selectRadixOption('user-type-select', 'Patient');
```

## 📋 Test Coverage by Page

| Page | Test IDs Added | Test Cases |
|------|----------------|------------|
| Login | 8 | 30+ |
| Signup | 14 | 25+ |
| Book Appointment | 14 | 35+ |
| Prescription | 12 | 40+ |
| **Total** | **48** | **130+** |

## 🔍 Finding Test IDs in Code

All test IDs follow this pattern in the JSX:
```jsx
<Input 
  id="email"
  name="email"
  type="email"
  data-testid="email-input"  // ← Test ID here
  value={formData.email}
  onChange={handleInputChange}
/>
```

## 💡 Best Practices

1. **Always use test IDs** instead of CSS classes or text content
2. **Use descriptive names** that indicate the element's purpose
3. **Keep consistent naming** across similar elements
4. **Use index for dynamic lists** (e.g., medications)
5. **Prefix by page** for clarity (e.g., `signup-`, `appointment-`, `prescription-`)

## 🚀 Quick Test Examples

### Login Test
```javascript
cy.visit('/login');
cy.get('[data-testid="user-type-select"]').click();
cy.contains('[role="option"]', 'Patient').click();
cy.get('[data-testid="email-input"]').type('test@example.com');
cy.get('[data-testid="password-input"]').type('password123');
cy.get('[data-testid="login-submit-btn"]').click();
```

### Signup Test
```javascript
cy.visit('/signup');
cy.get('[data-testid="signup-fullname-input"]').type('John Doe');
cy.get('[data-testid="signup-email-input"]').type('john@example.com');
cy.get('[data-testid="signup-usertype-select"]').click();
cy.contains('[role="option"]', 'Patient').click();
cy.get('[data-testid="signup-password-input"]').type('Pass123!');
cy.get('[data-testid="signup-confirm-password-input"]').type('Pass123!');
cy.get('[data-testid="signup-submit-btn"]').click();
```

### Prescription Test
```javascript
cy.visit('/prescription/123');
cy.get('[data-testid="prescription-diagnosis-input"]').type('Common Cold');
cy.get('[data-testid="prescription-medication-0-input"]').type('Paracetamol');
cy.get('[data-testid="prescription-dosage-0-input"]').type('500mg');
cy.get('[data-testid="prescription-instructions-0-input"]').type('Twice daily');
cy.get('[data-testid="prescription-save-btn"]').click();
```

## 📚 Related Documentation

- **Detailed Testing Guide**: `cypress/README.md`
- **Quick Start**: `CYPRESS_QUICK_START.md`
- **Implementation Summary**: `../CYPRESS_TESTING_SUMMARY.md`
- **Test Files**: `cypress/e2e/*.cy.js`

---

**Note**: All test IDs are case-sensitive and should be used exactly as shown in this reference.
