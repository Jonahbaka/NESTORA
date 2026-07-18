import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isLocalRuntime } from './lib/server/demo-environment.js';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const localRuntime = isLocalRuntime();

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  {
    key: 'Content-Security-Policy',
    value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; media-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self';${localRuntime ? '' : ' upgrade-insecure-requests;'}`,
  },
];
if (!localRuntime) securityHeaders.splice(6, 0, { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' });

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NESTORA_NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  compress: true,
  devIndicators: false,
  outputFileTracingRoot: projectRoot,
  serverExternalPackages: ['pdfkit'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
