export type RiskLevel = "Low" | "Medium" | "High";
export type ClauseRisk = "HIGH" | "MEDIUM" | "LOW";

export interface RiskyClause {
  level: ClauseRisk;
  quote: string;
  explanation: string;
}

export interface ParsedAnalysis {
  summary: string;
  parties: string;
  obligations: string;
  payment: string;
  termination: string;
  redFlags: string;
  riskyClauses: RiskyClause[];
  riskLevel: RiskLevel | null;
  riskExplanation: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}
