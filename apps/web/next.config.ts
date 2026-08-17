import type { NextConfig } from "next";

// As fotos dos professores vivem no Storage do Supabase, que é um domínio
// externo — o next/image só serve imagens de fora se o domínio estiver
// declarado aqui. Lê-se da variável de ambiente para não ficar preso a um
// projeto: em produção e em local apontam para sítios diferentes.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined

const nextConfig: NextConfig = {
  // O @ccg/core é publicado em TypeScript, sem passo de build próprio: o
  // que está no disco é o que a web e a app móvel consomem. Assim não há
  // dist/ desatualizado nem "porque é que a minha alteração não aparece".
  // Em troca, quem o consome tem de o compilar — no Next é esta linha, e
  // no Metro/Expo é o comportamento por omissão dentro do workspace.
  transpilePackages: ['@ccg/core', '@ccg/data', '@ccg/types'],
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
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
