"use client";

import { Heart } from "lucide-react";
import type { MouseEvent } from "react";

/** Circular save toggle used on spot cards. Stops propagation so tapping it doesn't open the card. */
export function SaveHeart({
  saved,
  onToggle,
  name,
}: {
  saved: boolean;
  onToggle: () => void;
  name: string;
}) {
  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle();
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
      aria-pressed={saved}
      className={`flex size-[34px] flex-none cursor-pointer items-center justify-center rounded-full border-none transition-all duration-150 ${
        saved ? "bg-terracotta text-white" : "bg-forest/8 text-muted3"
      }`}
    >
      <Heart size={16} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
