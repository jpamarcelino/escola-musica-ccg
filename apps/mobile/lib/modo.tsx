import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { usePerfil } from './perfil'

// Administrar não é um papel à parte: é um chapéu que um professor (ou uma
// Conta CCG) põe e tira. A app tinha isto como um separador permanente
// chamado "Escola", encostado aos outros — o que punha a gestão da escola
// à distância de um toque acidental, no meio de quem só quer ver as aulas
// do dia, e obrigava a barra a ter seis separadores.
//
// Aqui é um modo: quem tem a marca de administração liga-o na Conta, e a
// app inteira muda — barra, ecrãs e cabeçalho. Fora do modo, os ecrãs de
// administração não estão só escondidos, estão inalcançáveis (`href: null`
// no layout), que é a diferença entre arrumar uma porta e trancá-la.
const CHAVE = 'ccg-modo-admin'

type Estado = {
  modoAdmin: boolean
  // Falso para quem não é administrador. O interruptor nem chega a ser
  // desenhado, e ligá-lo por código não faria nada.
  podeAlternar: boolean
  alternar: (ligado: boolean) => void
  aCarregar: boolean
}

const Contexto = createContext<Estado>({
  modoAdmin: false,
  podeAlternar: false,
  alternar: () => {},
  aCarregar: true,
})

export function ProvedorModo({ children }: { children: ReactNode }) {
  const { perfil, aCarregar: perfilACarregar } = usePerfil()
  const [modoAdmin, setModoAdmin] = useState(false)
  const [aCarregar, setACarregar] = useState(true)

  const podeAlternar = perfil?.admin === true

  // O modo sobrevive a fechar a app: quem passa a manhã na secretaria não
  // tem de o voltar a ligar a cada arranque.
  useEffect(() => {
    if (perfilACarregar) return

    let ativo = true

    const ler = async () => {
      // Sem marca de administração não há modo nenhum a restaurar. Ler o
      // perfil primeiro e só depois o armazenamento evita o piscar de um
      // painel de administração a alguém que deixou de o ser.
      if (!podeAlternar) {
        if (ativo) {
          setModoAdmin(false)
          setACarregar(false)
        }
        return
      }
      const guardado = await AsyncStorage.getItem(CHAVE)
      if (!ativo) return
      setModoAdmin(guardado === 'sim')
      setACarregar(false)
    }

    void ler()

    return () => {
      ativo = false
    }
  }, [podeAlternar, perfilACarregar])

  const alternar = useCallback(
    (ligado: boolean) => {
      if (!podeAlternar) return
      setModoAdmin(ligado)
      // Gravar sem esperar: o ecrã muda já, e se a escrita falhar o pior
      // que acontece é a app abrir no outro modo da próxima vez.
      void AsyncStorage.setItem(CHAVE, ligado ? 'sim' : 'nao')
    },
    [podeAlternar]
  )

  return (
    <Contexto.Provider value={{ modoAdmin, podeAlternar, alternar, aCarregar }}>
      {children}
    </Contexto.Provider>
  )
}

export function useModo() {
  return useContext(Contexto)
}
