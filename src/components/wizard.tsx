import { BackButton } from '@/components/back-button'
import { FundoPapel } from '@/components/fundo-papel'

// Casca dos dois wizards de pedir aula — o público (/pedir-aula) e o
// autenticado (/aluno/[alunoId]/pedido). Os passos são os mesmos nos dois,
// por isso a moldura também é.
export function Wizard({
  title,
  voltar,
  children,
}: {
  title?: string
  voltar?: string
  children: React.ReactNode
}) {
  return (
    <FundoPapel largura="larga">
      <div className="space-y-[22px]">
        {(voltar || title) && (
          <div className="flex items-center gap-3">
            {voltar && <BackButton href={voltar} />}
            {title && (
              <h1
                className="text-[22px] font-semibold leading-[1.2]"
                style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-azul-fundo)' }}
              >
                {title}
              </h1>
            )}
          </div>
        )}
        {children}
      </div>
    </FundoPapel>
  )
}

// Lista de cartões dos passos de escolha (disciplina, professor, escola).
// Uma coluna no telemóvel e duas a partir de "md", como manda a secção 9.
export function ListaEscolhas({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-[11px] md:grid-cols-2">{children}</div>
}
