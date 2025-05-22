/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
    // ... other Next.js configs
    publicRuntimeConfig: { // Available on both client and server, usually for small configs
      someConfigValue: process.env.NEXT_PUBLIC_SOME_ENV_VAR,
    },
    webpack: (config, { isServer, buildId, dev, config: { distDir } }) => {
      // Access your custom build target here
      const BUILD_TARGET = process.env.BUILD_TARGET || 'development';
  
      if (BUILD_TARGET === 'staging') {
        console.log('Applying staging-specific webpack config...');
        // e.g., add a specific plugin, or change a loader rule
      }
  
      // Always return the modified config
      return config;
    },
};

export default nextConfig;
