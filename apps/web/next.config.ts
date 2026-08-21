import type { NextConfig } from "next";

// As fotos dos professores vivem no Storage do Supabase, que é um domínio
// externo — o next/image só serve imagens de fora se o domínio estiver
// declarado aqui. Lê-se da variável de ambiente para não ficar preso a um
// projeto: em produção e em local apontam para sítios diferentes.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined

// Pasta onde a compilação escreve. Por omissão é a `.next`, que é
// também a que o `next dev` usa — e correr uma compilação com o servidor
// local ligado punha os dois a escrever nos mesmos ficheiros. O servidor
// só dava por isso mais tarde, a servir "Internal Server Error" em todas
// as páginas, e a causa não aparecia em lado nenhum: nem erro de código,
// nem aviso ao compilar.
//
// Com esta variável, uma compilação de verificação escreve à parte e não
// toca no que o servidor local está a servir (ver `npm run verificar`).
const distDir = process.env.NEXT_DIST_DIR || '.next'

const nextConfig: NextConfig = {
  distDir,
  // O @ccg/core é publicado em TypeScript, sem passo de build próprio: o
  // que está no disco é o que a web e a app móvel consomem. Assim não há
  // dist/ desatualizado nem "porque é que a minha alteração não aparece".
  // Em troca, quem o consome tem de o compilar — no Next é esta linha, e
  // no Metro/Expo é o comportamento por omissão dentro do workspace.
  transpilePackages: ['@ccg/core', '@ccg/data', '@ccg/types'],
  images: {
    remotePatterns: [
      ...(supabaseHost
        ? [
            {
              protocol: 'https' as const,
              hostname: supabaseHost,
              pathname: '/storage/v1/object/public/**',
            },
          ]
        : []),
      // Miniaturas do YouTube. É um endereço público e direto, sem chave
      // nem pedido à API — e funciona com vídeos não listados. Vão com
      // `unoptimized`: passá-las pelo otimizador do Next gastaria quota
      // do Vercel para reduzir uma imagem que já vem com 480 de largura.
      { protocol: 'https' as const, hostname: 'i.ytimg.com', pathname: '/vi/**' },
    ],
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
