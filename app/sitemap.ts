import type { MetadataRoute } from "next";
import { getSpots } from "@/lib/spots-repo";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const spots = await getSpots();
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    ...spots.map((s) => ({
      url: `${SITE_URL}/spots/${s.id}`,
      lastModified: new Date(s.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
