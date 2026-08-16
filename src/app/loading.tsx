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
// /pedir-aula — têm o seu próprio loading.tsx, com uma mensagem que diz
// o que está a abrir ("A abrir a secretaria…", "A abrir o caderno…") e
// sobreposto ao ecrã. Este aqui fica com o arranque e com tudo o resto.
//
// Houve uma fase em que essas áreas respondiam com esqueleto, para se
// ver o layout a formar-se. Deixou de ser assim quando o skeleton.tsx
// foi retirado e a app passou a ter transições de página próprias
// (page-transition.tsx, navigation-feedback.tsx) — a espera passou a
// ser tratada no movimento entre páginas e não na forma da que vem.
export default function Loading() {
  return <EcraCarregamento />
}
