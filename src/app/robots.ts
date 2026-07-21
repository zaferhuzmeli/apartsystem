import type { MetadataRoute } from "next";

// Tüm site aramaya kapalı — hiçbir sayfa indexlenmesin.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
