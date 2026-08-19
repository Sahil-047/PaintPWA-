type Props = {
  className?: string;
};

const blue = "#1358fa";
const blueMid = "#3b82f6";
const blueLight = "#b3caf2";
const blueSoft = "#eef4ff";
const ink = "#0f172a";
const muted = "#64748b";

function StepBadge({ x, label }: { x: number; label: string }) {
  return (
    <text
      x={x}
      y="188"
      textAnchor="middle"
      fill={muted}
      fontSize="10"
      fontFamily="Work Sans, sans-serif"
      fontWeight="600"
    >
      {label}
    </text>
  );
}

function Arrow({ x1, x2 }: { x1: number; x2: number }) {
  const y = 92;
  return (
    <g stroke={blueLight} strokeWidth="2" strokeLinecap="round">
      <path d={`M${x1} ${y} H${x2 - 8}`} />
      <path d={`M${x2 - 14} ${y - 5} l8 5 l-8 5`} fill="none" />
    </g>
  );
}

export function BookDemoProcessArt({ className }: Props) {
  return (
    <svg viewBox="0 0 640 200" fill="none" className={className} aria-hidden>
      <rect width="640" height="200" rx="16" fill={blueSoft} />

      {/* Step 1: Request */}
      <g transform="translate(24, 24)">
        <rect width="120" height="120" rx="12" fill="#fff" stroke={blueLight} strokeWidth="2" />
        <rect x="16" y="18" width="48" height="6" rx="3" fill={blue} opacity="0.85" />
        <rect x="16" y="34" width="88" height="10" rx="5" fill={blueSoft} stroke={blueLight} strokeWidth="1" />
        <rect x="16" y="52" width="88" height="10" rx="5" fill={blueSoft} stroke={blueLight} strokeWidth="1" />
        <rect x="16" y="70" width="88" height="10" rx="5" fill={blueSoft} stroke={blueLight} strokeWidth="1" />
        <rect x="16" y="92" width="56" height="14" rx="7" fill={blue} />
        <circle cx="96" cy="22" r="10" fill={blueMid} opacity="0.15" />
        <text x="96" y="26" textAnchor="middle" fill={blue} fontSize="11" fontFamily="Work Sans, sans-serif" fontWeight="800">
          1
        </text>
      </g>
      <StepBadge x={84} label="Request" />

      <Arrow x1={148} x2={168} />

      {/* Step 2: Schedule */}
      <g transform="translate(168, 24)">
        <rect width="120" height="120" rx="12" fill="#fff" stroke={blueLight} strokeWidth="2" />
        <rect x="28" y="20" width="64" height="54" rx="8" fill={blueSoft} stroke={blueLight} strokeWidth="1.5" />
        <rect x="36" y="30" width="12" height="8" rx="2" fill={blue} opacity="0.7" />
        <rect x="52" y="30" width="12" height="8" rx="2" fill={blueLight} />
        <rect x="68" y="30" width="12" height="8" rx="2" fill={blueLight} />
        <rect x="36" y="44" width="12" height="8" rx="2" fill={blueLight} />
        <rect x="52" y="44" width="12" height="8" rx="2" fill={blue} />
        <rect x="68" y="44" width="12" height="8" rx="2" fill={blueLight} />
        <rect x="24" y="84" width="72" height="18" rx="9" fill={blue} opacity="0.12" />
        <text x="60" y="96" textAnchor="middle" fill={blue} fontSize="9" fontFamily="Work Sans, sans-serif" fontWeight="700">
          Confirmed
        </text>
        <circle cx="96" cy="22" r="10" fill={blueMid} opacity="0.15" />
        <text x="96" y="26" textAnchor="middle" fill={blue} fontSize="11" fontFamily="Work Sans, sans-serif" fontWeight="800">
          2
        </text>
      </g>
      <StepBadge x={228} label="Schedule" />

      <Arrow x1={292} x2={312} />

      {/* Step 3: Live demo */}
      <g transform="translate(312, 24)">
        <rect width="120" height="120" rx="12" fill="#fff" stroke={blue} strokeWidth="2" />
        <rect x="18" y="22" width="84" height="52" rx="6" fill={ink} opacity="0.92" />
        <rect x="24" y="28" width="36" height="6" rx="2" fill={blueLight} />
        <rect x="24" y="40" width="52" height="5" rx="2" fill="#fff" opacity="0.35" />
        <rect x="24" y="50" width="44" height="5" rx="2" fill="#fff" opacity="0.25" />
        <rect x="24" y="60" width="28" height="10" rx="4" fill={blueMid} />
        <circle cx="88" cy="48" r="14" fill={blue} opacity="0.35" />
        <path d="M82 48l5 4 10-12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="28" y="84" width="64" height="18" rx="9" fill={blueSoft} />
        <text x="60" y="96" textAnchor="middle" fill={blue} fontSize="8" fontFamily="Work Sans, sans-serif" fontWeight="700">
          Live demo
        </text>
        <circle cx="96" cy="22" r="10" fill={blueMid} opacity="0.15" />
        <text x="96" y="26" textAnchor="middle" fill={blue} fontSize="11" fontFamily="Work Sans, sans-serif" fontWeight="800">
          3
        </text>
      </g>
      <StepBadge x={372} label="Walkthrough" />

      <Arrow x1={436} x2={456} />

      {/* Step 4: Go live */}
      <g transform="translate(456, 24)">
        <rect width="120" height="120" rx="12" fill="#fff" stroke={blueLight} strokeWidth="2" />
        <path
          d="M48 48h24v48H48zM54 96h12v12H54z"
          stroke={ink}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M48 48l12-10h24l12 10" stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="84" cy="108" r="16" fill={blue} />
        <path d="M77 108l5 5 10-12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="96" cy="22" r="10" fill={blueMid} opacity="0.15" />
        <text x="96" y="26" textAnchor="middle" fill={blue} fontSize="11" fontFamily="Work Sans, sans-serif" fontWeight="800">
          4
        </text>
      </g>
      <StepBadge x={516} label="Go live" />
    </svg>
  );
}
