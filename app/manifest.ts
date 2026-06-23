import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NubCal — nutrition journal",
    short_name: "NubCal",
    description: "Track macros and custom nutrients against your own targets.",
    // Launch straight into the unified camera — the app is opened mainly from
    // the iOS Action Button to capture. Long-press shortcuts reach Today.
    start_url: "/scan",
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
    shortcuts: [
      {
        name: "Scan or snap",
        short_name: "Scan",
        url: "/scan",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Today",
        short_name: "Today",
        url: "/today",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
