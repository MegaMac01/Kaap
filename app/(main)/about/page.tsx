import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "What Kaap is, how spots are chosen, and where the data comes from.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-[640px] px-[22px] pb-[60px] pt-[26px]">
      <h1 className="mb-3 font-display text-[clamp(28px,4vw,38px)] font-normal leading-[1.05]">
        About Kaap
      </h1>
      <div className="flex flex-col gap-4 text-[15px] leading-[1.65] text-ink-soft">
        <p>
          Kaap is a guide to everything worth doing in Cape Town: restaurants, bars,
          outdoor adventures, classes, arts, family outings and the lowkey gems locals
          keep quiet. Every spot is curated by hand, priced honestly in Rand, and shows
          live opening hours in Cape Town time (SAST) wherever you are in the world.
        </p>
        <p>
          You can use Kaap without an account: your saved spots and interests stay on
          your device. Sign in and they sync across your devices instead. Your call.
        </p>
        <p>
          Prices are estimates to help you plan, not quotes. Hours come from the venues
          and are refreshed regularly, but a phone call before a special trip never
          hurts. Spot something wrong? We want to know.
        </p>
        <p className="text-[13.5px] text-muted">
          Read how we handle your data in our{" "}
          <Link href="/privacy" className="font-semibold text-forest underline">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
