import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0d0e10",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Orange stripe motif */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "62%",
            height: 20,
            background: "#ff5a1f",
          }}
        />

        {/* Top: lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          {/* FW mark */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 7,
              background: "#f4f1ea",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                fontSize: 38,
                fontWeight: 900,
                color: "#0d0e10",
                letterSpacing: "-1px",
                lineHeight: 1,
              }}
            >
              FW
            </span>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "49%",
                height: 3,
                background: "#ff5a1f",
              }}
            />
          </div>
          {/* Wordmark */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: "#f4f1ea",
                letterSpacing: "-0.05em",
              }}
            >
              FYNL
            </span>
            <span
              style={{
                fontSize: 15,
                fontStyle: "italic",
                color: "#ff5a1f",
                letterSpacing: "-0.01em",
              }}
            >
              whistle
            </span>
          </div>
        </div>

        {/* Centre: headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontSize: 88,
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              color: "#f4f1ea",
            }}
          >
            Coaching,
          </span>
          <span
            style={{
              fontSize: 88,
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              color: "#ff5a1f",
            }}
          >
            called.
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 400,
              color: "#6b6f78",
              marginTop: 24,
              fontStyle: "italic",
            }}
          >
            The 80-minute coaching OS for rugby.
          </span>
        </div>

        {/* Bottom: domain */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#6b6f78",
          }}
        >
          fynlwhistle.com · 80′
        </div>
      </div>
    ),
    size,
  );
}
