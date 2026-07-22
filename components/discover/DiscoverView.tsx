"use client";

import { useMemo, useState } from "react";
import { DiscoverMap } from "@/components/discover/DiscoverMap";
import { CategoryChips } from "@/components/discover/CategoryChips";
import { CollectionsRail } from "@/components/discover/CollectionsRail";
import { FilterSortBar } from "@/components/discover/FilterSortBar";
import { SpotCard } from "@/components/discover/SpotCard";
import {
  DEFAULT_FILTERS,
  areaName,
  categoryCounts,
  distanceOf,
  filterSpots,
  listTitle,
  sortSpots,
  type DiscoverFilters,
} from "@/lib/filters";
import { formatDistanceKm } from "@/lib/geo";
import { isOpenAt } from "@/lib/hours";
import { useKaap } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import type { AreaId, CategoryFilter, SortKey, Spot } from "@/lib/types";

// Past ~50 spots the list needs paging (SPEC §7): render a page at a time
// and grow it on demand instead of mounting every card up front.
const PAGE_SIZE = 24;

export function DiscoverView({ spots }: { spots: Spot[] }) {
  const { profile, query, setQuery } = useKaap();
  const now = useNow();
  const [f, setF] = useState<Omit<DiscoverFilters, "query">>(DEFAULT_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filters: DiscoverFilters = useMemo(() => ({ ...f, query }), [f, query]);
  const origin = profile?.coords ?? null;

  const list = useMemo(
    () => sortSpots(filterSpots(spots, filters, { now, origin }), filters.sort, origin),
    [spots, filters, now, origin]
  );
  const counts = useMemo(() => categoryCounts(spots, filters), [spots, filters]);

  // Any change to filters/search starts back at page one, adjusted during
  // render (React's recommended pattern) rather than in an effect, so there's
  // no extra commit before the reset takes effect.
  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setVisibleCount(PAGE_SIZE);
  }
  const visible = list.slice(0, visibleCount);

  const toggleArea = (id: AreaId) => setF((p) => ({ ...p, area: p.area === id ? null : id }));
  const toggleCat = (key: CategoryFilter) => setF((p) => ({ ...p, cat: p.cat === key ? null : key }));
  const toggleCollection = (key: string) =>
    setF((p) => ({ ...p, collection: p.collection === key ? null : key, cat: null, area: null }));
  const clearFilters = () => {
    setF(DEFAULT_FILTERS);
    setQuery("");
  };

  const hour = now?.getHours();
  const tod = hour == null ? "day" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const firstName = profile?.name?.trim().split(/\s+/)[0];

  return (
    <main className="mx-auto max-w-[1200px] px-[22px] pb-[60px] pt-[22px]">
      <div className="mx-[2px] mb-[18px] mt-[2px]">
        <h1 className="font-display text-[clamp(26px,4vw,40px)] font-normal leading-[1.02]">
          Good {tod}
          {firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="mt-[6px] text-[14.5px] text-muted">
          Here&rsquo;s what&rsquo;s good around Cape Town right now.
        </p>
      </div>

      <div className="mx-[2px] mb-[10px] mt-1 flex items-baseline justify-between">
        <h2 className="text-[14px] font-bold uppercase tracking-[0.7px] text-sage">
          Curated collections
        </h2>
      </div>
      <CollectionsRail spots={spots} active={f.collection} onToggle={toggleCollection} />

      <div className="flex flex-wrap items-start gap-[26px]">
        <div className="sticky top-[84px] min-w-[290px] flex-[0_1_380px]">
          <DiscoverMap
            spots={list}
            activeArea={f.area}
            onToggleArea={toggleArea}
            hint={
              f.area
                ? `${areaName(f.area)} selected · ${list.length} spots`
                : `Tap an area to filter · ${list.length} spots`
            }
            onReset={clearFilters}
          />
        </div>

        <div className="min-w-[300px] flex-[1_1_460px]">
          <FilterSortBar
            openNow={f.openNow}
            freeOnly={f.freeOnly}
            sort={f.sort}
            hasLocation={!!origin}
            onToggleOpenNow={() => setF((p) => ({ ...p, openNow: !p.openNow }))}
            onToggleFreeOnly={() => setF((p) => ({ ...p, freeOnly: !p.freeOnly }))}
            onSort={(sort: SortKey) => setF((p) => ({ ...p, sort }))}
          />

          <CategoryChips active={f.cat} counts={counts} onToggle={toggleCat} />

          <div className="mx-[2px] mb-[14px] mt-3 flex items-baseline justify-between">
            <h2 className="font-display text-[clamp(22px,3vw,30px)] font-normal leading-[1.05]">
              {listTitle(filters)}
            </h2>
            <span className="whitespace-nowrap text-[13px] text-muted">
              {list.length} {list.length === 1 ? "spot" : "spots"}
            </span>
          </div>

          <div className="flex flex-col gap-[14px]">
            {visible.map((spot) => (
              <SpotCard
                key={spot.id}
                spot={spot}
                open={now ? isOpenAt(spot.hours, now) : null}
                distText={
                  origin && spot.coords ? formatDistanceKm(distanceOf(spot, origin)) : null
                }
              />
            ))}
          </div>

          {visibleCount < list.length && (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="cursor-pointer rounded-full border border-forest/20 bg-card px-6 py-3 text-[14px] font-semibold text-forest"
              >
                Show more ({list.length - visibleCount} left)
              </button>
            </div>
          )}

          {list.length === 0 && (
            <div className="px-5 py-[50px] text-center text-muted">
              <div className="mb-[6px] font-display text-[22px]">Nothing matches</div>
              <div className="mb-4 text-[14px]">Try loosening a filter or picking another area.</div>
              <button
                type="button"
                onClick={clearFilters}
                className="cursor-pointer rounded-full border-none bg-forest px-5 py-[10px] text-[13.5px] font-semibold text-white"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
