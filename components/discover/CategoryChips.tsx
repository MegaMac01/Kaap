"use client";

import { CATEGORIES } from "@/lib/data/spots";
import type { CategoryFilter } from "@/lib/types";

export function CategoryChips({
  active,
  counts,
  onToggle,
}: {
  active: CategoryFilter | null;
  counts: Record<string, number>;
  onToggle: (key: CategoryFilter) => void;
}) {
  return (
    <div className="hrail mb-[6px] flex gap-2 overflow-x-auto pb-[10px]">
      {CATEGORIES.map((c) => {
        const isActive = active === c.key;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onToggle(c.key)}
            aria-pressed={isActive}
            className={`inline-flex flex-none cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-full border px-[14px] py-2 text-[13px] font-semibold ${
              isActive ? "border-forest bg-forest text-white" : "border-forest/18 bg-card text-ink-soft"
            }`}
          >
            {c.label}
            <span
              className={`rounded-full px-[6px] py-px text-[11px] font-bold ${
                isActive ? "bg-white/22 text-white" : "bg-forest/9 text-muted"
              }`}
            >
              {counts[c.key] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
