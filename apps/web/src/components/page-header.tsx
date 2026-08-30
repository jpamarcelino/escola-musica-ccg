import { BackButton } from '@/components/back-button'
import { BotaoVoltarHistorico } from '@/components/botao-voltar-historico'

// Cabeçalho das páginas interiores (REDESIGN_PLAN_V2 secção 4): fundo
// branco, título em Fraunces, BackButton. O hero em gradiente é só para
// ecrãs de entrada — aqui o objetivo é orientação rápida, não impacto.
export function PageHeader({
  titulo,
  subtitulo,
  voltar,
  voltarPeloHistorico = false,
}: {
  titulo: React.ReactNode
  subtitulo?: React.ReactNode
  // Para onde a seta aponta. Com "voltarPeloHistorico", passa a ser só o
  // destino de recurso: a seta recua de verdade, e só cai aqui quando não
  // há nada para onde recuar.
  voltar: string
  voltarPeloHistorico?: boolean
}) {
  return (
    <div className="flex items-center gap-[12px]">
      {voltarPeloHistorico ? (
        <BotaoVoltarHistorico href={voltar} />
      ) : (
        <BackButton href={voltar} />
      )}
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
