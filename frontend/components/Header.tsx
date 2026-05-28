export default function Header() {
  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-[#0F172A] leading-none tracking-tight">
            ContractAI
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">Legal document assistant</p>
        </div>
      </div>
    </header>
  );
}
