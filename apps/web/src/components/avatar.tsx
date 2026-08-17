/* eslint-disable @next/next/no-img-element */
// Avatar circular — foto quando existe (professores têm foto_url),
// inicial sobre fundo suave quando não. Tamanhos alinhados aos alvos
// de toque e às linhas de lista.
const TAMANHOS = { pequeno: 36, medio: 44, grande: 64 } as const

export function Avatar({
  nome,
  fotoUrl,
  tamanho = 'medio',
}: {
  nome: string
  fotoUrl?: string | null
  tamanho?: keyof typeof TAMANHOS
}) {
  const px = TAMANHOS[tamanho]

  if (fotoUrl) {
    return (
      <img
        src={fotoUrl}
        alt=""
        width={px}
        height={px}
        className="shrink-0 rounded-full object-cover"
        style={{ width: px, height: px }}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: px,
        height: px,
        backgroundColor: 'var(--color-surface-raised)',
        color: 'var(--color-primary)',
        fontSize: px * 0.42,
        fontFamily: 'var(--font-fraunces)',
      }}
    >
      {nome.trim().slice(0, 1).toUpperCase()}
    </span>
  )
}
