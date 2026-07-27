import Link from 'next/link'

export function PagamentosTabs({ ativo }: { ativo: 'confirmar' | 'historico' }) {
  return (
    <div className="presencas-tabs">
      <Link
        href="/admin/pagamentos"
        className={`presencas-tab${ativo === 'confirmar' ? ' ativo' : ''}`}
      >
        Mensalidades por Confirmar
      </Link>
      <Link
        href="/admin/pagamentos/historico"
        className={`presencas-tab${ativo === 'historico' ? ' ativo' : ''}`}
      >
        Histórico de Mensalidades
      </Link>
    </div>
  )
}
