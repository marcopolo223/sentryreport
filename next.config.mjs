/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
  webpack: (config, { nextRuntime }) => {
    // @react-pdf/renderer optional dep. Do not apply this alias to Edge
    // middleware — a boolean alias can crash the Vercel middleware isolate.
    if (nextRuntime !== "edge") {
      config.resolve.alias.canvas = false;
    }
    return config;
  },
  async redirects() {
    return [
      {
        source: "/admin/intake",
        destination: "/admin/configuration/intake",
        permanent: false,
      },
      {
        source: "/admin/pdf-template",
        destination: "/admin/configuration/pdf-template",
        permanent: false,
      },
      {
        source: "/admin/activity",
        destination: "/admin/team",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
