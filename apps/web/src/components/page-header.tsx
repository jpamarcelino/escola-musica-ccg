import { VoltarAtras } from '@/components/voltar-atras'

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
  // Destino de recurso e não destino da seta: ela recua de verdade, e só
  // cai aqui quando não há nada para onde recuar.
  voltar: string
}) {
  return (
    <div className="flex items-center gap-[12px]">
      <VoltarAtras destino={voltar} className="back-button" />
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
