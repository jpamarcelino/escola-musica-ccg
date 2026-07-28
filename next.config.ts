import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Por omissão as Server Actions só aceitam 1MB — pouco para uma foto
    // tirada com o telemóvel (o carregamento de foto do professor usa
    // uma Server Action diretamente com o ficheiro).
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
