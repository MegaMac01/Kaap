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

export function CollectionsRail({
  spots,
  active,
  onToggle,
}: {
  spots: Spot[];
  active: string | null;
  onToggle: (key: string) => void;
}) {
  const freeCount = spots.filter((s) => s.priceBand === 0).length;
  return (
    <div className="hrail mb-[18px] flex gap-3 overflow-x-auto pb-3">
      {COLLECTIONS.map((col) => {
        const isActive = active === col.key;
        const count = col.spotIds?.length ?? freeCount;
        const Icon = ICONS[col.icon] ?? Sparkles;
        const [tile] = CATEGORY_PALETTES[col.paletteKey] ?? ["#8a8570"];
        return (
          <button
            key={col.key}
            type="button"
            onClick={() => onToggle(col.key)}
            aria-pressed={isActive}
            className={`flex min-h-[128px] flex-[0_0_210px] cursor-pointer flex-col gap-[6px] rounded-[16px] p-4 text-left ${
              isActive
                ? "border-2 border-forest bg-forest text-white"
                : "border border-forest/14 bg-card text-ink"
            }`}
          >
            <span
              className="mb-[2px] flex size-[34px] items-center justify-center rounded-[10px] text-white"
              style={{ background: isActive ? "rgba(255,255,255,0.16)" : tile }}
            >
              <Icon size={17} />
            </span>
            <span className="text-[15px] font-bold leading-[1.15]">{col.label}</span>
            <span className="text-[12px] leading-[1.3] opacity-75">{col.desc}</span>
            <span className="mt-auto text-[11.5px] font-semibold opacity-80">{count} spots</span>
          </button>
        );
      })}
    </div>
  );
}
