import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://crafthive.ru";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/main", "/auth-success"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
