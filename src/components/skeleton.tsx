// Blocos de esqueleto — usados em loading.tsx para evitar o ecrã em branco
// enquanto a página carrega dados do servidor. Pulsam com opacidade em vez
// de brilho a deslizar (mais discreto, mais perto do "papel" da marca do
// que o efeito "shimmer" típico). Respeita prefers-reduced-motion.
function Bloco({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse motion-reduce:animate-none rounded-[13px] ${className ?? ''}`}
      style={{ backgroundColor: 'var(--color-papel-2)', ...style }}
    />
  )
}

// Imita a forma de uma lista de cartões navegáveis — o padrão mais comum
// da app (hubs, listas de alunos/professores, histórico).
export function SkeletonLista({ linhas = 4 }: { linhas?: number }) {
  return (
    <div className="flex flex-col gap-[11px]" role="status" aria-label="A carregar…">
      {Array.from({ length: linhas }, (_, i) => (
        <Bloco key={i} className="h-[68px] w-full" style={{ borderRadius: 'var(--radius-cartao)' }} />
      ))}
    </div>
  )
}

// Cabeçalho de página (título + subtítulo), para juntar antes da lista.
export function SkeletonCabecalho() {
  return (
    <div className="space-y-[8px]" role="status" aria-label="A carregar…">
      <Bloco className="h-[26px] w-[55%]" />
      <Bloco className="h-[14px] w-[35%]" />
    </div>
  )
}
