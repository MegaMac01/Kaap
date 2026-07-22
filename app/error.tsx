"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // Fire-and-forget report so crashes appear in the server logs (SPEC §10).
    fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        stack: error.stack,
        url: window.location.href,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-7 text-center">
      <div className="mb-6 flex items-baseline gap-[9px]">
        <span className="inline-block size-[11px] rounded-full bg-terracotta" />
        <span className="font-display text-[26px]">Kaap</span>
      </div>
      <h1 className="mb-2 font-display text-[clamp(28px,5vw,40px)] font-normal leading-[1.05]">
        Something went sideways
      </h1>
      <p className="mb-7 max-w-[420px] text-[14.5px] leading-[1.6] text-muted">
        An unexpected error stopped this page from loading. It&rsquo;s us, not you.
        Try again in a moment.
      </p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="cursor-pointer rounded-full border-none bg-forest px-[22px] py-[11px] text-[14px] font-semibold text-white"
      >
        Try again
      </button>
    </main>
  );
}
