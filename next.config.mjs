/** @type {import('next').NextConfig} */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const nextConfig = {
  turbopack: {
    // Force Turbopack to treat THIS folder as workspace root.
    // Prevents it from picking ~/package-lock.json.
    root: __dirname,
  },
}

export default nextConfig
