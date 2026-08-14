import { EcraCarregamento } from '@/components/ecra-carregamento'

export default function Loading() {
  return (
    <EcraCarregamento
      mensagem="A preparar a tua área…"
      contexto="Estamos a carregar agenda, pedidos e presenças."
      cobrirEcra
    />
  )
}
