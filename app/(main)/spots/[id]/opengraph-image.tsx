import { ImageResponse } from "next/og";
import { CATEGORY_PALETTES } from "@/lib/data/spots";
import { areaName, categoryLabel } from "@/lib/filters";
import { bandSymbol } from "@/lib/format";
import { getSpot } from "@/lib/spots-repo";

export const alt = "Spot on Kaap, the Cape Town activity guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const spot = await getSpot(id);
  const [c1, c2] = CATEGORY_PALETTES[spot?.category ?? ""] ?? ["#cf6a3f", "#a94f28"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#efe8d8",
          color: "#23281f",
        }}
      >
        <div
          style={{
            height: 26,
            background: `linear-gradient(90deg, ${c1} 0%, ${c2} 100%)`,
          }}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 80px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 18, height: 18, borderRadius: 999, background: "#cf6a3f" }} />
            <div style={{ fontSize: 34, fontWeight: 700 }}>Kaap</div>
            <div
              style={{
                fontSize: 20,
                letterSpacing: 4,
                color: "#7a7565",
                textTransform: "uppercase",
                marginTop: 6,
              }}
            >
              Cape Town
            </div>
          </div>
          <div
            style={{
              marginTop: 34,
              fontSize: spot && spot.name.length > 26 ? 62 : 78,
              fontWeight: 700,
              lineHeight: 1.05,
              maxWidth: 1040,
            }}
          >
            {spot?.name ?? "Cape Town activity guide"}
          </div>
          {spot && (
            <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 18 }}>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#ffffff",
                  background: c1,
                  padding: "8px 24px",
                  borderRadius: 999,
                }}
              >
                {categoryLabel(spot.category)}
              </div>
              <div style={{ fontSize: 30, color: "#3c4238" }}>
                {`${areaName(spot.area)} · ${bandSymbol(spot.priceBand)} · rated ${spot.rating.toFixed(1)}`}
              </div>
            </div>
          )}
        </div>
        <div
          style={{
            height: 26,
            background: `linear-gradient(90deg, ${c2} 0%, ${c1} 100%)`,
          }}
        />
      </div>
    ),
    size
  );
}
