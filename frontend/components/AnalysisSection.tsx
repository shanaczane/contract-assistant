import ReactMarkdown from "react-markdown";
import { RISK_STYLES } from "../lib/constants";
import type { ParsedAnalysis } from "../lib/types";

interface Props {
  analyzing: boolean;
  analysis: ParsedAnalysis | null;
  analysisError: string | null;
}

const INFO_CARDS: { label: string; key: keyof Pick<ParsedAnalysis, "summary" | "parties" | "payment" | "termination"> }[] = [
  { label: "Summary", key: "summary" },
  { label: "Parties", key: "parties" },
  { label: "Payment Terms", key: "payment" },
  { label: "Termination", key: "termination" },
];

export default function AnalysisSection({ analyzing, analysis, analysisError }: Props) {
  return (
    <section className="animate-fade-in">
      <p className="text-xs font-semibold text-[#64748B] tracking-widest uppercase mb-4">
        02 / Contract analysis
      </p>

      {analyzing ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-16 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-[#0F172A]">Analyzing contract...</p>
          <p className="text-xs text-[#64748B]">This may take a moment</p>
        </div>
      ) : analysisError ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex items-center gap-3">
          <svg className="w-5 h-5 text-[#EF4444] shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-[#EF4444]">{analysisError}</p>
        </div>
      ) : analysis ? (
        <div className="space-y-4">
          {/* Risk badge */}
          {analysis.riskLevel && (
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${RISK_STYLES[analysis.riskLevel].bg} ${RISK_STYLES[analysis.riskLevel].text}`}
            >
              <span className={`w-2 h-2 rounded-full ${RISK_STYLES[analysis.riskLevel].dot}`} />
              {RISK_STYLES[analysis.riskLevel].label}
            </div>
          )}

          {/* 2×2 info grid */}
          <div className="grid grid-cols-2 gap-4">
            {INFO_CARDS.map(({ label, key }) => (
              <div key={label} className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3">
                  {label}
                </p>
                {analysis[key] ? (
                  <div className="prose-contract text-sm">
                    <ReactMarkdown>{analysis[key]}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-[#64748B]">Not specified</p>
                )}
              </div>
            ))}
          </div>

          {/* Key obligations */}
          {analysis.obligations && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3">
                Key Obligations
              </p>
              <div className="prose-contract text-sm">
                <ReactMarkdown>{analysis.obligations}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Red flags */}
          {analysis.redFlags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                Red Flags
              </p>
              {analysis.redFlags.map((flag, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-[#E2E8F0] px-5 py-4"
                  style={{ borderLeft: "4px solid #EF4444" }}
                >
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-4 h-4 text-[#EF4444] mt-0.5 shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="prose-contract text-sm">
                      <ReactMarkdown>{flag}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
