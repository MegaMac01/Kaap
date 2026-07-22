import { ImageResponse } from "next/og";

export const alt = "Kaap — everything worth doing in the Cape";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#efe8d8",
          color: "#23281f",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: "#cf6a3f",
            }}
          />
          <div style={{ fontSize: 84, fontWeight: 700 }}>Kaap</div>
          <div
            style={{
              fontSize: 28,
              letterSpacing: 6,
              color: "#7a7565",
              textTransform: "uppercase",
              marginTop: 18,
            }}
          >
            Cape Town
          </div>
        </div>
        <div style={{ marginTop: 30, fontSize: 44, color: "#3c4238", maxWidth: 900 }}>
          Everything worth doing in the Cape. Mapped, priced and ready when you are.
        </div>
        <div style={{ marginTop: 40, display: "flex", gap: 12 }}>
          {["#cf6a3f", "#3f7d5c", "#7a4b6b", "#c58a3d", "#5c7a8c"].map((c) => (
            <div
              key={c}
              style={{ width: 64, height: 12, borderRadius: 999, background: c }}
            />
          ))}
        </div>
      </div>
    ),
    size
  );
}
