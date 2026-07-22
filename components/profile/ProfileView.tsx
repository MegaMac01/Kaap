"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Flag,
  Heart,
  Info,
  MapPin,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { deleteAccount } from "@/lib/auth";
import { INTERESTS } from "@/lib/data/spots";
import { initialsOf } from "@/lib/format";
import { useKaap } from "@/lib/store";

// TODO P2: make the remaining rows functional (account management, units,
// list management).
const SETTINGS_ROWS: { icon: LucideIcon; label: string; href?: string }[] = [
  { icon: Settings, label: "Account & sign-in" },
  { icon: MapPin, label: "Location & distance units" },
  { icon: Heart, label: "Manage your lists" },
  { icon: Flag, label: "Privacy (POPIA) & data", href: "/privacy" },
  { icon: Info, label: "About Kaap", href: "/about" },
];

export function ProfileView() {
  const router = useRouter();
  const { profile, savedCount, hydrated, signOut, user } = useKaap();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const onDeleteAccount = async () => {
    if (
      deleting ||
      !window.confirm(
        "Delete your account? Your profile and saved lists will be permanently removed. This cannot be undone."
      )
    )
      return;
    setDeleting(true);
    const result = await deleteAccount();
    if (result.ok) {
      signOut(); // clears the local copy too
      router.replace("/onboarding");
      return;
    }
    setDeleteError(result.message);
    setDeleting(false);
  };

  const name = profile?.name || "Guest";
  const interests = INTERESTS.filter((i) => profile?.interests.includes(i.key));
  const stats = [
    { value: hydrated ? String(savedCount) : "0", label: "Saved" },
    { value: "0", label: "Visited" }, // TODO P3: "been there" tracking
    { value: "0", label: "Reviews" }, // TODO P3: first-party reviews
  ];

  return (
    <main className="mx-auto max-w-[640px] px-[22px] pb-[60px] pt-[26px]">
      <div className="mb-[26px] flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-forest font-display text-[24px] font-bold text-white">
          {initialsOf(name === "Guest" ? "You" : name)}
        </div>
        <div>
          <div className="font-display text-[28px] leading-none">{name}</div>
          <div className="mt-1 text-[13.5px] text-muted">
            {user?.email
              ? `Signed in as ${user.email}`
              : "Guest, your lists stay on this device until you sign in"}
          </div>
        </div>
      </div>

      <div className="mb-[26px] grid grid-cols-3 gap-3">
        {stats.map((st) => (
          <div
            key={st.label}
            className="rounded-[14px] border border-forest/12 bg-card p-4 text-center"
          >
            <div className="text-[26px] font-extrabold text-forest">{st.value}</div>
            <div className="mt-[2px] text-[12px] text-muted">{st.label}</div>
          </div>
        ))}
      </div>

      <h3 className="mb-[10px] text-[13px] font-bold uppercase tracking-[0.6px] text-muted2">
        Your interests
      </h3>
      <div className="mb-[26px] flex flex-wrap gap-2">
        {interests.map((i) => (
          <span
            key={i.key}
            className="rounded-full bg-forest/8 px-[14px] py-[7px] text-[13px] font-semibold text-forest"
          >
            {i.label}
          </span>
        ))}
        {interests.length === 0 && <span className="text-[13px] text-muted2">None picked yet</span>}
      </div>

      <div className="overflow-hidden rounded-[16px] border border-forest/12 bg-card">
        {SETTINGS_ROWS.map((row) => {
          const inner = (
            <>
              <div className="flex items-center gap-3">
                <row.icon size={16} className="w-[18px] text-muted2" aria-hidden />
                <span className="text-[14.5px] font-medium">{row.label}</span>
              </div>
              {row.href ? (
                <ChevronRight size={16} className="text-faint" aria-hidden />
              ) : (
                <span className="rounded-full bg-forest/9 px-2 py-px text-[11px] font-bold text-muted">
                  Soon
                </span>
              )}
            </>
          );
          const rowClass =
            "flex items-center justify-between border-b border-forest/8 px-[18px] py-[15px] last:border-b-0";
          return row.href ? (
            <Link key={row.label} href={row.href} className={`${rowClass} text-ink`}>
              {inner}
            </Link>
          ) : (
            <div key={row.label} className={rowClass}>
              {inner}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          signOut();
          router.replace("/onboarding");
        }}
        className="mt-[18px] w-full cursor-pointer rounded-[12px] border border-closed/40 bg-transparent p-[13px] text-[14px] font-semibold text-closed"
      >
        Sign out
      </button>

      {user && (
        <>
          <button
            type="button"
            onClick={onDeleteAccount}
            disabled={deleting}
            className="mt-3 w-full cursor-pointer rounded-[12px] border-none bg-transparent p-2 text-[12.5px] font-semibold text-muted2 underline disabled:opacity-60"
          >
            {deleting ? "Deleting your account…" : "Delete account & data"}
          </button>
          {deleteError && (
            <p role="alert" className="mt-2 text-center text-[13px] font-semibold text-closed">
              {deleteError}
            </p>
          )}
        </>
      )}
    </main>
  );
}
