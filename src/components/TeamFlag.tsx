// Renders a real flag image (flagcdn.com) for a FIFA team code.
// Falls back to a styled 3-letter badge if no mapping is found.

const FIFA_TO_ISO2: Record<string, string> = {
  ALG: 'dz', ARG: 'ar', AUS: 'au', AUT: 'at', BEL: 'be',
  BIH: 'ba', BRA: 'br', CAN: 'ca', CIV: 'ci', COD: 'cd',
  COL: 'co', CPV: 'cv', CRO: 'hr', CUW: 'cw', CZE: 'cz',
  ECU: 'ec', EGY: 'eg', ENG: 'gb-eng', ESP: 'es', FRA: 'fr',
  GER: 'de', GHA: 'gh', HAI: 'ht', IRN: 'ir', IRQ: 'iq',
  JOR: 'jo', JPN: 'jp', KOR: 'kr', KSA: 'sa', MAR: 'ma',
  MEX: 'mx', NED: 'nl', NOR: 'no', NZL: 'nz', PAN: 'pa',
  PAR: 'py', POR: 'pt', QAT: 'qa', RSA: 'za', SCO: 'gb-sct',
  SEN: 'sn', SUI: 'ch', SWE: 'se', TUN: 'tn', TUR: 'tr',
  URU: 'uy', USA: 'us', UZB: 'uz',
};

interface Props {
  code: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function TeamFlag({ code, size = 24, className, style }: Props) {
  const iso = FIFA_TO_ISO2[code?.toUpperCase() ?? ''];
  const w = Math.round(size * 1.5);
  const h = Math.round(size);

  if (!iso) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: w, height: h, borderRadius: 3, flexShrink: 0,
          background: 'var(--bg-4)', color: 'var(--tx-3)',
          fontSize: size * 0.38, fontFamily: 'var(--ff-d)',
          fontWeight: 800, letterSpacing: 0.5, lineHeight: 1,
          ...style,
        }}
      >
        {code?.slice(0, 3) ?? '???'}
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      width={w}
      height={h}
      alt={code}
      className={className}
      style={{
        borderRadius: 3, objectFit: 'cover',
        display: 'inline-block', verticalAlign: 'middle', flexShrink: 0,
        ...style,
      }}
      loading="lazy"
    />
  );
}
