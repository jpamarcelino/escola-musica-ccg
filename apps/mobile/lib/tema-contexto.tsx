import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useColorScheme } from 'react-native'
import { useSessao } from './sessao'
import { claro, escuro, type Cores } from './tema'

// A aparência da app: clara, escura, ou a do dispositivo.
//
// Três opções e não um interruptor de dois estados. "Sistema" não é uma
// terceira cor — é a ausência de escolha, e é diferente de ter escolhido
// claro num telemóvel que está em claro: quando o telemóvel passa a
// escuro à noite, um acompanha e o outro não. Guardar só um booleano
// perdia essa diferença.
//
// A escolha é de quem tem conta. Fora da sessão — a página de
// descoberta, o registo, o entrar — vale sempre o modo do telemóvel:
// não há onde escolher nem a quem guardar a escolha, e uma preferência
// deixada por um utilizador anterior não deve pintar o primeiro ecrã que
// outra pessoa vê. Daí este provedor viver por dentro do ProvedorSessao.
//
// Segue o padrão do lib/modo.tsx: contexto, AsyncStorage, e o valor
// gravado sem esperar pela escrita.

const CHAVE = 'ccg-aparencia'

export type Aparencia = 'claro' | 'escuro' | 'sistema'

export const APARENCIAS: { valor: Aparencia; rotulo: string; nota: string }[] = [
  { valor: 'claro', rotulo: 'Claro', nota: 'Sempre em claro.' },
  { valor: 'escuro', rotulo: 'Escuro', nota: 'Sempre em escuro.' },
  { valor: 'sistema', rotulo: 'Sistema', nota: 'Acompanha o telemóvel.' },
]

type Estado = {
  cores: Cores
  /** O que a pessoa escolheu. */
  aparencia: Aparencia
  /** O que está mesmo no ecrã — com 'sistema', o do dispositivo. */
  esquema: 'claro' | 'escuro'
  definir: (a: Aparencia) => void
  /** Verdadeiro até o valor gravado ser lido. */
  aCarregar: boolean
}

const Contexto = createContext<Estado>({
  cores: claro,
  aparencia: 'sistema',
  esquema: 'claro',
  definir: () => {},
  aCarregar: true,
})

function ehAparencia(v: string | null): v is Aparencia {
  return v === 'claro' || v === 'escuro' || v === 'sistema'
}

export function ProvedorTema({ children }: { children: ReactNode }) {
  const { sessao } = useSessao()
  // Por omissão 'sistema': quem já pôs o telemóvel em escuro está a
  // dizer o que quer, e abrir em claro por cima disso é ignorá-lo.
  const [aparencia, setAparencia] = useState<Aparencia>('sistema')
  const [aCarregar, setACarregar] = useState(true)

  // Devolve null quando o sistema não sabe. Aí vale o claro, que é a
  // aparência histórica da app.
  const doSistema = useColorScheme()

  useEffect(() => {
    let ativo = true
    const ler = async () => {
      // Uma leitura falhada não é motivo para não abrir a app: fica-se
      // com 'sistema', que é o valor por omissão de qualquer forma.
      const guardado = await AsyncStorage.getItem(CHAVE).catch(() => null)
      if (!ativo) return
      if (ehAparencia(guardado)) setAparencia(guardado)
      setACarregar(false)
    }
    void ler()
    return () => {
      ativo = false
    }
  }, [])

  const definir = useCallback((a: Aparencia) => {
    setAparencia(a)
    // Gravar sem esperar: o ecrã muda já, e se a escrita falhar o pior
    // que acontece é a app abrir na aparência anterior da próxima vez.
    void AsyncStorage.setItem(CHAVE, a).catch(() => {})
  }, [])

  const doDispositivo: 'claro' | 'escuro' = doSistema === 'dark' ? 'escuro' : 'claro'
  // Sem sessão a preferência nem se lê: o ecrã público acompanha o
  // telemóvel e mais nada.
  const efetiva: Aparencia = sessao ? aparencia : 'sistema'
  const esquema: 'claro' | 'escuro' = efetiva === 'sistema' ? doDispositivo : efetiva

  const valor = useMemo<Estado>(
    () => ({
      cores: esquema === 'escuro' ? escuro : claro,
      aparencia: efetiva,
      esquema,
      definir,
      aCarregar,
    }),
    [esquema, efetiva, definir, aCarregar]
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useTema() {
  return useContext(Contexto)
}

// Estilos que sabem em que tema estão.
//
// O StyleSheet.create de um ecrã corre uma vez, quando o módulo é
// importado — muito antes de haver contexto — por isso as cores não
// podem estar lá dentro fixas. A saída é a folha de estilos passar a ser
// uma função da paleta, e este hook chama-a e guarda o resultado.
//
// O useMemo depende da paleta e não do esquema: as duas são constantes
// do módulo, por isso a identidade só muda quando o tema muda mesmo, e
// não a cada render.
export function useEstilos<T>(criar: (cores: Cores) => T): T {
  const { cores } = useTema()
  return useMemo(() => criar(cores), [criar, cores])
}
