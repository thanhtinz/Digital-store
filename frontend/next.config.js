/* eslint-disable @typescript-eslint/no-var-requires */
const withTM = require('next-transpile-modules')([
  '@fullcalendar/common',
  '@fullcalendar/daygrid',
  '@fullcalendar/interaction',
  '@fullcalendar/list',
  '@fullcalendar/react',
  '@fullcalendar/timegrid',
  '@fullcalendar/timeline',
]);

// Backend Express chạy nội bộ cùng container (chế độ gộp 1 service).
// Next.js proxy /api, /admin, /static sang đây -> same-origin, KHÔNG cần CORS.
const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:4000';

module.exports = withTM({
  swcMinify: false,
  trailingSlash: true,
  // Build gọn cho Docker/VPS/Railway (chỉ copy file cần thiết khi chạy).
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${BACKEND_INTERNAL_URL}/api/:path*` },
      { source: '/admin', destination: `${BACKEND_INTERNAL_URL}/admin` },
      { source: '/admin/:path*', destination: `${BACKEND_INTERNAL_URL}/admin/:path*` },
      { source: '/static/:path*', destination: `${BACKEND_INTERNAL_URL}/static/:path*` },
      { source: '/healthz', destination: `${BACKEND_INTERNAL_URL}/healthz` },
      { source: '/sitemap.xml', destination: `${BACKEND_INTERNAL_URL}/sitemap.xml` },
      { source: '/robots.txt', destination: `${BACKEND_INTERNAL_URL}/robots.txt` },
    ];
  },
  env: {
    // HOST
    HOST_API_KEY: process.env.NEXT_PUBLIC_HOST_API || 'http://localhost:3000',
    // MAPBOX
    MAPBOX_API: '',
    // FIREBASE
    FIREBASE_API_KEY: '',
    FIREBASE_AUTH_DOMAIN: '',
    FIREBASE_PROJECT_ID: '',
    FIREBASE_STORAGE_BUCKET: '',
    FIREBASE_MESSAGING_SENDER_ID: '',
    FIREBASE_APPID: '',
    FIREBASE_MEASUREMENT_ID: '',
    // AWS COGNITO
    AWS_COGNITO_USER_POOL_ID: '',
    AWS_COGNITO_CLIENT_ID: '',
    // AUTH0
    AUTH0_DOMAIN: '',
    AUTH0_CLIENT_ID: '',
  },
});
