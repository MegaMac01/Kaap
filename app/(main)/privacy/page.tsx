import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy (POPIA)",
  description: "How Kaap handles your personal information under POPIA.",
};

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "Guest mode: nothing leaves your device",
    body: "Without an account, your name, interests and saved spots live only in your browser's local storage. We never see them, and clearing your browser data removes them completely.",
  },
  {
    heading: "Your location stays on your phone",
    body: "If you grant location access, it is used solely to sort spots by distance, on your device. Your coordinates are never sent to our servers, stored remotely, or shared with anyone. You can decline and everything still works.",
  },
  {
    heading: "With an account: the minimum to sync",
    body: "If you sign in, we store your email address, name, interests and saved spots so they follow you across devices. That's the whole list. You can sign out at any time, which clears the local copy.",
  },
  {
    heading: "No ads, no tracking, no selling data",
    body: "Kaap has no third-party advertising or analytics trackers, and we do not sell or share personal information with third parties.",
  },
  {
    heading: "Your POPIA rights",
    body: "Under the Protection of Personal Information Act you have the right to access, correct and erase your personal information. Everything we hold about you is visible in the app itself, and \"Delete account & data\" on your profile page permanently removes your account, profile and saved lists from our systems, immediately and self-serve.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[640px] px-[22px] pb-[60px] pt-[26px]">
      <h1 className="mb-2 font-display text-[clamp(28px,4vw,38px)] font-normal leading-[1.05]">
        Privacy &amp; your data
      </h1>
      <p className="mb-7 text-[14px] text-muted">
        The short, honest version — written to comply with POPIA (South Africa&rsquo;s
        Protection of Personal Information Act).
      </p>
      <div className="flex flex-col gap-6">
        {SECTIONS.map((s) => (
          <section key={s.heading}>
            <h2 className="mb-[6px] text-[15px] font-bold text-ink">{s.heading}</h2>
            <p className="text-[14.5px] leading-[1.65] text-ink-soft">{s.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
