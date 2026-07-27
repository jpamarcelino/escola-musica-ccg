import Link from 'next/link'

export function PresencasTabs({ ativo }: { ativo: 'confirmar' | 'historico' }) {
  return (
    <div className="presencas-tabs">
      <Link
        href="/dashboard/presencas"
        className={`presencas-tab${ativo === 'confirmar' ? ' ativo' : ''}`}
      >
        Confirmar presenças
      </Link>
      <Link
        href="/dashboard/presencas/historico"
        className={`presencas-tab${ativo === 'historico' ? ' ativo' : ''}`}
      >
        Histórico
      </Link>
    </div>
  )
}
