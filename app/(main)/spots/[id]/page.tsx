import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SpotDetailView } from "@/components/spot/SpotDetailView";
import { SPOTS } from "@/lib/data/spots";
import { getSpot, getSpots } from "@/lib/spots-repo";
import { areaName, categoryLabel } from "@/lib/filters";

// ISR: pick up admin edits (hours, prices, new spots) without a redeploy.
export const revalidate = 300;

export async function generateStaticParams() {
  return SPOTS.map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const spot = await getSpot(id);
  if (!spot) return { title: "Spot" };
  const description = `${categoryLabel(spot.category)} in ${areaName(spot.area)} — ${spot.blurb}`;
  return {
    title: spot.name,
    description,
    openGraph: { title: spot.name, description },
  };
}

export default async function SpotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const spots = await getSpots();
  const spot = spots.find((s) => s.id === id);
  if (!spot) notFound();

  const similar = spots.filter((s) => s.category === spot.category && s.id !== spot.id).slice(0, 4);
  return <SpotDetailView spot={spot} similar={similar} />;
}
