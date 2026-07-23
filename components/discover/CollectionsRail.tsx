"use client";

import { Flower2, Gift, Heart, Sparkles, Sunset, Umbrella, type LucideIcon } from "lucide-react";
import { CATEGORY_PALETTES, COLLECTIONS } from "@/lib/data/spots";
import type { Spot } from "@/lib/types";

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  heart: Heart,
  gift: Gift,
  umbrella: Umbrella,
  sunset: Sunset,
  flower: Flower2,
};

/**
 * Photo-backed collection cards: each card wears the first member spot photo
 * with a dark gradient for text legibility; collections whose members have
 * no photos yet fall back to the old flat palette tile.
 */
export function CollectionsRail({
  spots,
  active,
  onToggle,
}: {
  spots: Spot[];
  active: string | null;
  onToggle: (key: string) => void;
}) {
  const byId = new Map(spots.map((s) => [s.id, s]));
  const freeSpots = spots.filter((s) => s.priceBand === 0);

  return (
    <div className="hrail mb-[18px] flex gap-3 overflow-x-auto pb-3">
      {COLLECTIONS.map((col) => {
        const isActive = active === col.key;
        const members = col.spotIds
          ? (col.spotIds.map((id) => byId.get(id)).filter(Boolean) as Spot[])
          : freeSpots;
        const count = members.length;
        const photo = members.find((m) => m.photos.length)?.photos[0];
        const Icon = ICONS[col.icon] ?? Sparkles;
        const [tile] = CATEGORY_PALETTES[col.paletteKey] ?? ["#8a8570"];
        return (
          <button
            key={col.key}
            type="button"
            onClick={() => onToggle(col.key)}
            aria-pressed={isActive}
            className={`relative flex min-h-[150px] flex-[0_0_210px] cursor-pointer flex-col justify-end gap-[3px] overflow-hidden rounded-[16px] p-[14px] text-left text-white ${
              isActive
                ? "shadow-(--shadow-card-hover) ring-[2.5px] ring-terracotta"
                : "shadow-(--shadow-card)"
            }`}
            style={{ background: tile }}
          >
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element -- see SpotPhoto
              <img
                src={`${photo}?w=400`}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/25 to-black/10"
            />
            <span
              className="absolute left-[12px] top-[12px] flex size-[30px] items-center justify-center rounded-[9px] text-white"
              style={{ background: isActive ? "#cf6a3f" : "rgba(0,0,0,0.35)" }}
            >
              <Icon size={15} />
            </span>
            <span className="relative text-[15.5px] font-bold leading-[1.15]">{col.label}</span>
            <span className="relative text-[12px] leading-[1.3] text-white/85">{col.desc}</span>
            <span className="relative mt-[2px] text-[11.5px] font-semibold text-white/75">
              {count} spots
            </span>
          </button>
        );
      })}
    </div>
  );
}
