import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** pdf-parse / pdfjs-dist pull optional native bits — keep external on the server bundle. */
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
