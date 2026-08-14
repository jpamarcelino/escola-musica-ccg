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
    <div
      className="rounded-[var(--radius-cartao)] border px-[22px] py-[32px] text-center"
      style={{ borderColor: 'var(--color-linha)', backgroundColor: 'var(--color-papel-2)' }}
    >
      <p
        className="text-[14.5px] font-semibold"
        style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-azul-fundo)' }}
      >
        {titulo}
      </p>
      {descricao && (
        <p className="mt-[6px] text-[13px] leading-[1.5]" style={{ color: 'var(--color-tinta-suave)' }}>
          {descricao}
        </p>
      )}
      {acao && <div className="mt-[16px] flex justify-center">{acao}</div>}
    </div>
  )
}
