import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#060709",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top: wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#ed6a1f",
            }}
          />
          <span
            style={{
              fontSize: "18px",
              fontWeight: 900,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#9aa3b2",
            }}
          >
            FYNL Whistle
          </span>
        </div>

        {/* Centre: headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
            <span
              style={{
                fontSize: "80px",
                fontWeight: 900,
                lineHeight: 0.92,
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
                color: "#ffffff",
              }}
            >
              Match analysis
            </span>
            <span
              style={{
                fontSize: "80px",
                fontWeight: 900,
                lineHeight: 0.92,
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
                color: "#ed6a1f",
              }}
            >
              built for coaches.
            </span>
          </div>
          <span
            style={{
              fontSize: "24px",
              fontWeight: 500,
              color: "#9aa3b2",
              letterSpacing: "0.01em",
            }}
          >
            Tag, review, and share match footage — in one place.
          </span>
        </div>

        {/* Bottom: domain */}
        <div
          style={{
            fontSize: "16px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#6b7484",
          }}
        >
          fynlwhistle.com
        </div>
      </div>
    ),
    size,
  );
}
