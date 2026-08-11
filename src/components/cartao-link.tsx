import Link from 'next/link'
import Image from 'next/image'
import { Distintivo } from '@/components/distintivo'

// Cartão navegável do DESIGN_SYSTEM.md (secção 6): linha horizontal com
// caixa de ícone → texto → seta.
//
// Nasceu como cartão de escola na página inicial e passou a servir também
// os hubs, por isso tudo o que é específico das escolas — o ícone, a barra
// de 3px com a cor da escola e a descrição — é opcional. Sem esses, fica
// a linha simples que os hubs precisam: nome, contagem e seta.
export function CartaoLink({
  href,
  nome,
  descricao,
  icone,
  iconeTamanho,
  cor,
  novidade = false,
  contagem,
}: {
  href: string
  nome: string
  descricao?: string
  // Caminho de imagem (as escolas) ou um SVG de linha já pronto (o convite
  // para instalar a app). A caixa de 46px é a mesma nos dois casos.
  icone?: string | React.ReactNode
  iconeTamanho?: number
  cor?: string
  novidade?: boolean
  // Distintivo numérico (pedidos por responder, notificações por ler).
  // Escondido a zero, para não haver um "0" a pedir atenção sem motivo.
  contagem?: number
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-[14px] overflow-hidden rounded-[18px] border border-[var(--color-linha)] bg-white py-[15px] pl-[22px] pr-[16px] transition duration-150 hover:-translate-y-px hover:border-[var(--color-azul-logo)]"
    >
      {/* Barra de 3px que identifica a escola (secção 6). */}
      {cor && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ backgroundColor: cor }}
        />
      )}

      {icone && (
        <span
          aria-hidden="true"
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: 'var(--color-papel-2)' }}
        >
          {typeof icone === 'string' ? (
            <Image
              src={icone}
              alt=""
              width={iconeTamanho}
              height={iconeTamanho}
              className="object-contain"
              style={{ width: iconeTamanho, height: iconeTamanho }}
            />
          ) : (
            icone
          )}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-[6px]">
          <span
            className="whitespace-nowrap text-[16.5px] font-semibold leading-[1.2]"
            style={{
              fontFamily: 'var(--font-fraunces)',
              color: 'var(--color-azul-fundo)',
            }}
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
            className="mt-[2px] block text-[12.5px] leading-[1.35]"
            style={{ color: 'var(--color-tinta-suave)' }}
          >
            {descricao}
          </span>
        )}
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
  )
}
