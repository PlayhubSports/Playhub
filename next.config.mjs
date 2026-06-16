/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Imagens locais (public/) são automáticas — não precisam de remotePatterns
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'storage.playhub.app' },
    ],
    // Não comprimir o PNG 4K da logo (já está otimizado)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}

export default nextConfig
