import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social card. Deliberately typographic — no image assets to fetch. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#FAF9F6",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: "#0F5F52",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            {site.name.charAt(0)}
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, color: "#16181D" }}>{site.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              color: "#16181D",
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 940,
            }}
          >
            Plan the project.
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              color: "#0F5F52",
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 940,
            }}
          >
            Know what you need.
          </div>
        </div>

        <div style={{ fontSize: 28, color: "#5B6270", maxWidth: 900 }}>
          {site.supportingLine}
        </div>
      </div>
    ),
    size,
  );
}
