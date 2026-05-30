import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NubCal — nutrition journal",
    short_name: "NubCal",
    description: "Track macros and custom nutrients against your own targets.",
    start_url: "/today",
    display: "standalone",
    background_color: "#f5efe4",
    theme_color: "#1f6b43",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
