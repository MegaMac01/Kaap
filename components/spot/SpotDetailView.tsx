"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Globe, Heart, MapPin, Phone, Star } from "lucide-react";
import { OpenBadge } from "@/components/ui/OpenBadge";
import { SpotMap } from "@/components/spot/SpotMap";
import { StripedThumb, ThumbLabel } from "@/components/ui/StripedThumb";
import { SAMPLE_REVIEWS } from "@/lib/data/spots";
import { areaName, categoryLabel, distanceOf } from "@/lib/filters";
import {
  bandSymbol,
  bandWord,
  directionsUrl,
  fallbackBookingUrl,
  fallbackSearchUrl,
  formatReviewCount,
} from "@/lib/format";
import { formatDistanceKm } from "@/lib/geo";
import { DAY_LABELS, formatIntervals, isOpenAt, todayHoursLabel, todayKey } from "@/lib/hours";
import { useKaap } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { DAY_KEYS, type Spot } from "@/lib/types";

const AVATAR_COLORS = ["#2c4a3b", "#cf6a3f", "#7a4b6b"];

function ctaLabel(spot: Spot): string {
  if (spot.category === "eat" || spot.category === "bars") return "Reserve a table";
  if (spot.category === "classes") return "Book a spot";
  if (spot.priceBand === 0) return "How to get there";
  return "Book tickets";
}

export function SpotDetailView({ spot, similar }: { spot: Spot; similar: Spot[] }) {
  const { hydrated, isSaved, toggleSaved, profile } = useKaap();
  const now = useNow();
  const [reviewNote, setReviewNote] = useState(false);

  const open = now ? isOpenAt(spot.hours, now) : null;
  const today = now ? todayKey(now) : null;
  const origin = profile?.coords ?? null;
  const saved = hydrated && isSaved(spot.id);
  const shortName = spot.name.split("(")[0].trim();

  return (
    <main className="mx-auto max-w-[1000px] px-[22px] pb-20 pt-4">
      <Link
        href="/"
        className="mb-[6px] inline-flex items-center gap-[6px] py-2 text-[14px] font-semibold text-forest"
      >
        <ArrowLeft size={15} /> Back
      </Link>

      {/* Gallery: TODO real photos (SPEC §7); grid stays, tiles become <Image> */}
      <div className="grid h-[clamp(220px,38vw,380px)] grid-cols-[2fr_1fr] gap-[10px]">
        <StripedThumb
          category={spot.category}
          angle={135}
          className="!items-end !justify-start rounded-[18px] p-[14px]"
        >
          <span className="rounded-[6px] bg-black/28 px-[10px] py-[5px] font-mono text-[12px] text-white/90">
            photo: {shortName}
          </span>
        </StripedThumb>
        <div className="grid grid-rows-2 gap-[10px]">
          {[45, 100].map((angle, i) => (
            <StripedThumb key={angle} category={spot.category} angle={angle} className="rounded-[14px]">
              <ThumbLabel>photo {i + 2}</ThumbLabel>
            </StripedThumb>
          ))}
        </div>
      </div>

      <div className="mt-[22px] flex flex-wrap items-start gap-[30px]">
        {/* Content column */}
        <div className="min-w-[280px] flex-[1_1_440px]">
          <div className="mb-[6px] text-[12px] font-bold uppercase tracking-[0.7px] text-terracotta">
            {categoryLabel(spot.category)} · {areaName(spot.area)}
          </div>
          <h1 className="mb-3 font-display text-[clamp(30px,5vw,46px)] font-normal leading-[1.02]">
            {spot.name}
          </h1>
          <div className="mb-[22px] flex flex-wrap items-center gap-4 text-[13.5px] text-ink-mid">
            <span className="inline-flex items-center gap-1 font-bold text-ink">
              <Star size={13} className="fill-star text-star" aria-hidden />
              {spot.rating.toFixed(1)}{" "}
              <span className="font-normal text-muted2">
                · {formatReviewCount(spot.reviewCount)} reviews
                {spot.googlePlaceId ? " · via Google" : ""}
              </span>
            </span>
            <OpenBadge open={open} className="!text-[13.5px]" />
            {origin && spot.coords && (
              <span>{formatDistanceKm(distanceOf(spot, origin))} away</span>
            )}
          </div>

          <p className="mb-6 max-w-[620px] text-[16px] leading-[1.65] text-ink-soft">{spot.blurb}</p>

          <div className="mb-7 flex flex-wrap gap-2">
            {spot.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-forest/8 px-[13px] py-[6px] text-[12.5px] font-semibold text-forest"
              >
                {t}
              </span>
            ))}
          </div>

          <h3 className="mb-[10px] text-[14px] font-bold uppercase tracking-[0.6px] text-sage">
            Opening hours
          </h3>
          <div className="mb-7 max-w-[380px] overflow-hidden rounded-[14px] border border-forest/12 bg-card">
            {DAY_KEYS.map((day, i) => {
              const intervals = spot.hours[day];
              const closed = intervals.length === 0;
              const isToday = day === today;
              return (
                <div
                  key={day}
                  className={`flex justify-between px-[15px] py-[10px] text-[13.5px] ${
                    i < 6 ? "border-b border-forest/8" : ""
                  } ${isToday ? "bg-terracotta/8" : ""}`}
                >
                  <span className={isToday ? "font-bold" : "font-medium"}>{DAY_LABELS[day]}</span>
                  <span className={`whitespace-nowrap ${closed ? "text-closed" : "text-ink-soft2"}`}>
                    {formatIntervals(intervals)}
                  </span>
                </div>
              );
            })}
          </div>

          {spot.coords && (
            <>
              <h3 className="mb-[10px] text-[14px] font-bold uppercase tracking-[0.6px] text-sage">
                Where to find it
              </h3>
              <div className="mb-7 max-w-[620px]">
                <SpotMap lat={spot.coords.lat} lng={spot.coords.lng} name={spot.name} />
              </div>
            </>
          )}

          <div className="mb-[14px] flex items-center justify-between">
            <h3 className="text-[14px] font-bold uppercase tracking-[0.6px] text-sage">Reviews</h3>
            {/* TODO P3: first-party reviews with accounts + moderation (SPEC §6.4) */}
            <button
              type="button"
              onClick={() => setReviewNote(true)}
              className="cursor-pointer rounded-full border border-terracotta/40 bg-transparent px-[14px] py-[6px] text-[13px] font-semibold text-terracotta"
            >
              Write a review
            </button>
          </div>
          {reviewNote && (
            <p role="status" className="mb-3 text-[13px] font-semibold text-muted">
              Writing reviews is coming soon. The ones below are sample content while we
              get there.
            </p>
          )}
          <div className="flex flex-col gap-4">
            {SAMPLE_REVIEWS.map((rv, i) => (
              <div key={rv.name} className="flex gap-3">
                <div
                  className="flex size-10 flex-none items-center justify-center rounded-full text-[14px] font-bold text-white"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                >
                  {rv.initials}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-bold">{rv.name}</span>
                    <span className="text-[12px] text-star">{"★★★★★".slice(0, rv.rating)}</span>
                    <span className="text-[12px] text-muted3">· {rv.when}</span>
                  </div>
                  <p className="mt-[5px] text-[14px] leading-[1.55] text-ink-soft2">{rv.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sticky action card */}
        <div className="sticky top-[84px] min-w-[250px] flex-[0_1_300px]">
          <div className="rounded-[18px] border border-forest/14 bg-card p-5 shadow-(--shadow-action)">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[26px] font-extrabold text-forest">
                {bandSymbol(spot.priceBand)}
              </span>
              <span className="text-[12px] text-muted2">{bandWord(spot.priceBand)}</span>
            </div>
            <div className="mb-4 text-[13.5px] text-ink-mid">
              {spot.priceBand === 0 ? "Free, go anytime" : spot.priceEstimate}
            </div>

            <a
              href={spot.bookingUrl ?? fallbackBookingUrl(spot.name)}
              target="_blank"
              rel="noreferrer"
              className="mb-[10px] block rounded-[12px] bg-terracotta p-[13px] text-center text-[14.5px] font-bold text-white hover:bg-terracotta-hover hover:text-white"
            >
              {ctaLabel(spot)}
            </a>
            <a
              href={directionsUrl(spot.name, spot.googlePlaceId)}
              target="_blank"
              rel="noreferrer"
              className="mb-[10px] block rounded-[12px] bg-forest p-[13px] text-center text-[14.5px] font-bold text-white hover:text-white"
            >
              Get directions ↗
            </a>
            <button
              type="button"
              onClick={() => toggleSaved(spot.id)}
              className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-forest/20 p-3 text-[14px] font-bold text-forest ${
                saved ? "bg-terracotta/12" : "bg-card"
              }`}
            >
              <Heart size={15} fill={saved ? "#cf6a3f" : "none"} className={saved ? "text-terracotta" : ""} />
              {saved ? "Saved to your list" : "Save"}
            </button>

            <div className="mt-4 flex flex-col gap-[9px] border-t border-forest/10 pt-[14px] text-[13px] text-ink-soft2">
              <div className="flex gap-[9px]">
                <Clock size={15} className="flex-none text-muted2" aria-hidden />
                <span>{now ? todayHoursLabel(spot.hours, now) : "–"}</span>
              </div>
              {spot.address && (
                <div className="flex gap-[9px]">
                  <MapPin size={15} className="flex-none text-muted2" aria-hidden />
                  <span>{spot.address}</span>
                </div>
              )}
              {spot.phone && (
                <div className="flex gap-[9px]">
                  <Phone size={15} className="flex-none text-muted2" aria-hidden />
                  <a href={`tel:${spot.phone.replace(/\s+/g, "")}`}>{spot.phone}</a>
                </div>
              )}
              <div className="flex gap-[9px]">
                <Globe size={15} className="flex-none text-muted2" aria-hidden />
                <a href={spot.website ?? fallbackSearchUrl(spot.name)} target="_blank" rel="noreferrer">
                  Website
                </a>
              </div>
            </div>

            {/* Freshness (SPEC §8): prices are guidance, show when facts were checked. */}
            <p className="mt-[14px] border-t border-forest/10 pt-3 text-[11.5px] leading-[1.5] text-muted3">
              Prices are estimates. Hours &amp; details last checked{" "}
              {new Date(spot.updatedAt).toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {spot.googlePlaceId ? " via Google" : ""}
              .
            </p>
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <>
          <h3 className="mb-[14px] mt-9 text-[14px] font-bold uppercase tracking-[0.6px] text-sage">
            More like this
          </h3>
          <div className="hrail flex gap-[14px] overflow-x-auto pb-[10px]">
            {similar.map((sp) => (
              <Link
                key={sp.id}
                href={`/spots/${sp.id}`}
                className="flex-[0_0_240px] cursor-pointer overflow-hidden rounded-[16px] border border-forest/12 bg-card text-ink"
              >
                <StripedThumb category={sp.category} angle={120} className="h-[120px] w-full">
                  <ThumbLabel>photo: {sp.name.split("(")[0].trim()}</ThumbLabel>
                </StripedThumb>
                <div className="p-3">
                  <div className="mb-[3px] text-[11px] font-bold uppercase tracking-[0.5px] text-terracotta">
                    {areaName(sp.area)}
                  </div>
                  <div className="mb-[5px] text-[15px] font-bold leading-[1.15]">{sp.name}</div>
                  <div className="flex gap-[10px] text-[12.5px] text-ink-mid">
                    <span className="inline-flex items-center gap-1">
                      <Star size={11} className="fill-star text-star" aria-hidden />
                      {sp.rating.toFixed(1)}
                    </span>
                    <span className="font-bold text-forest">{bandSymbol(sp.priceBand)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
