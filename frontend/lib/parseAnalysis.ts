import type { ParsedAnalysis, RiskLevel } from "./types";

// Handles formats like: "**1. Summary**", "## 1. Summary", "1. Summary"
function getSectionContent(text: string, num: number): string {
  const startRe = new RegExp(
    `(?:^|\\n)[#*\\s]*${num}[.):]\\s+[\\w\\s/&]+?[*\\s]*\\n`,
    "i"
  );
  const endRe = new RegExp(
    `(?:^|\\n)[#*\\s]*${num + 1}[.):]\\s+`,
    "i"
  );

  const startMatch = startRe.exec(text);
  if (!startMatch) return "";

  const contentStart = startMatch.index + startMatch[0].length;
  const remaining = text.slice(contentStart);
  const endMatch = endRe.exec(remaining);

  return (endMatch ? remaining.slice(0, endMatch.index) : remaining).trim();
}

export function parseAnalysis(raw: string): ParsedAnalysis {
  const summary = getSectionContent(raw, 1);
  const parties = getSectionContent(raw, 2);
  const obligations = getSectionContent(raw, 3);
  const payment = getSectionContent(raw, 4);
  const termination = getSectionContent(raw, 5);
  const redFlagsRaw = getSectionContent(raw, 6);
  const riskRaw = getSectionContent(raw, 7);

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
