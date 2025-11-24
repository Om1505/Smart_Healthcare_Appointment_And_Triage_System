describe('Find Doctors Page Tests', () => {
  const mockDoctors = [
    {
      _id: 'doc1',
      fullName: 'Dr. Sarah Johnson',
      specialization: 'Cardiology',
      experience: 15,
      bio: 'Experienced cardiologist specializing in heart disease prevention',
      consultationFee: 1000,
      averageRating: 4.8,
      reviewCount: 45
    },
    {
      _id: 'doc2',
      fullName: 'Dr. Michael Chen',
      specialization: 'Dermatology',
      experience: 10,
      bio: 'Expert in skin conditions and cosmetic dermatology',
      consultationFee: 800,
      averageRating: 4.5,
      reviewCount: 32
    },
    {
      _id: 'doc3',
      fullName: 'Dr. Emily Rodriguez',
      specialization: 'Pediatrics',
      experience: 12,
      bio: 'Caring pediatrician with focus on child development',
      consultationFee: 900,
      averageRating: 4.9,
      reviewCount: 67
    }
  ];

  beforeEach(() => {
    localStorage.setItem('token', 'mock-jwt-token');

    cy.intercept('GET', '**/api/doctors*', {
      statusCode: 200,
      body: mockDoctors
    }).as('getDoctors');

    cy.visit('/patient/doctors');
    cy.wait('@getDoctors');
  });

  describe('Page Load and UI Elements', () => {
    it('should load the find doctors page successfully', () => {
      cy.url().should('include', '/patient/doctors');
    });

    it('should display page title and description', () => {
      cy.contains('Find Your Doctor').should('be.visible');
      cy.contains('Search and book with qualified healthcare professionals').should('be.visible');
    });

    it('should display navigation bar', () => {
      cy.contains('IntelliConsult').should('be.visible');
      cy.contains('Dashboard').should('be.visible');
      cy.contains('Logout').should('be.visible');
    });

    it('should display search and filter controls', () => {
      cy.get('input[placeholder*="Search"]').should('be.visible');
      cy.contains('All Specialties').should('be.visible');
    });
  });

  describe('Doctor Cards Display', () => {
    it('should display all doctors', () => {
      cy.contains('Dr. Sarah Johnson').should('be.visible');
      cy.contains('Dr. Michael Chen').should('be.visible');
      cy.contains('Dr. Emily Rodriguez').should('be.visible');
    });

    it('should display doctor information correctly', () => {
      cy.contains('Dr. Sarah Johnson').should('be.visible');
      cy.contains('Cardiology').should('be.visible');
      cy.contains('15 years experience').should('be.visible');
      cy.contains('Experienced cardiologist').should('be.visible');
    });

    it('should display ratings and reviews', () => {
      cy.contains('45 reviews').should('be.visible');
      cy.contains('32 reviews').should('be.visible');
      cy.contains('67 reviews').should('be.visible');
    });

    it('should display action buttons for each doctor', () => {
      cy.get('body *')
        .filter(':contains("Book Appointment")')
        .should('have.length.at.least', 3);
      cy.get('body *')
        .filter(':contains("View Profile")')
        .should('have.length.at.least', 3);
      cy.get('body *')
        .filter(':contains("View Reviews")')
        .should('have.length.at.least', 3);
      
      
    });
  });

  describe('Search Functionality', () => {
    it('should filter doctors by name', () => {
      cy.intercept('GET', '**/api/doctors?search=Sarah*', {
        statusCode: 200,
        body: [mockDoctors[0]]
      }).as('searchDoctors');

      cy.get('input[placeholder*="Search"]').type('Sarah');
      cy.wait('@searchDoctors');
      cy.contains('Dr. Sarah Johnson').should('be.visible');
      cy.contains('Dr. Michael Chen').should('not.exist');
    });

    it('should filter doctors by specialty in search', () => {
      cy.intercept('GET', '**/api/doctors?search=Cardiology*', {
        statusCode: 200,
        body: [mockDoctors[0]]
      }).as('searchBySpecialty');

      cy.get('input[placeholder*="Search"]').type('Cardiology');
      cy.wait('@searchBySpecialty');
      cy.contains('Dr. Sarah Johnson').should('be.visible');
    });

    it('should debounce search input', () => {
      cy.get('input[placeholder*="Search"]').type('test');
      cy.wait(100);
      cy.get('@getDoctors.all').should('have.length', 1); // Only initial load
    });

    it('should clear search results', () => {
      cy.get('input[placeholder*="Search"]').type('Sarah');
      cy.wait(400);
      cy.get('input[placeholder*="Search"]').clear();
      cy.wait(400);
      cy.contains('Dr. Michael Chen').should('be.visible');
    });
  });

  describe('Specialty Filter', () => {
    it('should display all specialties in dropdown', () => {
      cy.contains('All Specialties').click();
      cy.contains('[role="option"]', 'Cardiology').should('be.visible');
      cy.contains('[role="option"]', 'Dermatology').should('be.visible');
      cy.contains('[role="option"]', 'Pediatrics').should('be.visible');
      cy.contains('[role="option"]', 'Neurology').should('be.visible');
      cy.contains('[role="option"]', 'Orthopedics').should('be.visible');
    });

    it('should filter doctors by specialty', () => {
      cy.intercept('GET', '**/api/doctors?specialty=Cardiology*', {
        statusCode: 200,
        body: [mockDoctors[0]]
      }).as('filterBySpecialty');

      cy.contains('All Specialties').click();
      cy.contains('[role="option"]', 'Cardiology').click();
      cy.wait('@filterBySpecialty');
      cy.contains('Dr. Sarah Johnson').should('be.visible');
      cy.contains('Dr. Michael Chen').should('not.exist');
    });

    it('should show all doctors when selecting "All Specialties"', () => {
      // First filter
      cy.contains('All Specialties').click();
      cy.contains('[role="option"]', 'Cardiology').click();
      cy.wait(400);

      // Then reset
      cy.contains('Cardiology').click();
      cy.contains('[role="option"]', 'All Specialties').click();
      cy.wait(400);
      cy.contains('Dr. Michael Chen').should('be.visible');
    });
  });

  describe('Combined Search and Filter', () => {
    it('should apply both search and specialty filter', () => {
      cy.intercept('GET', '**/api/doctors?search=Sarah&specialty=Cardiology*', {
        statusCode: 200,
        body: [mockDoctors[0]]
      }).as('combinedFilter');

      cy.get('input[placeholder*="Search"]').type('Sarah');
      cy.contains('All Specialties').click();
      cy.contains('[role="option"]', 'Cardiology').click();
      cy.wait('@combinedFilter');
      cy.contains('Dr. Sarah Johnson').should('be.visible');
    });
  });

  describe('Navigation Actions', () => {
    it('should navigate to book appointment page', () => {
      cy.contains('Book Appointment').first().click();
      cy.url().should('include', '/patient/book/doc1');
    });

    it('should navigate to doctor profile page', () => {
      cy.contains('View Profile').first().click();
      cy.url().should('include', '/doctor/doc1');
    });

    it('should navigate to doctor reviews page', () => {
      cy.contains('View Reviews').first().click();
      cy.url().should('include', '/doctor/doc1/reviews');
    });

    it('should navigate to dashboard', () => {
      cy.contains('Dashboard').click();
      cy.url().should('include', '/patient/dashboard');
    });

    it('should navigate to home page when clicking logo', () => {
      cy.contains('IntelliConsult').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/');
    });
  });

  describe('Empty States', () => {
    it('should show no doctors found message', () => {
      cy.intercept('GET', '**/api/doctors?search=NonExistent*', {
        statusCode: 200,
        body: []
      }).as('noResults');

      cy.get('input[placeholder*="Search"]').type('NonExistent');
      cy.wait('@noResults');
      cy.contains('No Doctors Found').should('be.visible');
      cy.contains('Try adjusting your search criteria').should('be.visible');
    });
  });

  describe('Loading States', () => {
    it('should show loading message while fetching doctors', () => {
      cy.intercept('GET', '**/api/doctors*', (req) => {
        req.reply((res) => {
          res.delay = 1000;
          res.send({ statusCode: 200, body: mockDoctors });
        });
      }).as('slowDoctors');

      cy.reload();
      cy.contains('Loading doctors...').should('be.visible');
      cy.wait('@slowDoctors');
      cy.contains('Dr. Sarah Johnson').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should display error message on fetch failure', () => {
      cy.intercept('GET', '**/api/doctors*', {
        statusCode: 500,
        body: { message: 'Server error' }
      }).as('errorFetch');

      cy.reload();
      cy.wait('@errorFetch');
      cy.contains('Failed to fetch doctors').should('be.visible');
    });
  });

  describe('Logout Functionality', () => {
    it('should logout and redirect to login page', () => {
      cy.contains('Logout').click();
      cy.url().should('include', '/login');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('token')).to.be.null;
      });
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile', () => {
      cy.viewport('iphone-x');
      cy.contains('Find Your Doctor').should('be.visible');
      cy.get('input[placeholder*="Search"]').should('be.visible');
      cy.contains('Dr. Sarah Johnson').should('be.visible');
    });

    it('should be responsive on tablet', () => {
      cy.viewport('ipad-2');
      cy.contains('Book Appointment').should('be.visible');
    });

    it('should stack doctor cards on mobile', () => {
      cy.viewport('iphone-x');
      cy.get('.space-y-6').should('exist');
    });
  });

  describe('Star Rating Display', () => {
    it('should display star ratings for doctors', () => {
      cy.get('[class*="text-yellow-400"]').should('have.length.at.least', 3);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible search input', () => {
      cy.get('input[data-testid="search-input"]')
        .should('be.visible');
      
    });

    it('should have clickable doctor cards', () => {
      cy.contains('Dr. Sarah Johnson').parent().parent().should('be.visible');
    });
  });
});
