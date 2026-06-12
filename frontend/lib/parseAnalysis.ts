import type { ParsedAnalysis, RiskLevel, RiskyClause } from "./types";

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

function parseRiskyClauses(raw: string): RiskyClause[] {
  const section = getSectionContent(raw, "Risky Clauses");
  if (!section) return [];

  const clauses: RiskyClause[] = [];
  const lines = section.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match HIGH / MEDIUM / LOW anywhere in the line
    const levelMatch = trimmed.match(/\b(HIGH|MEDIUM|LOW)\b/i);
    if (!levelMatch) continue;

    // Extract the first quoted string (straight or curly quotes, min 10 chars)
    const quoteMatch = trimmed.match(/[“”"]([^“”"]{10,})[“”"]/);
    if (!quoteMatch) continue;

    const quote = quoteMatch[1].trim();
    const afterQuote = trimmed.slice(trimmed.indexOf(quoteMatch[0]) + quoteMatch[0].length);
    const explanation = afterQuote.replace(/^\s*[—–\-:]\s*/, "").trim();

    if (explanation) {
      clauses.push({
        level: levelMatch[1].toUpperCase() as "HIGH" | "MEDIUM" | "LOW",
        quote,
        explanation,
      });
    }
  }

  return clauses;
}

export function parseAnalysis(raw: string): ParsedAnalysis {
  const summary = getSectionContent(raw, "Summary");
  const parties = getSectionContent(raw, "Parties");
  const obligations = getSectionContent(raw, "Key Obligations") || getSectionContent(raw, "Obligations");
  const payment = getSectionContent(raw, "Payment Terms");
  const termination = getSectionContent(raw, "Termination");
  const redFlags = getSectionContent(raw, "Red Flags");
  const riskyClauses = parseRiskyClauses(raw);
  const riskRaw = getSectionContent(raw, "Risk Level");

  // Fallback: getSectionContent misses the last section when there's no trailing newline after the heading
  const riskContent = riskRaw || ((): string => {
    const m = raw.match(/##\s*(?:\d+\.?\s*)?Risk Level[^\n]*\n([\s\S]*)$/i);
    return m ? m[1].trim() : "";
  })();

  let riskLevel: RiskLevel | null = null;
  const riskText = riskContent || raw;
  const riskMatch = riskText.match(/\b(low|medium|high)\b/i);
  if (riskMatch) {
    const r = riskMatch[1].toLowerCase();
    riskLevel = (r.charAt(0).toUpperCase() + r.slice(1)) as RiskLevel;
  }

  // Strip the leading "Low/Medium/High" label and any surrounding punctuation/markdown
  const riskExplanation = riskContent
    .replace(/^\*{0,2}(low|medium|high)\*{0,2}[\s\-—:.]*/i, "")
    .replace(/[*#_]/g, "")
    .trim();

  return { summary, parties, obligations, payment, termination, redFlags, riskyClauses, riskLevel, riskExplanation };
}
