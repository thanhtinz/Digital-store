/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    // Product/banner images are served from the app itself (/api/media/*) or
    // external CDNs configured by the admin. Allow any https remote host.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  experimental: {
    serverActions: { bodySizeLimit: '8mb' },
    instrumentationHook: true, // background scheduler (auto coupons)
  },
};

export default nextConfig;
