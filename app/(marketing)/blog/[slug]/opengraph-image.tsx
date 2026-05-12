import { ImageResponse } from "next/og";
import { blogPosts } from "../blogData";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  const title = post?.title ?? "FYNL Whistle Blog";
  const description = post?.description ?? "Coaching insights and analysis tips.";
  const tag = post?.tags?.[0] ?? "Blog";

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
          padding: "64px 80px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Orange accent stripe */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 6,
            height: "100%",
            background: "#ed6a1f",
          }}
        />

        {/* Top row: logo + Blog badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo lockup */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 6,
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
                  fontSize: 32,
                  fontWeight: 900,
                  color: "#060709",
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
                  background: "#ed6a1f",
                }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: "#f4f1ea",
                  letterSpacing: "-0.05em",
                }}
              >
                FYNL
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontStyle: "italic",
                  color: "#ed6a1f",
                }}
              >
                whistle
              </span>
            </div>
          </div>

          {/* Blog badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#ed6a1f",
                background: "rgba(237,106,31,0.12)",
                border: "1px solid rgba(237,106,31,0.3)",
                borderRadius: 4,
                padding: "4px 10px",
              }}
            >
              {tag}
            </span>
          </div>
        </div>

        {/* Centre: post title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            flex: 1,
            justifyContent: "center",
            paddingTop: "32px",
            paddingBottom: "32px",
          }}
        >
          <span
            style={{
              fontSize: 58,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              maxWidth: "960px",
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 400,
              color: "#6b7484",
              maxWidth: "800px",
              lineHeight: 1.4,
            }}
          >
            {description}
          </span>
        </div>

        {/* Bottom: domain */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#6b7484",
          }}
        >
          fynlwhistle.com/blog
        </div>
      </div>
    ),
    size,
  );
}
