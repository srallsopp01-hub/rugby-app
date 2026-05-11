interface FynlMarkProps {
  size?: number;
}

export function FynlMark({ size = 36 }: FynlMarkProps) {
  const r = Math.round(size * 0.117);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect
        width={size}
        height={size}
        rx={r}
        style={{ fill: "var(--foreground-strong)" }}
      />
      <text
        x={size / 2}
        y={size * 0.66}
        textAnchor="middle"
        style={{
          fontFamily:
            'var(--font-bebas-neue, "Bebas Neue", "Arial Black", sans-serif)',
          fontSize: `${size * 0.65}px`,
          fill: "var(--background)",
          letterSpacing: `${-size * 0.018}px`,
        }}
      >
        FW
      </text>
      <rect
        x="0"
        y={size * 0.49}
        width={size}
        height={size * 0.05}
        style={{ fill: "#ff5a1f" }}
      />
    </svg>
  );
}

interface FynlLockupProps {
  size?: number;
}

export function FynlLockup({ size = 36 }: FynlLockupProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: `${size * 0.22}px`,
      }}
    >
      <FynlMark size={size} />
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: `${size * 0.14}px`,
          lineHeight: 0.85,
        }}
      >
        <span
          style={{
            fontFamily:
              'var(--font-archivo-black, "Archivo Black", "Arial Black", sans-serif)',
            fontSize: `${size * 0.78}px`,
            color: "var(--foreground-strong)",
            letterSpacing: "-0.05em",
          }}
        >
          FYNL
        </span>
        <span
          style={{
            fontFamily:
              'var(--font-instrument-serif, "Instrument Serif", Georgia, serif)',
            fontStyle: "italic",
            fontSize: `${size * 0.78 * 0.5}px`,
            color: "#ff5a1f",
            letterSpacing: "-0.01em",
          }}
        >
          whistle
        </span>
      </div>
    </div>
  );
}
