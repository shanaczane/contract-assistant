"use client";

import { useEffect, useState } from "react";
import UploadSection from "../components/UploadSection";
import AnalysisSection from "../components/AnalysisSection";
import ChatSection from "../components/ChatSection";
import { API_BASE, RISK_STYLES, SUGGESTION_QUESTIONS } from "../lib/constants";
import { parseAnalysis } from "../lib/parseAnalysis";
import { clearSession, loadSession, saveSession } from "../lib/session";
import type { Message, ParsedAnalysis } from "../lib/types";

export default function Home() {
  // Upload
  const [contractId, setContractId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [chunks, setChunks] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ParsedAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Layout
  const [activeTab, setActiveTab] = useState<"chat" | "analysis">("chat");
  const [input, setInput] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  // Dark mode — sync class on <html> and persist preference
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // After hydration, restore session — validate the contract still exists first
  useEffect(() => {
    const s = loadSession();
    if (!s.contractId) return;

    const apply = () => {
      setContractId(s.contractId);
      setFileName(s.fileName);
      setChunks(s.chunks);
      setAnalysis(s.analysis);
      setMessages(s.messages);
      setConversationId(s.conversationId);
      if (s.analysis) setActiveTab("analysis");
    };

    fetch(`${API_BASE}/contracts/${s.contractId}`)
      .then((res) => { if (res.ok) apply(); else clearSession(); })
      .catch(() => apply());
  }, []);

  // Persist whenever durable state changes
  useEffect(() => {
    if (!contractId) return;
    saveSession({ contractId, fileName, chunks, analysis, messages, conversationId });
  }, [contractId, fileName, chunks, analysis, messages, conversationId]);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files are supported.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/upload-contract`, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const data = await res.json();
      setContractId(data.contract_id);
      setFileName(file.name);
      setChunks(data.chunks_created);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!contractId) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_id: contractId }),
      });
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
      const data = await res.json();
      setAnalysis(parseAnalysis(data.analysis));
      setActiveTab("analysis");
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    clearSession();
    setContractId(null);
    setFileName(null);
    setChunks(null);
    setUploadError(null);
    setAnalyzing(false);
    setAnalysis(null);
    setAnalysisError(null);
    setMessages([]);
    setConversationId(null);
    setChatLoading(false);
    setChatError(null);
    setActiveTab("chat");
    setInput("");
  };

  const handleSend = async (question: string) => {
    if (!contractId) return;
    setActiveTab("chat");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setChatLoading(true);
    setChatError(null);
    try {
      let convId = conversationId;
      if (!convId) {
        const convRes = await fetch(`${API_BASE}/conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contract_id: contractId }),
        });
        if (!convRes.ok) throw new Error("Failed to create conversation");
        const convData = await convRes.json();
        convId = convData.conversation_id as string;
        setConversationId(convId);
      }
      const askRes = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_id: contractId, conversation_id: convId, question }),
      });
      if (!askRes.ok) throw new Error("Failed to get answer");
      const askData = await askRes.json();
      if (askData.conversation_id && askData.conversation_id !== convId) {
        setConversationId(askData.conversation_id);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: askData.answer }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setChatLoading(false);
    }
  };

  const handleInputSend = () => {
    const question = input.trim();
    if (!question || chatLoading || !contractId) return;
    setInput("");
    handleSend(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleInputSend();
    }
  };

  const analyzed = !!analysis;

  return (
    <div className="flex flex-col md:flex-row md:h-screen md:overflow-hidden bg-brand-bg transition-colors duration-200">

      {/* ── LEFT PANEL ────────────────────────────────────────────────── */}
      <aside className="w-full md:w-72 lg:w-80 md:shrink-0 bg-brand-surface border-b md:border-b-0 md:border-r border-brand-border md:h-full md:overflow-y-auto flex flex-col transition-colors duration-200">

        {/* Brand + dark mode toggle */}
        <div className="px-4 py-3.5 border-b border-brand-border shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-brand-text leading-none tracking-tight">ContractAI</h1>
              <p className="text-xs text-brand-muted mt-0.5">Legal document assistant</p>
            </div>
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className="w-8 h-8 rounded-lg border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-text hover:border-brand-primary transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              /* Sun icon */
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              /* Moon icon */
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>

        {/* Upload + mini summary */}
        <div className="p-4 flex flex-col gap-4 flex-1">
          <UploadSection
            contractId={contractId}
            fileName={fileName}
            chunks={chunks}
            uploading={uploading}
            uploadError={uploadError}
            analyzing={analyzing}
            analyzed={analyzed}
            onFile={handleFile}
            onAnalyze={handleAnalyze}
            onReset={handleReset}
          />

          {/* Mini analysis summary — no clamp, scrolls with left panel */}
          {analysis && (
            <div className="bg-brand-bg rounded-2xl border border-brand-border p-4 space-y-3">
              {analysis.riskLevel && (
                <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${RISK_STYLES[analysis.riskLevel].bg} ${RISK_STYLES[analysis.riskLevel].text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${RISK_STYLES[analysis.riskLevel].dot}`} />
                  {RISK_STYLES[analysis.riskLevel].label}
                </div>
              )}
              {analysis.summary && (
                <p className="text-xs text-brand-muted leading-relaxed">
                  {analysis.summary.replace(/[*#_]/g, "").trim()}
                </p>
              )}
              <button
                onClick={() => setActiveTab("analysis")}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
              >
                View full analysis
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── RIGHT PANEL ───────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col md:h-full md:overflow-hidden transition-colors duration-200">

        {/* Tab bar */}
        <div className="bg-brand-surface border-b border-brand-border px-5 flex items-end shrink-0 h-12">
          {(["chat", "analysis"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 h-10 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-brand-muted hover:text-brand-text"
              }`}
            >
              {tab === "chat" ? "Chat" : "Analysis"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* CHAT TAB */}
          {activeTab === "chat" && (
            <ChatSection
              messages={messages}
              chatLoading={chatLoading}
              chatError={chatError}
            />
          )}

          {/* ANALYSIS TAB */}
          {activeTab === "analysis" && (
            <div className="flex-1 h-full overflow-y-auto">
              <div className="p-6">
                {(analyzing || analysis || analysisError) ? (
                  <AnalysisSection
                    analyzing={analyzing}
                    analysis={analysis}
                    analysisError={analysisError}
                  />
                ) : (
                  <div className="py-24 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-12 h-12 bg-brand-surface border border-brand-border rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-brand-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-sm text-brand-muted">
                      {contractId
                        ? 'Click "Analyze contract" in the left panel to get started.'
                        : "Upload a contract to begin analysis."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input bar — only shown on Chat tab */}
        {activeTab === "chat" && (
          <div className="bg-brand-surface border-t border-brand-border p-4 shrink-0">
            {contractId && (
              <div className="flex flex-wrap gap-2 mb-3">
                {SUGGESTION_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-brand-border text-brand-muted hover:border-brand-primary hover:text-brand-primary transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={contractId ? "Ask a question about the contract..." : "Upload a contract to start chatting..."}
                disabled={!contractId || chatLoading}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-brand-border bg-brand-bg px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent leading-5 overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: "40px", maxHeight: "120px" }}
              />
              <button
                onClick={handleInputSend}
                disabled={chatLoading || !input.trim() || !contractId}
                className="h-10 px-4 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
