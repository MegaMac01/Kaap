import { DiscoverView } from "@/components/discover/DiscoverView";
import { getSpots } from "@/lib/spots-repo";

// ISR: pick up admin edits (hours, prices, new spots) without a redeploy.
export const revalidate = 300;

export default async function DiscoverPage() {
  const spots = await getSpots();
  return <DiscoverView spots={spots} />;
}
