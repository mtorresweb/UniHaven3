import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // El formulario de subida envía los archivos al Server Action createProject
      // (límites de la acción: 50 MB por archivo y 200 MB en total), por encima
      // del límite por defecto de 1 MB.
      bodySizeLimit: "200mb",
    },
  },
  images: {
    remotePatterns: [
      // Vercel Blob (cover images)
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      // Google profile pictures
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
