export type RiskLevel = "Low" | "Medium" | "High";

export interface ParsedAnalysis {
  summary: string;
  parties: string;
  obligations: string;
  payment: string;
  termination: string;
  redFlags: string;
  riskLevel: RiskLevel | null;
  riskExplanation: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}
