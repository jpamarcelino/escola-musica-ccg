import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CartaoLink } from '@/components/cartao-link'
import { BotaoPrimario } from '@/components/botao-primario'
import { PaginaComHero } from '@/components/hero-section'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'

// As três escolas. A cor é a barra de 3px que as identifica; o href entra
// no wizard já com a escola escolhida, pelo que o passo de escolher escola
// é saltado — a idade é pedida logo a seguir, em pop-up.
const ESCOLAS = [
  {
    programa: 'musica',
    nome: 'Escola de Música',
    descricao: 'Piano, guitarra, canto, bateria e mais',
    icone: '/escolas/musica.png',
    iconeTamanho: 36,
    cor: 'var(--color-azul-logo)',
    novidade: false,
  },
  {
    programa: 'danca',
    nome: 'Escola de Dança',
    descricao: 'Ballet, contemporâneo e dança criativa',
    icone: '/escolas/danca.png',
    iconeTamanho: 36,
    cor: 'var(--color-dourado)',
    novidade: false,
  },
  {
    programa: 'bebes',
    nome: 'Música para Bebés',
    descricao: 'Primeira descoberta sonora na pré-infância',
    icone: '/escolas/bebes.png',
    // Este PNG tem mais margem transparente à volta do desenho do que os
    // outros dois, por isso precisa de mais uns pixéis para o traço ficar
    // com o mesmo peso visual.
    iconeTamanho: 42,
    cor: 'var(--color-verde)',
    novidade: true,
  },
]

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  // Hero institucional (DESIGN_SYSTEM_V2 / plano secção 6.6): sem sessão
  // não há saudação nem número pessoal — o destaque é a própria escola.
  return (
    <PaginaComHero
      hero={
        <div className="space-y-[14px] pt-[16px]">
          <h1
            className="text-[36px] font-semibold leading-[1.12] tracking-[-0.018em]"
            style={{ fontFamily: 'var(--font-fraunces)' }}
          >
            Conhece as nossas
            <br />
            <span className="font-medium italic">Escolas Artísticas</span>
          </h1>
          <p className="max-w-[46ch] text-[15px] leading-[1.6]">
            Escolhe a disciplina, vê os professores e os horários disponíveis,
            e faz a matrícula sem sair de casa.
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-[8px] md:grid md:grid-cols-1">
        {ESCOLAS.map((escola) => (
          <CartaoLink
            key={escola.programa}
            href={`/pedir-aula?programa=${escola.programa}`}
            nome={escola.nome}
            descricao={escola.descricao}
            icone={escola.icone}
            iconeTamanho={escola.iconeTamanho}
            cor={escola.cor}
            novidade={escola.novidade}
          />
        ))}
      </div>

      <div className="mt-[32px] flex flex-col items-center gap-[16px]">
        <BotaoPrimario href="/registo">Criar conta</BotaoPrimario>
        <LigacaoTerciaria href="/login">Já tens conta? Entrar</LigacaoTerciaria>
      </div>

      <p
        className="mt-[40px] text-center text-[14px] italic"
        style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-text-secondary)' }}
      >
        Pela Guarda, pela arte e pela cultura
      </p>
    </PaginaComHero>
  )
}
