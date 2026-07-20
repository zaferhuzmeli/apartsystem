import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
};

export default nextConfig;

// Yerel `next dev`'de Cloudflare bindinglerini (D1, secrets) etkinleştirir.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
