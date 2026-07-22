"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useKaap } from "@/lib/store";
import { initialsOf } from "@/lib/format";

const navBase =
  "inline-flex cursor-pointer items-center gap-[7px] rounded-full border-none px-[14px] py-2 text-[14px] font-semibold";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, savedCount, hydrated, query, setQuery } = useKaap();

  const discoverActive = pathname === "/" || pathname.startsWith("/spots");
  const savedActive = pathname === "/saved";
  const profileActive = pathname === "/profile";

  return (
    <header className="sticky top-0 z-30 border-b border-forest/12 bg-[rgba(239,232,216,0.92)] backdrop-blur-[10px]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-4 px-[22px] py-[13px]">
        <Link href="/" className="mr-auto flex items-baseline gap-[9px]">
          <span className="inline-block size-[11px] translate-y-px rounded-full bg-terracotta" />
          <span className="font-display text-[25px] leading-none text-ink">Kaap</span>
        </Link>

        <div className="flex min-w-[180px] max-w-[360px] flex-1 items-center gap-2 rounded-full border border-forest/15 bg-card px-[14px] py-2">
          <Search size={14} className="text-muted2" aria-hidden />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              // Search drives the Discover list, jump there if elsewhere.
              if (pathname !== "/") router.push("/");
            }}
            placeholder="Search spots, areas, vibes…"
            aria-label="Search spots, areas and vibes"
            className="w-full border-none bg-transparent text-[14px] text-ink outline-none placeholder:text-muted2"
          />
        </div>

        <nav className="flex items-center gap-[5px]">
          <Link
            href="/"
            className={`${navBase} ${discoverActive ? "bg-forest text-white" : "bg-transparent text-ink-soft"}`}
          >
            Discover
          </Link>
          <Link
            href="/saved"
            className={`${navBase} ${savedActive ? "bg-forest text-white" : "bg-transparent text-ink-soft"}`}
          >
            Saved
            <span
              className={`min-w-[18px] rounded-full px-[6px] py-px text-center text-[11px] font-bold text-white ${
                savedActive ? "bg-white/22" : "bg-terracotta"
              }`}
            >
              {hydrated ? savedCount : 0}
            </span>
          </Link>
          <Link
            href="/profile"
            title="Profile"
            className={`ml-[2px] flex size-[38px] items-center justify-center rounded-full border-2 bg-forest text-[13px] font-bold text-white ${
              profileActive ? "border-terracotta" : "border-transparent"
            }`}
          >
            {hydrated ? initialsOf(profile?.name || "You") : "Y"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
