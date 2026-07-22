import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth callback, API and per-user pages have no crawlable content.
      disallow: ["/auth/", "/api/", "/saved", "/profile", "/onboarding"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
