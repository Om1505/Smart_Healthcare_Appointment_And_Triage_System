import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AITriageCard } from '@/components/AITriageCard.jsx';

describe('AITriageCard', () => {
  it('renders patient name, symptoms, and urgency', () => {
    render(
      <AITriageCard
        patientName="John Doe"
        urgencyScore={4}
        aiSummary="Summary"
        symptoms="Fever and cough"
        riskFactors={["Diabetes"]}
      />
    );
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Fever and cough')).toBeInTheDocument();
    expect(screen.getByText(/Urgency: 4\/5/)).toBeInTheDocument();
  });
});
