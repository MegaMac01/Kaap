"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { OpenBadge } from "@/components/ui/OpenBadge";
import { SaveHeart } from "@/components/ui/SaveHeart";
import { StripedThumb, ThumbLabel } from "@/components/ui/StripedThumb";
import { areaName, categoryLabel } from "@/lib/filters";
import { bandSymbol } from "@/lib/format";
import { isOpenAt } from "@/lib/hours";
import { useKaap } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import type { Spot } from "@/lib/types";

type Tab = "all" | "open" | "free";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open now" },
  { key: "free", label: "Free" },
];

// TODO P3: user-named custom lists (SPEC §5.4).
export function SavedView({ spots }: { spots: Spot[] }) {
  const { hydrated, savedIds, isSaved, toggleSaved } = useKaap();
  const now = useNow();
  const [tab, setTab] = useState<Tab>("all");

  const savedAll = useMemo(
    () => spots.filter((s) => hydrated && savedIds.includes(s.id)),
    [spots, savedIds, hydrated]
  );
  const shown = savedAll.filter((s) => {
    if (tab === "open") return now ? isOpenAt(s.hours, now) : true;
    if (tab === "free") return s.priceBand === 0;
    return true;
  });

  const countFor = (t: Tab) =>
    t === "all"
      ? savedAll.length
      : t === "open"
        ? savedAll.filter((s) => (now ? isOpenAt(s.hours, now) : false)).length
        : savedAll.filter((s) => s.priceBand === 0).length;

  return (
    <main className="mx-auto max-w-[960px] px-[22px] pb-[60px] pt-[22px]">
      <h1 className="mb-1 mt-[6px] font-display text-[clamp(26px,4vw,38px)] font-normal">
        Your lists
      </h1>
      <p className="mb-5 text-[14px] text-muted">
        {savedAll.length
          ? `${savedAll.length} ${savedAll.length === 1 ? "spot" : "spots"} saved`
          : "Tap the heart on any spot to build your list."}
      </p>

      <div className="mb-[22px] flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={active}
              className={`inline-flex cursor-pointer items-center gap-[7px] rounded-full border-none px-[15px] py-2 text-[13.5px] font-semibold ${
                active ? "bg-forest text-white" : "bg-card text-ink-soft"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-[6px] py-px text-[11px] font-bold ${
                  active ? "bg-white/22 text-white" : "bg-forest/9 text-muted"
                }`}
              >
                {countFor(t.key)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-[14px]">
        {shown.map((spot) => (
          <Link
            key={spot.id}
            href={`/spots/${spot.id}`}
            className="flex cursor-pointer gap-[14px] rounded-[16px] border border-forest/12 bg-card p-3 text-ink"
          >
            <StripedThumb category={spot.category} className="size-[92px] flex-none rounded-[12px]">
              <ThumbLabel>photo: {spot.name.split("(")[0].trim()}</ThumbLabel>
            </StripedThumb>
            <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
              <div className="text-[11px] font-bold uppercase tracking-[0.5px] text-terracotta">
                {categoryLabel(spot.category)} ·{" "}
                <span className="normal-case tracking-normal text-muted">{areaName(spot.area)}</span>
              </div>
              <div className="text-[17px] font-bold">{spot.name}</div>
              <div className="flex flex-wrap gap-3 text-[12.5px] text-ink-mid">
                <span className="inline-flex items-center gap-1">
                  <Star size={12} className="fill-star text-star" aria-hidden />
                  {spot.rating.toFixed(1)}
                </span>
                <OpenBadge open={now ? isOpenAt(spot.hours, now) : null} />
                <span className="font-bold text-forest">{bandSymbol(spot.priceBand)}</span>
              </div>
            </div>
            <SaveHeart saved={isSaved(spot.id)} onToggle={() => toggleSaved(spot.id)} name={spot.name} />
          </Link>
        ))}
      </div>

      {hydrated && savedAll.length === 0 && (
        <div className="px-5 py-[60px] text-center text-muted">
          <div className="mb-2 font-display text-[24px]">No saved spots yet</div>
          <div className="mb-[18px] text-[14px]">Tap the ♥ on any spot to build your list.</div>
          <Link
            href="/"
            className="inline-block rounded-full bg-forest px-[22px] py-[11px] text-[14px] font-semibold text-white"
          >
            Explore Cape Town
          </Link>
        </div>
      )}
    </main>
  );
}
