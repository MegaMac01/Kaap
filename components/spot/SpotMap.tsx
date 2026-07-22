"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Real venue map (SPEC §7): MapLibre GL with OpenFreeMap vector tiles
 * (free, keyless, production-permitted; © OpenStreetMap contributors,
 * attribution rendered by the map control). Lazy-loads the GL bundle on mount.
 */
export function SpotMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let map: import("maplibre-gl").Map | undefined;

    void import("maplibre-gl").then(({ default: maplibregl }) => {
      if (cancelled || !el.current) return;
      map = new maplibregl.Map({
        container: el.current,
        style: "https://tiles.openfreemap.org/styles/positron",
        center: [lng, lat],
        zoom: 14.5,
        attributionControl: false,
      });
      // See DiscoverMap.tsx: compact styling only, restyled via globals.css.
      map.addControl(new maplibregl.AttributionControl({ compact: true }));
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.scrollZoom.disable(); // don't hijack page scroll; zoom via buttons/pinch

      const dot = document.createElement("div");
      dot.setAttribute(
        "style",
        "width:18px;height:18px;border-radius:999px;background:#cf6a3f;" +
          "border:3px solid #fffdf6;box-shadow:0 2px 8px rgba(44,74,59,0.45)"
      );
      new maplibregl.Marker({ element: dot }).setLngLat([lng, lat]).addTo(map);
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng]);

  return (
    <div
      ref={el}
      role="img"
      aria-label={`Map showing the location of ${name}`}
      className="h-[240px] w-full overflow-hidden rounded-[14px] border border-forest/12 bg-ocean1"
    />
  );
}
