/** @type {import('next').NextConfig} */
const nextConfig = {
  // Browser-only app: `next build` writes a static site to ./out, served by nginx.
  // No Node server, no server-side calls: the VM needs no outbound network access.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/supabase/functions/**"],
    }
    return config
  },
}

export default nextConfig
