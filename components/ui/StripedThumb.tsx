import { CATEGORY_PALETTES } from "@/lib/data/spots";
import type { CSSProperties, ReactNode } from "react";

/**
 * Category-striped photo placeholder from the design handoff.
 * TODO: replace with real hosted images once photos exist (SPEC §7); this
 * component is the single swap point.
 */
export function StripedThumb({
  category,
  angle = 135,
  className = "",
  style,
  children,
}: {
  category: string;
  angle?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const [a, b] = CATEGORY_PALETTES[category] ?? ["#8a8570", "#63604f"];
  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${className}`}
      style={{
        backgroundImage: `repeating-linear-gradient(${angle}deg, ${a} 0 9px, ${b} 9px 18px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ThumbLabel({ children }: { children: ReactNode }) {
  return (
    <span className="p-[5px] text-center font-mono text-[9px] leading-[1.3] text-white/85">
      {children}
    </span>
  );
}
