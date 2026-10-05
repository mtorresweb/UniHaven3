import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // El proxy (middleware.ts) bufferea el body en memoria para poder leerlo dos
    // veces, con un tope por defecto de 10 MB que truncaba el multipart de la
    // subida (=> "Unexpected end of form").
    proxyClientMaxBodySize: "60mb",
    serverActions: {
      // Los archivos van al Server Action createProject, que valida 25 MB por
      // archivo y 50 MB en total. Se deja un poco por encima para que se vea
      // su mensaje de validacion en vez de un error de truncado.
      bodySizeLimit: "60mb",
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
