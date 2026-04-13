import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** pdf-parse pulls pdfjs-dist + @napi-rs/canvas — keep native bits external on Vercel. */
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
