import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, Info } from 'lucide-react'
import { Distintivo } from '@/components/distintivo'

// Cartão navegável grande (DESIGN_SYSTEM_V2 secção 8) — escolha de
// escola, de disciplina, de professor.
//
// Ao contrário da v1, não tem borda nem barra colorida de 3px: a
// separação vem da superfície (--color-surface-raised) e do espaço. A
// cor da escola sobrevive como fundo da caixa de ícone, que é onde
// realmente ajuda a distinguir — uma barra fina ao lado era decoração
// que ninguém lia.
export function CartaoLink({
  href,
  nome,
  descricao,
  icone,
  iconeTamanho,
  cor,
  novidade = false,
  contagem,
  bloqueado = false,
  iconeCobre = false,
  infoHref,
  infoRotulo,
}: {
  href: string
  nome: string
  descricao?: string
  // Caminho de imagem (as escolas) ou um SVG de linha já pronto (o
  // convite para instalar a app).
  icone?: string | React.ReactNode
  iconeTamanho?: number
  // Retratos preenchem a caixa toda, recortados; ícones de disciplina
  // ficam inteiros, com folga à volta.
  iconeCobre?: boolean
  // Cor da escola — tinge o fundo da caixa de ícone.
  cor?: string
  novidade?: boolean
  // Distintivo numérico (pedidos por responder, notificações por ler).
  // Escondido a zero, para não haver um "0" a pedir atenção sem motivo.
  contagem?: number
  // Visível mas fora de alcance — as disciplinas que não servem à idade
  // do aluno. Deixa de ser um destino navegável: nem para o rato, nem
  // para o teclado, nem para um leitor de ecrã.
  //
  // O aspeto de "apagado" está em .cartao-bloqueado (globals.css) e não
  // aqui: dentro do wizard as linhas levam `background: transparent
  // !important`, e classes utilitárias soltas perdiam essa disputa.
  bloqueado?: boolean
  // Um "i" ao lado da seta, que leva à ficha de quem está no cartão.
  // Fica FORA do link principal: um link dentro de outro link não é
  // marcação válida, e o browser resolve-o como lhe apetece — o teclado
  // salta um dos dois, e o leitor de ecrã anuncia um destino errado.
  infoHref?: string
  infoRotulo?: string
}) {
  const classesBase =
    'entrada-esquerda group flex items-center gap-[16px] rounded-[var(--radius-large)] px-[18px] py-[18px]'

  const conteudo = (
    <>
      {icone && (
        <span
          aria-hidden="true"
          className={
            'flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-[var(--radius-medium)]' +
            (iconeCobre ? ' overflow-hidden' : '')
          }
          style={{
            // A cor da escola entra esbatida: forte o suficiente para
            // identificar, discreta o suficiente para o ícone respirar.
            backgroundColor: cor
              ? `color-mix(in srgb, ${cor} 22%, white)`
              : 'var(--color-surface-raised)',
          }}
        >
          {typeof icone === 'string' ? (
            <Image
              src={icone}
              alt=""
              width={iconeTamanho ?? 32}
              height={iconeTamanho ?? 32}
              className={iconeCobre ? 'h-full w-full object-cover' : 'object-contain'}
              style={
                iconeCobre
                  ? undefined
                  : { width: iconeTamanho ?? 32, height: iconeTamanho ?? 32 }
              }
            />
          ) : (
            icone
          )}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-[8px]">
          <span
            className="text-[17px] font-semibold leading-[1.25]"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {nome}
          </span>
          {novidade && <Distintivo>Novidade</Distintivo>}
          {!!contagem && contagem > 0 && (
            <Distintivo>
              <span aria-label={`${contagem} por ver`}>{contagem}</span>
            </Distintivo>
          )}
        </span>
        {descricao && (
          <span
            className="mt-[3px] block text-[13.5px] leading-[1.45]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {descricao}
          </span>
        )}
      </span>

      {/* Sem seta quando está bloqueado: não há para onde ir. */}
      {!bloqueado && (
        <ChevronRight
          aria-hidden="true"
          strokeWidth={1.5}
          className="h-[20px] w-[20px] shrink-0"
          style={{ color: 'var(--color-text-secondary)' }}
        />
      )}
    </>
  )

  if (bloqueado) {
    return (
      <div
        className={`${classesBase} cartao-opcao cartao-bloqueado`}
        style={{ backgroundColor: 'var(--color-surface-raised)' }}
        aria-disabled="true"
      >
        {conteudo}
      </div>
    )
  }

  const principal = (
    <Link
      href={href}
      className={`${classesBase} cartao-opcao cartao-disponivel transition-[transform,background-color] duration-150 hover:bg-[#EDEFF3] motion-safe:active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-mid)] motion-reduce:transition-none`}
      style={{ backgroundColor: 'var(--color-surface-raised)' }}
    >
      {conteudo}
    </Link>
  )

  if (!infoHref) return principal

  return (
    <div className="cartao-com-info">
      {principal}
      <Link
        href={infoHref}
        className="cartao-info"
        aria-label={infoRotulo ?? `Saber mais sobre ${nome}`}
      >
        <Info aria-hidden="true" strokeWidth={1.75} className="h-[17px] w-[17px]" />
      </Link>
    </div>
  )
}
