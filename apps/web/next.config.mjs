/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ems/shared-types', '@ems/validation'],
  async rewrites() {
    let rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    const baseUrl = rawUrl.replace(/\/api\/v1\/?$/, '');
    return [
      {
        source: '/api/v1/:path*',
        destination: `${baseUrl}/api/v1/:path*`
      }
    ];
  }
};

export default nextConfig;
