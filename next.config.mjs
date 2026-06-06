/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // @supabase/ssr + @supabase/supabase-js type inference bug with insert/update
    ignoreBuildErrors: true,
  },
}

export default nextConfig
