import type { MetadataRoute } from "next";
import { isProductionSite } from "@/config/site";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  /*
   * Preview and local builds are closed to crawlers entirely. They are
   * byte-identical copies of the site on a different host, which is the
   * textbook way to split your own ranking between two URLs.
   */
  if (!isProductionSite) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Per-user and transactional routes have nothing crawlable in them.
        disallow: ["/api/", "/project-pack/", "/my-projects", "/plan"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
