import { EcraCarregamento } from '@/components/ecra-carregamento'

// Necessário aqui, e não só na raiz: numa navegação do lado do cliente o
// fallback só aparece se o segmento de destino tiver o seu próprio
// boundary (ver a nota em app/loading.tsx).
export default function Loading() {
  return <EcraCarregamento mensagem="A preparar o registo…" />
}
