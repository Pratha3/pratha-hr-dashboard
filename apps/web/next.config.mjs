/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ems/shared-types', '@ems/validation'],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:5001/api/v1/:path*'
      }
    ];
  }
};

export default nextConfig;
