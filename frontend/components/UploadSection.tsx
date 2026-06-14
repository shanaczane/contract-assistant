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
  onReset: () => void;
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
  onReset,
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
      <div className="bg-brand-surface rounded-2xl border border-brand-border p-4">
        {!uploaded ? (
          <>
            <div
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 select-none ${
                dragging
                  ? "border-brand-primary bg-blue-50 dark:bg-blue-900/20"
                  : "border-brand-border hover:border-brand-primary hover:bg-brand-bg"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragging(false)}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <div className="w-10 h-10 bg-brand-bg border border-brand-border rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-brand-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-brand-muted">Uploading...</p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-brand-text text-center">Drop PDF here</p>
                  <p className="text-xs text-brand-muted mt-1">or click to browse</p>
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
              <div className="mt-3 flex items-center gap-2 text-sm text-brand-danger">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {uploadError}
              </div>
            )}
          </>
        ) : (
          /* Stacked layout — works in narrow left panel */
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-brand-danger" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-text truncate">{fileName}</p>
              <p className="text-xs text-brand-muted">{chunks} chunks extracted</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {!analyzing && (
                  <button
                    onClick={onReset}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-brand-border text-xs font-medium text-brand-muted hover:border-brand-primary hover:text-brand-primary active:scale-95 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload another
                  </button>
                )}
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                  Ready
                </span>
              </div>
            </div>
          </div>
        )}

        {uploaded && !analyzed && !analyzing && (
          <button
            onClick={onAnalyze}
            className="mt-4 w-full h-9 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-blue-700 dark:hover:bg-blue-500 hover:shadow-md active:scale-95 active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Analyze contract
          </button>
        )}
      </div>
    </section>
  );
}
