import { EcraCarregamento } from '@/components/ecra-carregamento'

export default function Loading() {
  return (
    <EcraCarregamento
      mensagem="A abrir…"
      contexto="Estamos a preparar a próxima página."
      cobrirEcra
    />
  )
}
