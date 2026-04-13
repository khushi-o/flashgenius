import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** pdf-parse / pdfjs-dist pull optional native bits — keep external on the server bundle. */
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  /** Ensure pdf.worker.mjs ships with the serverless trace (used as file: workerSrc). */
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.mjs",
    ],
  },
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/icon.svg", permanent: false }];
  },
};

export default nextConfig;
