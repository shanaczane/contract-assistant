import type { RiskLevel } from "./types";

export const API_BASE = "http://localhost:8000";

export const RISK_STYLES: Record<
  RiskLevel,
  { bg: string; text: string; dot: string; label: string }
> = {
  Low: { bg: "bg-green-50", text: "text-green-600", dot: "bg-[#22C55E]", label: "Low Risk" },
  Medium: { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-[#F59E0B]", label: "Medium Risk" },
  High: { bg: "bg-red-50", text: "text-red-600", dot: "bg-[#EF4444]", label: "High Risk" },
};

export const SUGGESTION_QUESTIONS = [
  "What are the payment terms?",
  "Who are the parties involved?",
  "How can the contract be terminated?",
];
