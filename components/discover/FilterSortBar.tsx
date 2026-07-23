"use client";

import { AREAS } from "@/lib/data/spots";
import type { AreaId, SortKey } from "@/lib/types";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "rec", label: "Recommended" },
  { key: "near", label: "Nearest" },
  { key: "rating", label: "Top rated" },
  { key: "price", label: "Price" },
];

/** Areas beyond the Cape Town metro, grouped separately in the picker. */
const REGION_IDS = new Set<AreaId>(["winelands", "overberg", "westcoast", "gardenroute"]);
const METRO = AREAS.filter((a) => !REGION_IDS.has(a.id));
const REGIONS = AREAS.filter((a) => REGION_IDS.has(a.id));

function toggleClass(on: boolean) {
  return `inline-flex flex-none cursor-pointer items-center gap-[6px] whitespace-nowrap rounded-full border px-[14px] py-2 text-[13px] font-semibold ${
    on ? "border-open bg-open-bg text-open" : "border-forest/18 bg-card text-ink-soft"
  }`;
}

export function FilterSortBar({
  area,
  openNow,
  freeOnly,
  sort,
  hasLocation,
  onArea,
  onToggleOpenNow,
  onToggleFreeOnly,
  onSort,
}: {
  area: AreaId | null;
  openNow: boolean;
  freeOnly: boolean;
  sort: SortKey;
  hasLocation: boolean;
  onArea: (id: AreaId | null) => void;
  onToggleOpenNow: () => void;
  onToggleFreeOnly: () => void;
  onSort: (key: SortKey) => void;
}) {
  return (
    // Mobile: one scrollable rail (wrapping stacks controls three rows deep
    // before any content); desktop has room to wrap.
    <div className="hrail mb-[14px] flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
      <select
        aria-label="Filter by area"
        value={area ?? ""}
        onChange={(e) => onArea((e.target.value || null) as AreaId | null)}
        className={`flex-none cursor-pointer whitespace-nowrap rounded-full border px-[13px] py-2 text-[13px] font-semibold ${
          area ? "border-forest bg-forest text-white" : "border-forest/18 bg-card text-ink-soft"
        }`}
      >
        <option value="">All areas</option>
        <optgroup label="Cape Town">
          {METRO.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Western Cape">
          {REGIONS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </optgroup>
      </select>
      <div className="mx-[2px] h-[22px] w-px flex-none bg-forest/15" />
      <button type="button" onClick={onToggleOpenNow} aria-pressed={openNow} className={toggleClass(openNow)}>
        <span className="text-[9px]">●</span> Open now
      </button>
      <button type="button" onClick={onToggleFreeOnly} aria-pressed={freeOnly} className={toggleClass(freeOnly)}>
        Free only
      </button>
      <div className="mx-[2px] h-[22px] w-px flex-none bg-forest/15" />
      {SORTS.map((s) => {
        const active = sort === s.key;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onSort(s.key)}
            title={
              s.key === "near" && !hasLocation
                ? "Allow location in onboarding to sort by distance"
                : undefined
            }
            className={`flex-none cursor-pointer whitespace-nowrap rounded-full border-none px-[13px] py-[7px] text-[13px] font-semibold ${
              active ? "bg-forest/12 text-ink" : "bg-transparent text-muted"
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
