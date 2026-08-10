import Link from 'next/link'
import Image from 'next/image'
import { Fraunces, Inter } from 'next/font/google'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Fontes do DESIGN_SYSTEM.md (secção 3). Carregadas aqui e não no layout
// porque só esta página está desenhada — as outras continuam com a Geist
// até serem migradas.
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  display: 'swap',
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

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
      className={`${fraunces.variable} ${inter.variable} relative flex flex-1 flex-col overflow-hidden`}
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
            <Link
              key={escola.programa}
              href={`/pedir-aula?programa=${escola.programa}`}
              className="group relative flex items-center gap-[14px] overflow-hidden rounded-[18px] border border-[var(--color-linha)] bg-white py-[15px] pl-[22px] pr-[16px] transition duration-150 hover:-translate-y-px hover:border-[var(--color-azul-logo)]"
            >
              {/* Barra de 3px que identifica a escola (secção 6). */}
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-[3px]"
                style={{ backgroundColor: escola.cor }}
              />

              <span
                aria-hidden="true"
                className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[12px]"
                style={{ backgroundColor: 'var(--color-papel-2)' }}
              >
                <Image
                  src={escola.icone}
                  alt=""
                  width={escola.iconeTamanho}
                  height={escola.iconeTamanho}
                  className="object-contain"
                  style={{ width: escola.iconeTamanho, height: escola.iconeTamanho }}
                />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-[6px]">
                  <span
                    className="whitespace-nowrap text-[16.5px] font-semibold leading-[1.2]"
                    style={{
                      fontFamily: 'var(--font-fraunces)',
                      color: 'var(--color-azul-fundo)',
                    }}
                  >
                    {escola.nome}
                  </span>
                  {escola.novidade && (
                    <span
                      className="shrink-0 rounded-[5px] border px-[5px] pb-[2px] pt-[2.5px] text-[8px] font-semibold uppercase tracking-[0.1em]"
                      style={{
                        color: '#6C4A1E',
                        backgroundColor: '#F2E3CD',
                        borderColor: '#E2CDAE',
                      }}
                    >
                      Novidade
                    </span>
                  )}
                </span>
                <span
                  className="mt-[2px] block text-[12.5px] leading-[1.35]"
                  style={{ color: 'var(--color-tinta-suave)' }}
                >
                  {escola.descricao}
                </span>
              </span>

              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[20px] w-[20px] shrink-0"
                style={{ color: 'var(--color-azul)' }}
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </Link>
          ))}
        </div>

        <div className="mt-[26px] flex flex-col items-center gap-[14px]">
          <Link
            href="/registo"
            className="flex h-[52px] w-full items-center justify-center rounded-[13px] text-[15.5px] font-semibold text-white"
            style={{
              backgroundColor: 'var(--color-azul-fundo)',
              boxShadow: '0 7px 18px rgba(27,79,122,.26)',
            }}
          >
            Criar conta
          </Link>
          <Link
            href="/login"
            className="text-[14px] font-medium underline [text-underline-offset:3px]"
            style={{ color: 'var(--color-tinta-suave)' }}
          >
            Já tens conta? Entrar
          </Link>
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
