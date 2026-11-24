/** SmartPothole AI mark — same artwork as the Android launcher icon: an orange map pin holding a road with a pothole. */
export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="4 14 100 80" className={className} role="img" aria-label="SmartPothole AI">
      <rect x="4" y="14" width="100" height="80" rx="20" fill="#0B1B33" />
      <g transform="translate(0 -1)">
        <path fill="#F97316" d="M54,24c-12.15,0 -22,9.85 -22,22c0,16.5 22,38 22,38s22,-21.5 22,-38c0,-12.15 -9.85,-22 -22,-22z" />
        <path fill="#FFFFFF" d="M50.5,31h7l7.5,27h-22z" />
        <path fill="#0B1B33" d="M53.2,35h1.6v4h-1.6z M53,42h2v5h-2z" />
        <ellipse fill="#0B1B33" cx="57.5" cy="52.5" rx="4.5" ry="2.2" />
      </g>
    </svg>
  );
}

export function Logo({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className={`whitespace-nowrap font-bold tracking-tight text-lg ${compact ? 'hidden sm:inline' : ''}`}>
        SmartPothole <span className="text-safety-500">AI</span>
      </span>
    </span>
  );
}
