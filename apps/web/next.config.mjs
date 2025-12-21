/** @type {import('next').NextConfig} */
const nextConfig = {
  // Variables de entorno públicas
  env: {
    // Usar 127.0.0.1 en vez de localhost para evitar problemas de IPv6 en Windows
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001",
  },

  // Configuración de imágenes
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.automai.es",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "3001",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
      },
    ],
    // En desarrollo, permitir imágenes sin restricciones de hostname
    // (solo para desarrollo local, no usar en producción)
    ...(process.env.NODE_ENV === "development" && {
      unoptimized: false,
      // Nota: Si necesitas cargar imágenes desde IPs locales específicas,
      // agrega tu IP a remotePatterns manualmente
    }),
    formats: ["image/avif", "image/webp"],
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        // Aplicar headers solo a rutas de la aplicación, no a archivos estáticos
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  // Configuración de compilación
  reactStrictMode: true,
  swcMinify: true,

  // Source maps solo en desarrollo
  productionBrowserSourceMaps: false,

  // Optimizaciones
  compress: true,
  poweredByHeader: false,

  // Configuración experimental
  experimental: {
    // Optimizaciones de rendimiento
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },

  // Optimizaciones de compilación
  compiler: {
    // Remover console.log en producción
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },
};

export default nextConfig;
