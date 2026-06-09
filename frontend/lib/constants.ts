import type { RiskLevel } from "./types";

export const API_BASE = "http://localhost:8000";

export const RISK_STYLES: Record<
  RiskLevel,
  { bg: string; text: string; dot: string; label: string }
> = {
  Low:    { bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-600 dark:text-green-400", dot: "bg-brand-success", label: "Low Risk" },
  Medium: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400", dot: "bg-brand-warning", label: "Medium Risk" },
  High:   { bg: "bg-red-50  dark:bg-red-900/20",   text: "text-red-600  dark:text-red-400",   dot: "bg-brand-danger", label: "High Risk" },
};

export const SUGGESTION_QUESTIONS = [
  "What are the payment terms?",
  "Are there any red flags?",
  "What are my obligations?",
  "How can I terminate this contract?",
];
