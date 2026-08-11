// Superfície de cartão do DESIGN_SYSTEM.md (secção 2): branco com borda
// "--linha", raio 18px (secção 5) e o padding de cartão da secção 4.
//
// É o cartão genérico. O CartaoEscola não serve aqui: é uma linha
// horizontal com caixa de ícone, barra de cor e seta, desenhada para a
// lista de escolas da página inicial.
export function Cartao({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[18px] border border-[var(--color-linha)] bg-white p-[22px] ${className}`}
    >
      {children}
    </div>
  )
}
