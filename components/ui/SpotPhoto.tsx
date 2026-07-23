"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { StripedThumb } from "@/components/ui/StripedThumb";
import type { Spot } from "@/lib/types";

/**
 * Real venue photo (Google Places via the /api/photo proxy) with the striped
 * category placeholder as fallback for spots without photos, or when an
 * image fails to load. Replaces StripedThumb at every thumbnail/gallery
 * call site; `children` render as an overlay (labels, captions).
 */
export function SpotPhoto({
  spot,
  index = 0,
  width = 200,
  className = "",
  style,
  angle,
  children,
  overlayClassName = "",
}: {
  spot: Spot;
  /** Which of the spot's photos to show. */
  index?: number;
  /** Requested render width bucket: 200 thumbs, 400 tiles, 800 gallery. */
  width?: 200 | 400 | 800;
  className?: string;
  style?: CSSProperties;
  /** Stripe angle passed through to the placeholder fallback. */
  angle?: number;
  children?: ReactNode;
  /** Positioning for the overlay children on top of a real photo. */
  overlayClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = spot.photos[index];

  if (!src || failed) {
    return (
      <StripedThumb category={spot.category} angle={angle} className={className} style={style}>
        {children}
      </StripedThumb>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the /api/photo
          proxy already serves size-bucketed, CDN-cached images; next/image
          would add per-image optimizer cost for no visual gain. */}
      <img
        src={`${src}?w=${width}`}
        alt={`Photo of ${spot.name}`}
        loading="lazy"
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {children != null && <div className={`absolute ${overlayClassName}`}>{children}</div>}
    </div>
  );
}
