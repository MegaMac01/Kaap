"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import type maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import { AREAS, AREA_ANCHORS, CATEGORY_PALETTES } from "@/lib/data/spots";
import { areaName, categoryLabel } from "@/lib/filters";
import { bandSymbol } from "@/lib/format";
import type { AreaId, Spot } from "@/lib/types";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Real browse map (replaces the stylized prototype panel): MapLibre GL with
 * OpenFreeMap tiles. Area markers keep the tap-to-filter behaviour from the
 * design. Spots render as a clustered GeoJSON layer (not one DOM Marker per
 * spot); past a few dozen pins in one suburb, unclustered markers just pile
 * into an unreadable blob, and hundreds of DOM markers is the wrong tool
 * anyway; the clustered circle/point layers scale to thousands.
 *
 * Two variants:
 *  - panel (default): framed card in the Discover sidebar, cooperative
 *    gestures so the page scroll is never hijacked.
 *  - fullscreen: fills its parent (the mobile map overlay), free one-finger
 *    gestures.
 * Tapping a spot pin opens a preview card (bottom of the map) rather than
 * navigating straight away, so an exploratory tap never yanks you off page.
 */

const SPOTS_SOURCE = "spots";

/** Whole-metro view (Blouberg/Durbanville down to Simon's Town). */
const HOME_BOUNDS: [[number, number], [number, number]] = [
  [18.32, -34.21],
  [18.78, -33.78],
];

/** ['match', ['get','category'], 'eat', '#cf6a3f', ..., <default>] for the point layer. */
function categoryColorExpression(): unknown[] {
  const expr: unknown[] = ["match", ["get", "category"]];
  for (const [key, [color]] of Object.entries(CATEGORY_PALETTES)) expr.push(key, color);
  expr.push("#8a8570"); // fallback for any unmapped category
  return expr;
}

function toGeoJSON(spots: Spot[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: spots
      .filter((s) => s.coords)
      .map((s) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.coords!.lng, s.coords!.lat] },
        properties: { id: s.id, category: s.category },
      })),
  };
}

/** Bounding box of every located spot, or null when none have coords. */
function spotBounds(spots: Spot[]): [[number, number], [number, number]] | null {
  const located = spots.filter((s) => s.coords);
  if (!located.length) return null;
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  for (const s of located) {
    minLat = Math.min(minLat, s.coords!.lat);
    maxLat = Math.max(maxLat, s.coords!.lat);
    minLng = Math.min(minLng, s.coords!.lng);
    maxLng = Math.max(maxLng, s.coords!.lng);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export function DiscoverMap({
  spots,
  activeArea,
  onToggleArea,
  hint,
  onReset,
  focus = null,
  fullscreen = false,
}: {
  spots: Spot[];
  activeArea: AreaId | null;
  onToggleArea: (id: AreaId) => void;
  hint: string;
  onReset: () => void;
  /**
   * Non-area focus key (active collection/activity). When set, the camera
   * fits the filtered results, which may stretch far beyond the metro
   * (Overberg shark boats, Garden Route ziplines).
   */
  focus?: string | null;
  /** Fill the parent and allow free one-finger gestures (mobile overlay). */
  fullscreen?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const glRef = useRef<typeof maplibregl | null>(null);
  const areaMarkers = useRef<maplibregl.Marker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Latest callbacks/state/data for handlers set up once when the map loads.
  const cbRef = useRef({ onToggleArea, activeArea, spots, focus });
  cbRef.current = { onToggleArea, activeArea, spots, focus };

  useEffect(() => {
    let cancelled = false;
    void import("maplibre-gl").then(({ default: gl }) => {
      if (cancelled || !el.current || mapRef.current) return;
      glRef.current = gl;
      const map = new gl.Map({
        container: el.current,
        style: "https://tiles.openfreemap.org/styles/positron",
        bounds: HOME_BOUNDS,
        fitBoundsOptions: { padding: 24 },
        attributionControl: false,
        // The inline panel must never hijack page scroll; the fullscreen
        // overlay owns the whole viewport, so one-finger pan is safe there.
        cooperativeGestures: !fullscreen,
      });
      // Note: `compact: true` styles the control but doesn't start it
      // collapsed, and `customAttribution` only adds to (not replaces) the
      // credit baked into the OpenFreeMap style, so this stays on-screen;
      // restyled in globals.css to read as intentional chrome, not a default.
      map.addControl(new gl.AttributionControl({ compact: true }));
      map.addControl(new gl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      map.on("load", () => {
        map.addSource(SPOTS_SOURCE, {
          type: "geojson",
          data: toGeoJSON(cbRef.current.spots),
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 44,
        });

        map.addLayer({
          id: "clusters",
          type: "circle",
          source: SPOTS_SOURCE,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#2c4a3b",
            "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 30, 23],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fffdf6",
          },
        });
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: SPOTS_SOURCE,
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 12,
            "text-font": ["Noto Sans Bold"],
          },
          paint: { "text-color": "#fffdf6" },
        });
        map.addLayer({
          id: "unclustered-point",
          type: "circle",
          source: SPOTS_SOURCE,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": categoryColorExpression() as maplibregl.ExpressionSpecification,
            "circle-radius": 6,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fffdf6",
          },
        });

        map.on("click", "clusters", async (e) => {
          const feature = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
          const clusterId = feature?.properties?.cluster_id;
          const source = map.getSource(SPOTS_SOURCE) as GeoJSONSource;
          if (clusterId == null || !source) return;
          const zoom = await source.getClusterExpansionZoom(clusterId);
          const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
          map.easeTo({ center: [lng, lat], zoom, duration: 500 });
        });
        map.on("click", "unclustered-point", (e) => {
          const id = e.features?.[0]?.properties?.id;
          if (id) setSelectedId(id);
        });
        // Tapping empty map dismisses the preview card.
        map.on("click", (e) => {
          const hit = map.queryRenderedFeatures(e.point, {
            layers: ["unclustered-point", "clusters"],
          });
          if (!hit.length) setSelectedId(null);
        });
        for (const layer of ["clusters", "unclustered-point"]) {
          map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
        }

        syncAreaMarkers();
        // A fullscreen overlay can mount mid-session with a filter already
        // active; snap straight to the current view instead of the metro.
        applyCamera(0);
      });
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [fullscreen]);

  /** Move the camera to match the active area / focus / default view. */
  function applyCamera(duration: number) {
    const map = mapRef.current;
    if (!map) return;
    const { activeArea: area, focus: focusKey, spots: current } = cbRef.current;
    if (area) {
      const a = AREA_ANCHORS[area];
      map.flyTo({ center: [a.lng, a.lat], zoom: 12.5, duration });
      return;
    }
    if (focusKey) {
      const bounds = spotBounds(current);
      if (bounds) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration });
        return;
      }
    }
    map.fitBounds(HOME_BOUNDS, { padding: 24, duration });
  }

  function syncAreaMarkers() {
    const map = mapRef.current;
    const gl = glRef.current;
    if (!map || !gl) return;
    areaMarkers.current.forEach((m) => m.remove());
    areaMarkers.current = AREAS.map((a) => {
      const active = cbRef.current.activeArea === a.id;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = a.name;
      btn.setAttribute("aria-pressed", String(active));
      btn.setAttribute(
        "style",
        "display:flex;flex-direction:column;align-items:center;gap:2px;" +
          "background:transparent;border:none;cursor:pointer;padding:2px"
      );
      const dot = document.createElement("span");
      dot.setAttribute(
        "style",
        active
          ? "width:15px;height:15px;border-radius:999px;background:#cf6a3f;border:2px solid #fffdf6;box-shadow:0 0 0 4px rgba(207,106,63,0.3)"
          : "width:11px;height:11px;border-radius:999px;background:#2c4a3b;border:2px solid #fffdf6;box-shadow:0 1px 3px rgba(0,0,0,0.3)"
      );
      btn.appendChild(dot);
      if (!a.hideLabel) {
        const label = document.createElement("span");
        label.textContent = a.name;
        label.setAttribute(
          "style",
          `font-size:10px;font-weight:700;color:${active ? "#a94f28" : "#3c5648"};` +
            "background:rgba(255,253,246,0.82);border-radius:999px;padding:1px 6px"
        );
        btn.appendChild(label);
      }
      btn.addEventListener("click", () => cbRef.current.onToggleArea(a.id));
      const anchor = AREA_ANCHORS[a.id];
      return new gl.Marker({ element: btn }).setLngLat([anchor.lng, anchor.lat]).addTo(map);
    });
  }

  // Re-pin when the filtered list changes (cheap: one setData call, no DOM churn).
  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource(SPOTS_SOURCE) as GeoJSONSource | undefined;
    source?.setData(toGeoJSON(spots));
  }, [spots]);

  // Restyle area markers + glide to the selected area / focused results.
  useEffect(() => {
    syncAreaMarkers();
    applyCamera(900);
  }, [activeArea, focus]);

  const selected = selectedId ? (spots.find((s) => s.id === selectedId) ?? null) : null;

  const mapNode = (
    <div className={fullscreen ? "relative flex-1" : "relative"}>
      <div
        ref={el}
        role="application"
        aria-label="Map of Western Cape areas and spots"
        // No `absolute` here: maplibre's stylesheet forces `position: relative`
        // on its container, so explicit h/w is the only sizing that sticks.
        className={
          fullscreen
            ? "h-full w-full bg-gradient-to-b from-ocean1 to-ocean2"
            : "aspect-[4/5] w-full bg-gradient-to-b from-ocean1 to-ocean2"
        }
      />
      {selected && (
        <Link
          href={`/spots/${selected.id}`}
          className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-[14px] border border-forest/15 bg-card p-3 text-ink shadow-(--shadow-panel)"
        >
          <span
            className="size-[10px] flex-none rounded-full"
            style={{ background: (CATEGORY_PALETTES[selected.category] ?? ["#8a8570"])[0] }}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-bold leading-tight">
              {selected.name}
            </span>
            <span className="block truncate text-[12px] text-muted">
              {categoryLabel(selected.category)} · {areaName(selected.area)}
            </span>
          </span>
          <span className="inline-flex flex-none items-center gap-1 text-[12.5px] font-semibold">
            <Star size={12} className="fill-star text-star" aria-hidden />
            {selected.rating.toFixed(1)}
          </span>
          <span className="flex-none text-[13px] font-extrabold text-forest">
            {bandSymbol(selected.priceBand)}
          </span>
          <span className="flex-none rounded-full bg-forest px-3 py-[6px] text-[12px] font-semibold text-white">
            View
          </span>
        </Link>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {mapNode}
        <div className="flex items-center justify-between gap-[10px] border-t border-forest/12 bg-card px-[13px] py-[11px]">
          <span className="text-[12.5px] text-sage">{hint}</span>
          <button
            type="button"
            onClick={onReset}
            className="cursor-pointer rounded-full border border-terracotta/40 bg-transparent px-3 py-[5px] text-[12px] font-semibold text-terracotta"
          >
            Reset
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[20px] border border-forest/15 bg-[#dce7e0] shadow-(--shadow-panel)">
      {mapNode}
      <div className="flex items-center justify-between gap-[10px] px-[13px] py-[11px]">
        <span className="text-[12.5px] text-sage">{hint}</span>
        <button
          type="button"
          onClick={onReset}
          className="cursor-pointer rounded-full border border-terracotta/40 bg-transparent px-3 py-[5px] text-[12px] font-semibold text-terracotta"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
