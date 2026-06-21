// SVG icon library — replaces all emoji throughout the app
// All icons: 24×24 viewBox, stroke-based, currentColor

interface P { size?: number; className?: string }

export function IcoTrophy({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 2h8v9a4 4 0 0 1-8 0V2z" />
      <path d="M8 5H4C4 9 6 11 8 11.5" />
      <path d="M16 5h4c0 4-2 6.5-4 6.5" />
      <path d="M12 15v4" />
      <path d="M8 21h8" />
    </svg>
  );
}

export function IcoBall({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 2.5l2.5 4.5-2.5 2-2.5-2L12 2.5z" />
      <path d="M12 21.5l-2.5-4.5 2.5-2 2.5 2L12 21.5z" />
      <path d="M2.5 12l4.5-2.5 2 2.5-2 2.5L2.5 12z" />
      <path d="M21.5 12l-4.5 2.5-2-2.5 2-2.5L21.5 12z" />
    </svg>
  );
}

export function IcoGlobe({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 2.5c-2.5 3-4 5.5-4 9.5s1.5 6.5 4 9.5" />
      <path d="M12 2.5c2.5 3 4 5.5 4 9.5s-1.5 6.5-4 9.5" />
      <path d="M2.5 9h19M2.5 15h19" />
    </svg>
  );
}

export function IcoGoal({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 4v14" />
      <path d="M21 4v14" />
      <path d="M3 4h18" />
      <path d="M3 10h18" />
      <path d="M3 18h18" />
      <path d="M8 10v8" />
      <path d="M16 10v8" />
    </svg>
  );
}

export function IcoLightning({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M13 2L4 14h8l-1 8 9-12h-8l1-8z" />
    </svg>
  );
}

export function IcoClock({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function IcoChart({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 20h18" />
      <path d="M7 20v-8" />
      <path d="M12 20v-14" />
      <path d="M17 20v-5" />
    </svg>
  );
}

export function IcoTarget({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

export function IcoRefresh({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 12c0-4.4 3.6-8 8-8 2.4 0 4.5 1 6 2.6" />
      <path d="M20 12c0 4.4-3.6 8-8 8-2.4 0-4.5-1-6-2.6" />
      <path d="M15 6.5l3-2.5.5 4-4 .5" />
      <path d="M9 17.5l-3 2.5-.5-4 4-.5" />
    </svg>
  );
}

export function IcoCheck({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function IcoWarning({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2L2 21h20L12 2z" />
      <path d="M12 9v5" />
      <circle cx="12" cy="18" r="0.7" fill="currentColor" />
    </svg>
  );
}

export function IcoLock({ size = 16, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function IcoSwords({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
      <path d="M19 21l2-2" />
      <path d="M9.5 6.5L11 5l6-3 1 1-3 6-1.5 1.5" />
      <path d="M5 11l3-3" />
    </svg>
  );
}

export function IcoStadium({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 18V8c0-2.8 4-5 9-5s9 2.2 9 5v10" />
      <path d="M3 18c0 1.1 4 2 9 2s9-.9 9-2" />
      <ellipse cx="12" cy="8" rx="5" ry="2" />
    </svg>
  );
}

export function IcoRocket({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2C8 6 6 10 6 14c0 3.3 2.7 6 6 6s6-2.7 6-6c0-4-2-8-6-12z" />
      <path d="M8 16l-3 3" />
      <path d="M16 16l3 3" />
      <circle cx="12" cy="13" r="2" />
    </svg>
  );
}

export function IcoStar({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2l2.9 5.9L22 9l-5 4.9 1.2 6.9L12 17.8l-6.2 3-0.6-.4L7 14.9 2 10l7.1-1.1L12 2z" />
    </svg>
  );
}

export function IcoGoalScored({ size = 16, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  );
}

export function IcoYellowCard({ size = 14, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFD600" stroke="#c0a000" strokeWidth="1.5" className={className}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
    </svg>
  );
}

export function IcoRedCard({ size = 14, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#D63030" stroke="#a02020" strokeWidth="1.5" className={className}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
    </svg>
  );
}

export function IcoHandshake({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 12l2 2 4-4" />
      <path d="M3 7l3-3 3 3-2 2a10 10 0 0 0 6 6l2-2 3 3-3 3a14 14 0 0 1-15-15L3 7z" />
    </svg>
  );
}

export function IcoPlay({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}

export function IcoArrowLeft({ size = 18, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

export function IcoX({ size = 14, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function IcoHome({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

export function IcoGlove({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 11V7a2 2 0 0 0-4 0M14 11V6a2 2 0 0 0-4 0M10 11V7a2 2 0 0 0-4 0" />
      <path d="M6 7v7a6 6 0 0 0 12 0v-3a2 2 0 0 0-4 0" />
    </svg>
  );
}

export function IcoUsers({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
