import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    // Force Turbopack to treat THIS folder as the workspace root,
    // instead of "helpfully" picking ~/package-lock.json
    root: __dirname,
  },
}

export default nextConfig
