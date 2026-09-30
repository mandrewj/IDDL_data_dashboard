/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // data/snapshot.json and data/gbif-metrics.json are read with fs at request
  // time. Next's output tracing can't see that, so name them explicitly or they
  // won't be uploaded alongside the serverless functions and every page will 500.
  experimental: {
    outputFileTracingIncludes: {
      '/**': ['./data/snapshot.json', './data/gbif-metrics.json'],
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'static.inaturalist.org' },
      { protocol: 'https', hostname: 'inaturalist-open-data.s3.amazonaws.com' },
    ],
  },
};

module.exports = nextConfig;
