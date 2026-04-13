import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** pdf-parse / pdfjs-dist pull optional native bits — keep external on the server bundle. */
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/icon.svg", permanent: false }];
  },
};

export default nextConfig;
