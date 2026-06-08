import type { ParsedAnalysis, RiskLevel } from "./types";

// Matches ## Heading Name or numbered variants like ## 1. Heading Name or 1. Heading Name
function getSectionContent(text: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const startRe = new RegExp(
    `(?:^|\\n)[#*\\s]*(?:\\d+[.):s]+)?\\s*${escaped}[^\\n]*\\n`,
    "i"
  );
  const endRe = /(?:^|\n)#{1,3}\s+\S/;

  const startMatch = startRe.exec(text);
  if (!startMatch) return "";

  const contentStart = startMatch.index + startMatch[0].length;
  const remaining = text.slice(contentStart);

  // Find the next ## heading to know where this section ends
  const endMatch = endRe.exec(remaining);
  return (endMatch ? remaining.slice(0, endMatch.index) : remaining).trim();
}

export function parseAnalysis(raw: string): ParsedAnalysis {
  const summary = getSectionContent(raw, "Summary");
  const parties = getSectionContent(raw, "Parties");
  const obligations = getSectionContent(raw, "Key Obligations") || getSectionContent(raw, "Obligations");
  const payment = getSectionContent(raw, "Payment Terms");
  const termination = getSectionContent(raw, "Termination");
  const redFlagsRaw = getSectionContent(raw, "Red Flags");
  const riskRaw = getSectionContent(raw, "Risk Level");

  const redFlags = redFlagsRaw
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter((l) => l.length > 0);

  let riskLevel: RiskLevel | null = null;
  const riskText = riskRaw || raw;
  const riskMatch = riskText.match(/\b(low|medium|high)\b/i);
  if (riskMatch) {
    const r = riskMatch[1].toLowerCase();
    riskLevel = (r.charAt(0).toUpperCase() + r.slice(1)) as RiskLevel;
  }

  return { summary, parties, obligations, payment, termination, redFlags, riskLevel };
}
