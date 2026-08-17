// Anel de progresso (DESIGN_SYSTEM_V2.md secção 9) em dois tamanhos:
//
// "grande" — peça central do hero do professor (ocupação da agenda).
//   Vive sempre sobre o --gradient-hero, com o único efeito "vidro" da
//   app. Nunca sobre superfície branca.
//
// "pequeno" — indicador compacto dentro de cartões brancos (assiduidade
//   de cada filho na Home do encarregado, ficha de aluno no admin).
//   Sem vidro: traço azul sobre pista cinzenta.
//
// O número ao centro é sempre um dado real, nunca uma métrica inventada
// só para preencher o círculo.

const CONFIG = {
  grande: { tamanho: 220, espessura: 10 },
  pequeno: { tamanho: 64, espessura: 6 },
} as const

export function AnelProgresso({
  valor,
  numero,
  label,
  legenda,
  icone,
  tamanho = 'grande',
}: {
  // 0–100. Controla o preenchimento do anel.
  valor: number
  // O que aparece grande ao centro — normalmente numero+"%", mas pode
  // ser qualquer texto curto ("3", "5 aulas").
  numero: string
  label: string
  legenda?: string
  icone?: React.ReactNode
  tamanho?: 'grande' | 'pequeno'
}) {
  const { tamanho: px, espessura } = CONFIG[tamanho]
  const raio = (px - espessura) / 2
  const circunferencia = 2 * Math.PI * raio
  const valorClamped = Math.max(0, Math.min(100, valor))
  const offset = circunferencia * (1 - valorClamped / 100)
  const grande = tamanho === 'grande'

  const anel = (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      className="absolute inset-0 -rotate-90"
      aria-hidden="true"
    >
      <circle
        cx={px / 2}
        cy={px / 2}
        r={raio}
        fill="none"
        stroke={grande ? 'rgba(255,255,255,.2)' : 'var(--color-surface-raised)'}
        strokeWidth={espessura}
      />
      <circle
        cx={px / 2}
        cy={px / 2}
        r={raio}
        fill="none"
        stroke={grande ? '#ffffff' : 'var(--color-primary-mid)'}
        strokeWidth={espessura}
        strokeLinecap="round"
        strokeDasharray={circunferencia}
        strokeDashoffset={offset}
        className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700"
        style={{ transitionTimingFunction: 'var(--ease-suave)' }}
      />
    </svg>
  )

  if (!grande) {
    // Versão compacta: só o número dentro do anel; o label fica a cargo
    // do cartão que o rodeia (que já diz "Assiduidade" no seu contexto).
    return (
      <div
        className="relative flex shrink-0 items-center justify-center rounded-full"
        style={{ width: px, height: px }}
        role="img"
        aria-label={`${label}: ${numero}`}
      >
        {anel}
        <span
          className={`relative font-bold ${numero.length > 3 ? 'text-[12px]' : 'text-[15px]'}`}
          style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-primary)' }}
        >
          {numero}
        </span>
      </div>
    )
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center rounded-full"
      style={{
        width: px,
        height: px,
        // O preenchimento escurece (azul-fundo) em vez de clarear
        // (branco). Um véu branco subia a luminosidade e derrubava o
        // contraste do texto branco por cima — 4.04:1 no ponto mais
        // claro do gradiente, abaixo do mínimo AA. Assim o anel passa
        // AA em qualquer ponto do gradiente (5.04:1 no pior caso), sem
        // depender de onde fica na composição. O aspeto de vidro vem do
        // blur e da borda clara.
        backgroundColor: 'rgba(27,79,122,.18)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,.35)',
      }}
    >
      {anel}
      <div
        className="relative flex flex-col items-center gap-[4px] px-[24px] text-center text-white"
        role="img"
        aria-label={`${label}: ${numero}${legenda ? `, ${legenda}` : ''}`}
      >
        {icone && <span aria-hidden="true">{icone}</span>}
        <span className="text-[13px] font-medium leading-[1.3]">{label}</span>
        <span
          className="text-[44px] font-bold leading-[1]"
          style={{ fontFamily: 'var(--font-fraunces)' }}
        >
          {numero}
        </span>
        {legenda && <span className="text-[12px]">{legenda}</span>}
      </div>
    </div>
  )
}
