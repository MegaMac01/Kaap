import Link from "next/link";

export const metadata = { title: "Not found" };

/** Branded 404, for both unmatched URLs and notFound() (e.g. unknown spot ids). */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-7 text-center">
      <div className="mb-6 flex items-baseline gap-[9px]">
        <span className="inline-block size-[11px] rounded-full bg-terracotta" />
        <span className="font-display text-[26px]">Kaap</span>
        <span className="text-[11px] font-semibold uppercase tracking-[2px] text-muted">
          Cape Town
        </span>
      </div>
      <h1 className="mb-2 font-display text-[clamp(30px,5vw,44px)] font-normal leading-[1.05]">
        This spot doesn&rsquo;t exist
      </h1>
      <p className="mb-7 max-w-[420px] text-[14.5px] leading-[1.6] text-muted">
        The page you&rsquo;re after has moved, closed down or never opened. The rest of
        Cape Town is still out there, though.
      </p>
      <Link
        href="/"
        className="rounded-full bg-forest px-[22px] py-[11px] text-[14px] font-semibold text-white"
      >
        Back to Discover
      </Link>
    </main>
  );
}
