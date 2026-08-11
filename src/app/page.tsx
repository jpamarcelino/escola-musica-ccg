import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CartaoLink } from '@/components/cartao-link'
import { BotaoPrimario } from '@/components/botao-primario'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'

// Grão de papel (secção 7): é o que impede o aspeto de vetor liso. Uma só
// camada, por cima do fundo e por baixo do conteúdo.
const GRAO =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E\")"

// As três escolas. A cor é a barra de 3px que as identifica (secção 6);
// o href entra no wizard já com a escola escolhida, pelo que o passo de
// escolher escola é saltado — a idade é pedida logo a seguir, em pop-up.
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

  return (
    <main
      className="relative flex flex-1 flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--color-papel)',
        color: 'var(--color-tinta)',
        fontFamily: 'var(--font-inter)',
      }}
    >
      {/* Pincelada da marca (secção 7): discreta, encostada ao canto superior
          direito e cortada pela margem do ecrã. Fica atrás do conteúdo — uma
          só vez, e só em ecrãs de entrada como este. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[70px] -top-[70px] h-[300px] w-[300px] select-none"
        style={{
          backgroundImage: 'url("/pincelada-ccg.png")',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          opacity: 0.3,
          transform: 'rotate(-14deg)',
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: GRAO, opacity: 0.16, mixBlendMode: 'multiply' }}
      />

      <div className="relative mx-auto flex w-full max-w-[720px] flex-1 flex-col px-[22px] pb-[38px] pt-[26px]">
        <h1
          className="text-[33px] font-semibold leading-[1.12] tracking-[-0.018em]"
          style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-azul-fundo)' }}
        >
          Conhece as nossas
          <br />
          <span className="font-medium italic" style={{ color: 'var(--color-azul)' }}>
            Escolas Artísticas
          </span>
        </h1>

        <p
          className="mt-[14px] max-w-[46ch] text-[15px] leading-[1.6]"
          style={{ color: 'var(--color-tinta-suave)' }}
        >
          Escolhe a disciplina, vê os professores e os horários disponíveis, e faz
          a matrícula sem sair de casa.
        </p>

        <div className="mt-[26px] flex flex-col gap-[11px]">
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

        <div className="mt-[26px] flex flex-col items-center gap-[14px]">
          <BotaoPrimario href="/registo">Criar conta</BotaoPrimario>
          <LigacaoTerciaria href="/login">Já tens conta? Entrar</LigacaoTerciaria>
        </div>

        {/* "mt-auto" encosta o rodapé ao fundo quando a página é mais curta
            do que o ecrã, sem o descolar do conteúdo quando é mais longa. */}
        <div className="mt-auto flex flex-col items-center pt-[38px]">
          <span
            aria-hidden="true"
            className="block h-px w-[38px]"
            style={{ backgroundColor: 'var(--color-linha)' }}
          />
          <p
            className="mt-[14px] text-[14px] italic"
            style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-azul)' }}
          >
            Pela Guarda, pela arte e pela cultura
          </p>
        </div>
      </div>
    </main>
  )
}
