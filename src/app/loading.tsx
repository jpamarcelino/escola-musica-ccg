import { EcraCarregamento } from '@/components/ecra-carregamento'

// Espera da raiz — cobre o arranque da app e o recarregar de qualquer
// página sem loading.tsx próprio.
//
// Atenção a uma armadilha do App Router, descoberta a testar: este
// ficheiro NÃO chega para as navegações do lado do cliente entre rotas
// irmãs. O boundary da raiz é montado uma vez, e o React não volta a
// mostrar o fallback de um boundary já montado durante uma transição —
// mantém o ecrã anterior. Só um segmento novo (com o seu próprio
// loading.tsx) faz aparecer um fallback. Por isso as rotas públicas que
// podem demorar têm cada uma o seu, ao lado do respetivo page.tsx.
//
// As áreas com forma previsível — /dashboard, /admin, /aluno,
// /pedir-aula — respondem com esqueleto em vez deste ecrã. Aí sabe-se o
// que vem a caminho, e ver o layout a formar-se faz a espera parecer
// mais curta do que escondê-la atrás de um splash.
export default function Loading() {
  return <EcraCarregamento />
}
