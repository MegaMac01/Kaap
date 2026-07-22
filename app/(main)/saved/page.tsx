import type { Metadata } from "next";
import { SavedView } from "@/components/saved/SavedView";
import { getSpots } from "@/lib/spots-repo";

export const metadata: Metadata = { title: "Saved" };

// ISR: pick up admin edits (hours, prices, new spots) without a redeploy.
export const revalidate = 300;

export default async function SavedPage() {
  const spots = await getSpots();
  return <SavedView spots={spots} />;
}
