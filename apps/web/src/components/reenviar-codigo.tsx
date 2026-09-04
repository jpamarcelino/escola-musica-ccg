'use client'

import { useActionState, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { AuthState } from '@/lib/actions/auth'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'

// Pedir outro código, com um contador a segurar o botão.
//
// O contador não é para castigar ninguém: o Supabase recusa reenvios
// seguidos, e um botão que se pode carregar mas devolve erro ensina a
// pessoa a desconfiar da app. Melhor dizer quanto falta.
//
// Sessenta segundos porque é o intervalo mínimo entre reenvios do lado do
// Supabase. E o primeiro código também demora a chegar — a maioria das
// vezes que alguém carrega em "enviar outro" é por impaciência, e o
// segundo email só torna mais confuso qual dos códigos vale.
const ESPERA = 60

export function ReenviarCodigo({
  accao,
  email,
}: {
  accao: (estado: AuthState, formData: FormData) => Promise<AuthState>
  email: string | null
}) {
  const [state, action, pending] = useActionState(accao, undefined)
  const [faltam, setFaltam] = useState(ESPERA)

  useEffect(() => {
    if (faltam <= 0) return
    const t = setTimeout(() => setFaltam((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [faltam])

  // Reenviado com sucesso: o contador recomeça.
  useEffect(() => {
    if (state?.info) setFaltam(ESPERA)
  }, [state?.info])

  const bloqueado = faltam > 0 || pending

  return (
    <form action={action} className="reenviar-codigo">
      {/* Quando o cookie já expirou, o email vai no formulário do código
          e não neste — aqui não há onde o escrever, por isso o servidor
          responde a pedir que se escreva lá em cima. */}
      {email && <input type="hidden" name="email" value={email} />}

      {state?.error && <MensagemErro>{state.error}</MensagemErro>}
      {state?.info && <MensagemInfo>{state.info}</MensagemInfo>}

      <button type="submit" disabled={bloqueado}>
        <RefreshCw size={15} strokeWidth={2} aria-hidden="true" />
        {pending
          ? 'A enviar…'
          : faltam > 0
            ? `Enviar outro código (${faltam}s)`
            : 'Não recebeste? Enviar outro código'}
      </button>
    </form>
  )
}
