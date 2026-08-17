import { BackButton } from '@/components/back-button'

// Cabeçalho das páginas interiores (REDESIGN_PLAN_V2 secção 4): fundo
// branco, título em Fraunces, BackButton. O hero em gradiente é só para
// ecrãs de entrada — aqui o objetivo é orientação rápida, não impacto.
export function PageHeader({
  titulo,
  subtitulo,
  voltar,
}: {
  titulo: React.ReactNode
  subtitulo?: React.ReactNode
  voltar: string
}) {
  return (
    <div className="flex items-center gap-[12px]">
      <BackButton href={voltar} />
      <div className="min-w-0">
        <h1
          className="truncate text-[24px] font-semibold leading-[1.2]"
          style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-text-primary)' }}
        >
          {titulo}
        </h1>
        {subtitulo && (
          <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
            {subtitulo}
          </p>
        )}
      </div>
    </div>
  )
}
