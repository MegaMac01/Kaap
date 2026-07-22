"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { OpenBadge } from "@/components/ui/OpenBadge";
import { SaveHeart } from "@/components/ui/SaveHeart";
import { StripedThumb, ThumbLabel } from "@/components/ui/StripedThumb";
import { areaName, categoryLabel } from "@/lib/filters";
import { bandSymbol, formatReviewCount } from "@/lib/format";
import { useKaap } from "@/lib/store";
import type { Spot } from "@/lib/types";

/** Discover list row. `open` is null until the client clock resolves. */
export function SpotCard({
  spot,
  open,
  distText,
}: {
  spot: Spot;
  open: boolean | null;
  distText: string | null;
}) {
  const { hydrated, isSaved, toggleSaved } = useKaap();
  return (
    <Link
      href={`/spots/${spot.id}`}
      className="flex cursor-pointer gap-[14px] rounded-[16px] border border-forest/12 bg-card p-3 text-ink shadow-(--shadow-card) transition-shadow duration-[120ms] hover:shadow-(--shadow-card-hover)"
    >
      <StripedThumb category={spot.category} className="size-[92px] flex-none rounded-[12px]">
        <ThumbLabel>photo: {spot.name.split("(")[0].trim()}</ThumbLabel>
      </StripedThumb>

      <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
        <div className="flex flex-wrap items-center gap-[7px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.5px] text-terracotta">
            {categoryLabel(spot.category)}
          </span>
          <span className="text-[11px] text-muted3">·</span>
          <span className="text-[11.5px] text-muted">{areaName(spot.area)}</span>
        </div>
        <div className="text-[17px] font-bold leading-[1.15]">{spot.name}</div>
        <div className="line-clamp-2 text-[13px] leading-[1.35] text-ink-mid">{spot.blurb}</div>
        <div className="mt-[3px] flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold">
            <Star size={12} className="fill-star text-star" aria-hidden />
            {spot.rating.toFixed(1)}{" "}
            <span className="font-normal text-muted3">({formatReviewCount(spot.reviewCount)})</span>
          </span>
          <OpenBadge open={open} />
          {distText && <span className="text-[12.5px] text-muted">{distText}</span>}
        </div>
      </div>

      <div className="flex flex-col items-end justify-between gap-2">
        <SaveHeart
          saved={hydrated && isSaved(spot.id)}
          onToggle={() => toggleSaved(spot.id)}
          name={spot.name}
        />
        <div className="text-right">
          <div className="text-[15px] font-extrabold text-forest">{bandSymbol(spot.priceBand)}</div>
          <div className="text-[11px] text-muted2">
            {spot.priceBand === 0 ? "free" : spot.priceEstimate}
          </div>
        </div>
      </div>
    </Link>
  );
}
