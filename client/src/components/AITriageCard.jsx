import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// This is a placeholder component.
export const AITriageCard = ({ patientName, urgencyScore, aiSummary, symptoms, riskFactors }) => {
    const getUrgencyColor = (score) => {
        if (score >= 4) return "destructive";
        if (score === 3) return "secondary";
        return "outline";
    };

    return (
        <Card className="border-red-200 bg-red-50">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{patientName}</CardTitle>
                        <CardDescription>{symptoms}</CardDescription>
                    </div>
                    <Badge variant={getUrgencyColor(urgencyScore)}>Urgency: {urgencyScore}/5</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm font-semibold mb-2">AI Summary:</p>
                <p className="text-sm text-gray-700 mb-4">{aiSummary}</p>
                <p className="text-sm font-semibold mb-2">Risk Factors:</p>
                <div className="flex flex-wrap gap-2">
                    {riskFactors.map((factor, index) => (
                        <Badge key={index} variant="destructive">{factor}</Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};