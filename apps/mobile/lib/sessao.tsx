import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

type EstadoSessao = {
  sessao: Session | null
  aCarregar: boolean
}

const Contexto = createContext<EstadoSessao>({ sessao: null, aCarregar: true })

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [aCarregar, setACarregar] = useState(true)

  useEffect(() => {
    // A sessão está no armazenamento do telemóvel e lê-se de forma
    // assíncrona. Enquanto não chega, `aCarregar` fica a true — sem isso
    // a app decidia "não há sessão" antes de ter olhado, e mandava para
    // o login quem já tinha entrado.
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setACarregar(false)
    })

    // Cobre o login, o logout e a renovação do token, sem cada ecrã ter
    // de saber que isso aconteceu.
    const { data: subscricao } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova)
    })

    return () => subscricao.subscription.unsubscribe()
  }, [])

  return <Contexto.Provider value={{ sessao, aCarregar }}>{children}</Contexto.Provider>
}

export function useSessao() {
  return useContext(Contexto)
}
