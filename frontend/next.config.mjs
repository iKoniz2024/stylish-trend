// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   reactStrictMode: true,
//   output: 'standalone',
// };

// export default nextConfig;



import EventEmitter from 'events';

// Increase max listeners to suppress Turbopack memory leak warnings in dev mode
EventEmitter.defaultMaxListeners = 100;

/** @type {import('next').NextConfig} */

const isStandalone = process.env.BUILD_STANDALONE === 'true' || process.env.STANDALONE === '1';

const nextConfig = {
  reactStrictMode: true,
  ...(isStandalone ? { output: 'standalone' } : {}),
  async redirects() {
    return [
      {
        source: '/shop',
        destination: '/products',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
