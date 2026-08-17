import { obterPerfilEscola, type PerfilEscola } from '@ccg/data'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useSessao } from './sessao'
import { supabase } from './supabase'

type Estado = {
  perfil: PerfilEscola | null
  aCarregar: boolean
}

const Contexto = createContext<Estado>({ perfil: null, aCarregar: true })

// O perfil decide que separadores aparecem e que ecrãs existem, por isso
// é lido uma vez à entrada e partilhado — em vez de cada ecrã repetir a
// consulta, que era o problema que a web resolveu com o auth-context.
export function ProvedorPerfil({ children }: { children: ReactNode }) {
  const { sessao, aCarregar: sessaoACarregar } = useSessao()
  const [perfil, setPerfil] = useState<PerfilEscola | null>(null)
  const [aCarregar, setACarregar] = useState(true)

  useEffect(() => {
    if (sessaoACarregar) return

    if (!sessao) {
      setPerfil(null)
      setACarregar(false)
      return
    }

    let ativo = true

    const buscar = async () => {
      const p = await obterPerfilEscola(supabase, sessao.user.id)
      if (!ativo) return
      setPerfil(p)
      setACarregar(false)
    }

    void buscar()

    return () => {
      ativo = false
    }
  }, [sessao, sessaoACarregar])

  return <Contexto.Provider value={{ perfil, aCarregar }}>{children}</Contexto.Provider>
}

export function usePerfil() {
  return useContext(Contexto)
}
