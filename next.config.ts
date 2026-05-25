import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql"],
};

export default nextConfig;
