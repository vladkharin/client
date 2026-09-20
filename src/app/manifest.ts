import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CraftHive — Мессенджер нового поколения",
    short_name: "CraftHive",
    description:
      "Современный мессенджер с поддержкой голосовых и видеозвонков, групповых чатов и мгновенных сообщений.",
    start_url: "/",
    display: "standalone",
    background_color: "#121212",
    theme_color: "#6c5ce7",
    icons: [
      {
        src: "/globe.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
