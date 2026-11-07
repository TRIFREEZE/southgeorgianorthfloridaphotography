import type { MetadataRoute } from "next";
import { isProductionDeployment } from "@/lib/env";
import { absoluteUrl } from "@/lib/seo";

/** Preview deployments are never indexed. Note: robots rules are not a security boundary. */
export default function robots(): MetadataRoute.Robots {
  if (!isProductionDeployment) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/book/thanks", "/story", "/client-gallery"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
