"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import { AREAS, CATEGORY_PALETTES } from "@/lib/data/spots";
import type { AreaId, Spot } from "@/lib/types";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Real browse map (replaces the stylized prototype panel): MapLibre GL with
 * OpenFreeMap tiles. Area markers keep the tap-to-filter behaviour from the
 * design. Spots render as a clustered GeoJSON layer (not one DOM Marker per
 * spot); past a few dozen pins in one suburb, unclustered markers just pile
 * into an unreadable blob, and hundreds of DOM markers is the wrong tool
 * anyway; the clustered circle/point layers scale to thousands.
 */

const SPOTS_SOURCE = "spots";

/** Real-world anchor per area for the clickable filter markers. */
const AREA_ANCHORS: Record<AreaId, { lat: number; lng: number }> = {
  blouberg: { lat: -33.808, lng: 18.4695 },
  durbanville: { lat: -33.8305, lng: 18.6501 },
  waterfront: { lat: -33.9036, lng: 18.4207 },
  bokaap: { lat: -33.9192, lng: 18.4135 },
  citybowl: { lat: -33.9258, lng: 18.4232 },
  seapoint: { lat: -33.915, lng: 18.385 },
  campsbay: { lat: -33.9508, lng: 18.3775 },
  tablemtn: { lat: -33.9628, lng: 18.4098 },
  woodstock: { lat: -33.9275, lng: 18.446 },
  obs: { lat: -33.9377, lng: 18.4713 },
  south: { lat: -33.981, lng: 18.465 },
  constantia: { lat: -34.027, lng: 18.42 },
  houtbay: { lat: -34.038, lng: 18.355 },
  muizenberg: { lat: -34.105, lng: 18.469 },
};

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

export function DiscoverMap({
  spots,
  activeArea,
  onToggleArea,
  hint,
  onReset,
}: {
  spots: Spot[];
  activeArea: AreaId | null;
  onToggleArea: (id: AreaId) => void;
  hint: string;
  onReset: () => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const glRef = useRef<typeof maplibregl | null>(null);
  const areaMarkers = useRef<maplibregl.Marker[]>([]);
  const router = useRouter();
  // Latest callbacks/state/data for handlers set up once when the map loads.
  const cbRef = useRef({ onToggleArea, activeArea, spots, router });
  cbRef.current = { onToggleArea, activeArea, spots, router };

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
        cooperativeGestures: true, // don't hijack page scroll
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
          if (id) cbRef.current.router.push(`/spots/${id}`);
        });
        for (const layer of ["clusters", "unclustered-point"]) {
          map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
        }

        syncAreaMarkers();
      });
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

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

  // Restyle area markers + glide to the selected area (or back out).
  useEffect(() => {
    syncAreaMarkers();
    const map = mapRef.current;
    if (!map) return;
    if (activeArea) {
      const a = AREA_ANCHORS[activeArea];
      map.flyTo({ center: [a.lng, a.lat], zoom: 12.5, duration: 900 });
    } else {
      map.fitBounds(HOME_BOUNDS, { padding: 24, duration: 900 });
    }
  }, [activeArea]);

  return (
    <div className="overflow-hidden rounded-[20px] border border-forest/15 bg-[#dce7e0] shadow-(--shadow-panel)">
      <div
        ref={el}
        role="application"
        aria-label="Map of Cape Town areas and spots"
        className="h-[220px] w-full bg-gradient-to-b from-ocean1 to-ocean2 sm:h-auto sm:aspect-[4/5]"
      />
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
