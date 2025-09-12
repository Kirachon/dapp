import webpackModule from 'next/dist/compiled/webpack/webpack.js';

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client'],
  webpack: (config, { isServer }) => {
    // Completely exclude locked onboarding directory from webpack processing
    config.module.rules.push({
      test: /\.(tsx?|jsx?)$/,
      exclude: [
        /node_modules/,
        /src\/app\/onboarding\//, // Exclude locked onboarding directory
        /src\/app\/onboarding-locked\//, // Exclude locked backup
        /src\/app\/onboarding-temp-disabled\//, // Exclude temp disabled
        /src\/app\/onboarding-locked-temp\//, // Exclude temp locked
      ],
    });

    // Add module resolution for locked directories
    config.resolve.alias = {
      ...config.resolve.alias,
      // Prevent webpack from trying to resolve locked onboarding files
      '@/app/onboarding': false,
    };

    // Do not resolve symlinks to avoid readlink on locked onboarding files
    if (!config.resolve) config.resolve = {};
    config.resolve.symlinks = false;

    // Ignore locked directories completely for file watching
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/src/app/onboarding/**',
        '**/src/app/onboarding-locked/**',
        '**/src/app/onboarding-temp-disabled/**',
        '**/src/app/onboarding-locked-temp/**',
      ],
    };

    return config;
  },
  // Exclude locked directories from static analysis
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'].map(ext => {
    return ext;
  }),
};

export default nextConfig;
