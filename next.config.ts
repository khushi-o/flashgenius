import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** pdfjs-dist ships optional native canvas hooks — keep external on the server bundle. */
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
