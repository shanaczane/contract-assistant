"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { Message } from "../lib/types";

interface Props {
  messages: Message[];
  chatLoading: boolean;
  chatError: string | null;
}

export default function ChatSection({ messages, chatLoading, chatError }: Props) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
            <div className="w-10 h-10 bg-brand-bg border border-brand-border rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-brand-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm text-brand-muted">Ask anything about this contract</p>
            <p className="text-xs text-brand-muted opacity-60">Use the quick questions below or type your own</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-brand-primary text-white rounded-tr-sm"
                      : "bg-brand-bg text-brand-text border border-brand-border rounded-tl-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose-contract">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-brand-bg border border-brand-border rounded-2xl rounded-tl-sm px-4 py-3.5">
                  <div className="flex gap-1 items-center">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 bg-brand-muted rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Error banner */}
      {chatError && (
        <div className="px-5 py-2.5 border-t border-brand-border bg-red-50 flex items-center gap-2 shrink-0">
          <svg className="w-3.5 h-3.5 text-brand-danger shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-xs text-brand-danger">{chatError}</p>
        </div>
      )}
    </div>
  );
}
