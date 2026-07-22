"use client";

import type { SortKey } from "@/lib/types";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "rec", label: "Recommended" },
  { key: "near", label: "Nearest" },
  { key: "rating", label: "Top rated" },
  { key: "price", label: "Price" },
];

function toggleClass(on: boolean) {
  return `inline-flex cursor-pointer items-center gap-[6px] rounded-full border px-[14px] py-2 text-[13px] font-semibold ${
    on ? "border-open bg-open-bg text-open" : "border-forest/18 bg-card text-ink-soft"
  }`;
}

export function FilterSortBar({
  openNow,
  freeOnly,
  sort,
  hasLocation,
  onToggleOpenNow,
  onToggleFreeOnly,
  onSort,
}: {
  openNow: boolean;
  freeOnly: boolean;
  sort: SortKey;
  hasLocation: boolean;
  onToggleOpenNow: () => void;
  onToggleFreeOnly: () => void;
  onSort: (key: SortKey) => void;
}) {
  return (
    <div className="mb-[14px] flex flex-wrap items-center gap-2">
      <button type="button" onClick={onToggleOpenNow} aria-pressed={openNow} className={toggleClass(openNow)}>
        <span className="text-[9px]">●</span> Open now
      </button>
      <button type="button" onClick={onToggleFreeOnly} aria-pressed={freeOnly} className={toggleClass(freeOnly)}>
        Free only
      </button>
      <div className="mx-[2px] h-[22px] w-px bg-forest/15" />
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
            className={`cursor-pointer rounded-full border-none px-[13px] py-[7px] text-[13px] font-semibold ${
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
