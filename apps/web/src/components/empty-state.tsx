// Estado vazio reutilizável — substitui as ~25 linhas de texto solto
// "Ainda não há X" espalhadas pela app. Explica o que devia aparecer ali e,
// quando fizer sentido, dá uma próxima ação em vez de deixar o utilizador
// sem saída.
export function EmptyState({
  titulo,
  descricao,
  acao,
}: {
  titulo: string
  descricao?: string
  acao?: React.ReactNode
}) {
  return (
    <div className="empty-editorial" role="status">
      <p
        className="empty-editorial-titulo"
      >
        {titulo}
      </p>
      {descricao && (
        <p className="empty-editorial-descricao">
          {descricao}
        </p>
      )}
      {acao && <div className="empty-editorial-acao">{acao}</div>}
    </div>
  )
}
