import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://cocokerja.vercel.app",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
