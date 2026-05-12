import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 4,
          background: "#0d0e10",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontSize: 21,
            fontWeight: 900,
            color: "#f4f1ea",
            letterSpacing: "-0.5px",
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
            height: 2,
            background: "#ed6a1f",
          }}
        />
      </div>
    ),
    size,
  );
}
