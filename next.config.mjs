/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove the outputFileTracing setting that's causing warnings
  experimental: {
    // Add other experimental settings here if needed
  },
  // Add handling for PWA files
  webpack: (config) => {
    // Prevent bundling errors with browser-specific modules
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
      dns: false,
    };
    
    return config;
  },
  // Disable server-side rendering for specific pages that rely heavily on browser APIs
  // This makes them fully client-side rendered
  reactStrictMode: true,
  serverRuntimeConfig: {
    // Server-only config
  },
  publicRuntimeConfig: {
    // Config available on both server and client
  }
};

export default nextConfig;