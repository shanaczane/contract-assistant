"use client";

import { useState } from "react";
import Header from "../components/Header";
import UploadSection from "../components/UploadSection";
import AnalysisSection from "../components/AnalysisSection";
import ChatSection from "../components/ChatSection";
import { API_BASE } from "../lib/constants";
import { parseAnalysis } from "../lib/parseAnalysis";
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
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSend = async (question: string) => {
    if (!contractId) return;
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
      setMessages((prev) => [...prev, { role: "assistant", content: askData.answer }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setChatLoading(false);
    }
  };

  const analyzed = !!analysis;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
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
        />

        {(analyzing || analyzed || analysisError) && (
          <AnalysisSection
            analyzing={analyzing}
            analysis={analysis}
            analysisError={analysisError}
          />
        )}

        {analyzed && (
          <ChatSection
            messages={messages}
            chatLoading={chatLoading}
            chatError={chatError}
            onSend={handleSend}
          />
        )}
      </main>
    </div>
  );
}
