import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms that apply when you use Kaap.",
};

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "What Kaap is",
    body: "Kaap is an informational guide to places and activities in Cape Town. We curate spots, prices and opening hours in good faith, but we do not own or operate the venues listed and we are not a booking agent.",
  },
  {
    heading: "Accuracy",
    body: "Hours, prices and other details can change without notice. Price bands and estimates are there to help you plan, not quotes. Check with the venue before making a special trip, booking, or travelling far.",
  },
  {
    heading: "Your account",
    body: "You can use Kaap without an account. If you create one, keep your sign-in method secure; you are responsible for activity on your account. You can delete your account at any time from your profile page.",
  },
  {
    heading: "Acceptable use",
    body: "Do not misuse the service: no scraping at scale, no attempting to access other people's data, no using Kaap for anything unlawful.",
  },
  {
    heading: "Liability",
    body: "Kaap is provided as is, to the maximum extent permitted by South African law. We are not liable for losses arising from inaccurate listings, venue closures, or your visits to listed venues.",
  },
  {
    heading: "Changes",
    body: "We may update these terms as the product evolves. Material changes will be announced in the app. Continued use after a change means you accept the updated terms.",
  },
  {
    heading: "Law",
    body: "These terms are governed by the laws of the Republic of South Africa.",
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-[640px] px-[22px] pb-[60px] pt-[26px]">
      <h1 className="mb-2 font-display text-[clamp(28px,4vw,38px)] font-normal leading-[1.05]">
        Terms of use
      </h1>
      <p className="mb-7 text-[14px] text-muted">
        The plain-language rules for using Kaap. See also our{" "}
        <Link href="/privacy" className="font-semibold text-forest underline">
          privacy policy
        </Link>
        .
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
