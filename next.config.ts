import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Client Router Cache: re-visiting a tab within the window is instant
    // (no server round-trip). Mutations call revalidatePath, so data stays fresh.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
};

export default nextConfig;
