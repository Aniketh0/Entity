/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config) => {
    // Load .glsl shader sources as raw strings at build time.
    config.module.rules.push({ test: /\.glsl$/i, use: 'raw-loader' });
    return config;
  },
};

export default nextConfig;
