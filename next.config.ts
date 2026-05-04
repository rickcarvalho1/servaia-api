import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/landscaping-payment-software',
        destination: '/landscaping-payment-software.html',
      },
      {
        source: '/hvac-payment-software',
        destination: '/hvac-payment-software.html',
      },
      {
        source: '/hardscaping-payment-software',
        destination: '/hardscaping-payment-software.html',
      },
      {
        source: '/electrical-payment-software',
        destination: '/electrical-payment-software.html',
      },
      {
        source: '/plumbing-payment-software',
        destination: '/plumbing-payment-software.html',
      },
    ];
  },
};

export default nextConfig;