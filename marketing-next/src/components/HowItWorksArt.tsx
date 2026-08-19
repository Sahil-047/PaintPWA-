type Props = {
  className?: string;
};

const blue = "#1358fa";
const blueLight = "#b3caf2";
const blueSoft = "#eef4ff";
const ink = "#0f172a";
const muted = "#64748b";

export function SetupWorkspaceArt({ className }: Props) {
  return (
    <svg viewBox="0 0 320 200" fill="none" className={className} aria-hidden>
      <rect width="320" height="200" rx="16" fill={blueSoft} />
      <rect x="24" y="28" width="132" height="96" rx="12" fill="#fff" stroke={blueLight} strokeWidth="2" />
      <path d="M44 88h92M44 72h68M44 56h52" stroke={blueLight} strokeWidth="3" strokeLinecap="round" />
      <rect x="56" y="44" width="28" height="8" rx="4" fill={blue} opacity="0.85" />
      <path
        d="M188 52h44v72h-44zM200 124h20v16h-20z"
        stroke={ink}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M188 52l22-14h22v14" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="206" y="68" width="18" height="14" rx="3" fill={blueLight} />
      <circle cx="248" cy="118" r="22" fill={blue} />
      <path d="M238 118l7 7 14-16" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="24" y="178" fill={muted} fontSize="11" fontFamily="Work Sans, sans-serif" fontWeight="600">
        Register, onboard, go live
      </text>
    </svg>
  );
}

export function ManageInventoryArt({ className }: Props) {
  return (
    <svg viewBox="0 0 320 200" fill="none" className={className} aria-hidden>
      <rect width="320" height="200" rx="16" fill={blueSoft} />
      <rect x="28" y="36" width="264" height="18" rx="6" fill="#fff" stroke={blueLight} strokeWidth="1.5" />
      <text x="40" y="49" fill={muted} fontSize="9" fontFamily="Work Sans, sans-serif" fontWeight="600">
        Brand, SKU, pack size
      </text>
      {[0, 1, 2, 3].map((col) => (
        <g key={col} transform={`translate(${36 + col * 68}, 68)`}>
          <rect width="52" height="72" rx="8" fill="#fff" stroke={blueLight} strokeWidth="1.5" />
          <rect x="14" y="12" width="24" height="34" rx="6" fill={col === 0 ? "#fca5a5" : col === 1 ? "#93c5fd" : col === 2 ? "#86efac" : "#fcd34d"} opacity="0.85" />
          <rect x="18" y="8" width="16" height="8" rx="3" fill="#fff" opacity="0.9" />
          <text x="26" y="58" textAnchor="middle" fill={ink} fontSize="8" fontFamily="Work Sans, sans-serif" fontWeight="700">
            {["50ml", "1L", "4L", "20L"][col]}
          </text>
        </g>
      ))}
      <rect x="28" y="152" width="88" height="24" rx="8" fill={blue} opacity="0.12" />
      <text x="72" y="168" textAnchor="middle" fill={blue} fontSize="10" fontFamily="Work Sans, sans-serif" fontWeight="700">
        Live stock
      </text>
    </svg>
  );
}

export function InvoiceCollectArt({ className }: Props) {
  return (
    <svg viewBox="0 0 320 200" fill="none" className={className} aria-hidden>
      <rect width="320" height="200" rx="16" fill={blueSoft} />
      <rect x="32" y="34" width="118" height="132" rx="10" fill="#fff" stroke={blueLight} strokeWidth="2" />
      <text x="48" y="58" fill={ink} fontSize="11" fontFamily="Work Sans, sans-serif" fontWeight="700">
        Bill #1042
      </text>
      <path d="M48 72h86M48 88h64M48 104h72" stroke={blueLight} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="48" y="118" width="86" height="10" rx="5" fill={blueLight} opacity="0.35" />
      <rect x="48" y="118" width="52" height="10" rx="5" fill={blue} />
      <text x="48" y="150" fill={muted} fontSize="9" fontFamily="Work Sans, sans-serif" fontWeight="600">
        Partial paid
      </text>
      <rect x="176" y="48" width="96" height="112" rx="10" fill="#fff" stroke={blue} strokeWidth="2" />
      <path d="M196 72h56M196 88h40" stroke={blueLight} strokeWidth="2" strokeLinecap="round" />
      <rect x="210" y="104" width="36" height="28" rx="4" fill={blue} opacity="0.15" />
      <text x="228" y="122" textAnchor="middle" fill={blue} fontSize="10" fontFamily="Work Sans, sans-serif" fontWeight="800">
        PDF
      </text>
      <path d="M248 156l18 10V46l-18 10" fill={blue} opacity="0.85" />
    </svg>
  );
}

export function ReviewPerformanceArt({ className }: Props) {
  return (
    <svg viewBox="0 0 320 200" fill="none" className={className} aria-hidden>
      <rect width="320" height="200" rx="16" fill={blueSoft} />
      <rect x="28" y="32" width="264" height="136" rx="12" fill="#fff" stroke={blueLight} strokeWidth="2" />
      <rect x="44" y="48" width="72" height="44" rx="8" fill={blueSoft} />
      <text x="80" y="66" textAnchor="middle" fill={muted} fontSize="8" fontFamily="Work Sans, sans-serif" fontWeight="600">
        Sales
      </text>
      <text x="80" y="84" textAnchor="middle" fill={blue} fontSize="14" fontFamily="Work Sans, sans-serif" fontWeight="800">
        ↑ 18%
      </text>
      <rect x="128" y="48" width="72" height="44" rx="8" fill={blueSoft} />
      <text x="164" y="66" textAnchor="middle" fill={muted} fontSize="8" fontFamily="Work Sans, sans-serif" fontWeight="600">
        Dues
      </text>
      <text x="164" y="84" textAnchor="middle" fill={ink} fontSize="12" fontFamily="Work Sans, sans-serif" fontWeight="800">
        ₹42K
      </text>
      <rect x="212" y="48" width="64" height="44" rx="8" fill={blueSoft} />
      <path d="M228 78l10-12 8 8 16-20" stroke={blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M44 112h232M44 148h232"
        stroke={blueLight}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M52 140l36-18 34 10 38-24 34 16 40-28"
        stroke={blue}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="52" cy="140" r="4" fill={blue} />
      <circle cx="200" cy="114" r="4" fill={blue} />
      <circle cx="272" cy="126" r="4" fill={blue} />
      <text x="160" y="178" textAnchor="middle" fill={muted} fontSize="10" fontFamily="Work Sans, sans-serif" fontWeight="600">
        One dashboard view
      </text>
    </svg>
  );
}

export const HOW_IT_WORKS_ART = [
  SetupWorkspaceArt,
  ManageInventoryArt,
  InvoiceCollectArt,
  ReviewPerformanceArt,
] as const;
