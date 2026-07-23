"use client";

import { Compass } from "lucide-react";
import { ACTIVITIES } from "@/lib/data/spots";

/**
 * Western Cape adventure chips (quad biking, paragliding, ...). Membership is
 * tag-based (see ACTIVITIES); chips with no matching spots stay hidden so a
 * not-yet-swept activity never renders a dead filter.
 */
export function ActivityChips({
  active,
  counts,
  onToggle,
}: {
  active: string | null;
  counts: Record<string, number>;
  onToggle: (key: string) => void;
}) {
  const available = ACTIVITIES.filter((a) => !a.hidden && (counts[a.key] ?? 0) > 0);
  if (!available.length) return null;
  return (
    <div className="mb-[6px]">
      <div className="mx-[2px] mb-2 flex items-center gap-[6px] text-[12px] font-bold uppercase tracking-[0.7px] text-sage">
        <Compass size={13} aria-hidden />
        Adventures across the Western Cape
      </div>
      <div className="hrail flex gap-2 overflow-x-auto pb-[10px]">
        {available.map((a) => {
          const isActive = active === a.key;
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => onToggle(a.key)}
              aria-pressed={isActive}
              className={`inline-flex flex-none cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-full border px-[14px] py-2 text-[13px] font-semibold ${
                isActive
                  ? "border-terracotta bg-terracotta text-white"
                  : "border-forest/18 bg-card text-ink-soft"
              }`}
            >
              {a.label}
              <span
                className={`rounded-full px-[6px] py-px text-[11px] font-bold ${
                  isActive ? "bg-white/22 text-white" : "bg-forest/9 text-muted"
                }`}
              >
                {counts[a.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
