"use client";

import { useRef, useState } from "react";

interface Props {
  contractId: string | null;
  fileName: string | null;
  chunks: number | null;
  uploading: boolean;
  uploadError: string | null;
  analyzing: boolean;
  analyzed: boolean;
  onFile: (file: File) => void;
  onAnalyze: () => void;
}

export default function UploadSection({
  contractId,
  fileName,
  chunks,
  uploading,
  uploadError,
  analyzing,
  analyzed,
  onFile,
  onAnalyze,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploaded = !!contractId;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  return (
    <section>
      <p className="text-xs font-semibold text-[#64748B] tracking-widest uppercase mb-4">
        01 / Upload contract
      </p>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
        {!uploaded ? (
          <>
            <div
              className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 select-none ${
                dragging
                  ? "border-[#2563EB] bg-blue-50"
                  : "border-[#E2E8F0] hover:border-[#2563EB] hover:bg-[#F8FAFC]"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragging(false)}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <div className="w-12 h-12 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-[#64748B]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>

              {uploading ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#64748B]">Uploading...</p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-[#0F172A]">
                    Drop your PDF here, or click to browse
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">PDF files only</p>
                </>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFile(file);
                }}
              />
            </div>

            {uploadError && (
              <div className="mt-3 flex items-center gap-2 text-sm text-[#EF4444]">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {uploadError}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#EF4444]" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[#0F172A]">{fileName}</p>
                <p className="text-xs text-[#64748B]">{chunks} chunks extracted</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              Ready
            </span>
          </div>
        )}

        {uploaded && !analyzed && !analyzing && (
          <button
            onClick={onAnalyze}
            className="mt-5 w-full h-10 bg-[#2563EB] text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            Analyze contract
          </button>
        )}
      </div>
    </section>
  );
}
