import ReactMarkdown from "react-markdown";
import { RISK_STYLES } from "../lib/constants";
import type { ParsedAnalysis } from "../lib/types";

interface Props {
  analyzing: boolean;
  analysis: ParsedAnalysis | null;
  analysisError: string | null;
  onAskQuestion?: (question: string) => void;
}

const ASK_QUESTIONS: Record<string, string> = {
  Summary:           "Summarize this contract in your own words, then quote the most important sentences directly from the contract.",
  Parties:           "Who are the parties in this contract? Quote the exact sentences that identify them.",
  "Payment Terms":   "What exactly does the contract say about payment? Quote the relevant clauses word for word.",
  Termination:       "Quote the exact contract language about how this agreement can be terminated.",
  "Key Obligations": "Quote the exact obligations for each party as written in the contract.",
  "Red Flags":       "For each red flag in the contract, quote the exact clause that creates the concern.",
};

const INFO_CARDS: { label: string; key: keyof Pick<ParsedAnalysis, "summary" | "parties" | "payment" | "termination"> }[] = [
  { label: "Summary",       key: "summary" },
  { label: "Parties",       key: "parties" },
  { label: "Payment Terms", key: "payment" },
  { label: "Termination",   key: "termination" },
];

const CARD =
  "bg-brand-surface rounded-2xl border border-brand-border p-5 " +
  "print:bg-transparent print:border-0 print:rounded-none print:p-0 print:pb-8";

const CARD_TITLE =
  "text-xs font-semibold text-brand-muted uppercase tracking-wide mb-3 " +
  "print:text-[10px] print:font-extrabold print:text-black print:border-b print:border-black/20 print:pb-1 print:mb-2";

function AskButton({ section, onAsk }: { section: string; onAsk?: (q: string) => void }) {
  if (!onAsk) return null;
  return (
    <button
      onClick={() => onAsk(ASK_QUESTIONS[section] ?? `Show me the original contract text about: ${section}`)}
      className="print:hidden inline-flex items-center gap-1 text-xs text-brand-muted hover:text-brand-primary active:scale-95 transition-all mt-3"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
      Ask about this
    </button>
  );
}

export default function AnalysisSection({ analyzing, analysis, analysisError, onAskQuestion }: Props) {
  return (
    <section className="animate-fade-in">
      {analyzing ? (
        <div className="bg-brand-surface rounded-2xl border border-brand-border p-16 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-brand-text">Analyzing contract...</p>
          <p className="text-xs text-brand-muted">This may take a moment</p>
        </div>
      ) : analysisError ? (
        <div className="bg-brand-surface rounded-2xl border border-brand-border p-6 flex items-center gap-3">
          <svg className="w-5 h-5 text-brand-danger shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-brand-danger">{analysisError}</p>
        </div>
      ) : analysis ? (
        <div className="space-y-4 print:space-y-0">

          {/* Export button */}
          <div className="print:hidden flex justify-end">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-brand-border text-brand-muted hover:border-brand-primary hover:text-brand-primary active:scale-95 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
          </div>

          {/* 2×2 grid → single column on print */}
          <div className="grid grid-cols-2 gap-4 print:grid-cols-1 print:gap-0">
            {INFO_CARDS.map(({ label, key }) => (
              <div key={label} className={`${CARD} flex flex-col`}>
                <p className={CARD_TITLE}>{label}</p>
                {analysis[key] ? (
                  <div className="prose-contract text-sm flex-1">
                    <ReactMarkdown>{analysis[key]}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-brand-muted flex-1">Not specified</p>
                )}
                <AskButton section={label} onAsk={onAskQuestion} />
              </div>
            ))}
          </div>

          {/* Key obligations */}
          {analysis.obligations && (
            <div className={CARD}>
              <p className={CARD_TITLE}>Key Obligations</p>
              <div className="prose-contract text-sm">
                <ReactMarkdown>{analysis.obligations}</ReactMarkdown>
              </div>
              <AskButton section="Key Obligations" onAsk={onAskQuestion} />
            </div>
          )}

          {/* Red flags — borderLeft replaced with Tailwind class so print:border-0 can override it */}
          {analysis.redFlags && (
            <div className={`${CARD} border-l-4 border-l-brand-danger print:border-l-0`}>
              <div className="flex items-center gap-2 mb-3">
                <svg className="print:hidden w-4 h-4 text-brand-danger shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className={CARD_TITLE}>Red Flags</p>
              </div>
              <div className="prose-contract text-sm">
                <ReactMarkdown>{analysis.redFlags}</ReactMarkdown>
              </div>
              <AskButton section="Red Flags" onAsk={onAskQuestion} />
            </div>
          )}

        </div>
      ) : null}
    </section>
  );
}
