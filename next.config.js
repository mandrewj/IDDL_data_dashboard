/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // data/snapshot.json is read with fs at request time. Next's output
  // tracing can't see that, so name it explicitly or it won't be uploaded
  // alongside the serverless functions and every page will 500.
  experimental: {
    outputFileTracingIncludes: {
      '/**': ['./data/snapshot.json'],
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
