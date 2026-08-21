import type { PontoEvolucao } from '@ccg/core'

// SVG desenhado no servidor: são nove números, não precisa de biblioteca
// de gráficos nem de JavaScript no cliente para os mostrar.

const L = 26 // espaço à esquerda para os números do eixo
const R = 6
const TOPO = 22 // espaço acima para as etiquetas de valor
const BASE = 128
const LARGURA = 340
const ALTURA = 152

// A escala nunca é mais apertada do que 0–4: com um aluno só, uma escala
// justa punha a linha colada ao topo e dava a impressão de estar cheio.
function limiteDoEixo(maximo: number): number {
  if (maximo <= 4) return 4
  return maximo % 2 === 0 ? maximo : maximo + 1
}

export function GraficoEvolucaoAlunos({ pontos }: { pontos: PontoEvolucao[] }) {
  const limite = limiteDoEixo(Math.max(...pontos.map((p) => p.alunos)))
  const passo = (LARGURA - L - R) / (pontos.length - 1)

  const coords = pontos.map((p, i) => ({
    ...p,
    x: L + i * passo,
    y: BASE - (p.alunos / limite) * (BASE - TOPO),
  }))

  // A fronteira entre o que aconteceu e o que se supõe: o último ponto já
  // vivido pertence às duas linhas, para não haver buraco entre elas.
  const ultimoReal = coords.reduce((acc, p, i) => (p.previsto ? acc : i), -1)
  const reais = ultimoReal >= 0 ? coords.slice(0, ultimoReal + 1) : []
  const previstos = ultimoReal >= 0 ? coords.slice(ultimoReal) : coords

  const linha = (ps: typeof coords) => ps.map((p) => `${p.x},${p.y}`).join(' ')
  const area =
    reais.length > 1
      ? [
          `M ${reais[0].x},${BASE}`,
          ...reais.map((p) => `L ${p.x},${p.y}`),
          `L ${reais[reais.length - 1].x},${BASE}`,
          'Z',
        ].join(' ')
      : null

  const resumo = pontos
    .map((p) => `${p.label}: ${p.alunos}${p.previsto ? ' (previsto)' : ''}`)
    .join('; ')

  return (
    <figure className="grafico-alunos">
      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        role="img"
        aria-label={`Alunos por mês, de outubro de 2026 a junho de 2027. ${resumo}.`}
        preserveAspectRatio="xMidYMid meet"
      >
        {[0, limite / 2, limite].map((valor) => {
          const y = BASE - (valor / limite) * (BASE - TOPO)
          return (
            <g key={valor}>
              <line x1={L} y1={y} x2={LARGURA - R} y2={y} className="grafico-alunos-grelha" />
              <text x={L - 7} y={y + 3.5} textAnchor="end" className="grafico-alunos-eixo">
                {valor}
              </text>
            </g>
          )
        })}

        {area && <path d={area} className="grafico-alunos-area" />}
        {reais.length > 1 && <polyline points={linha(reais)} className="grafico-alunos-linha" />}
        {previstos.length > 1 && (
          <polyline points={linha(previstos)} className="grafico-alunos-linha grafico-alunos-linha-prevista" />
        )}

        {coords.map((p) => (
          <g key={`${p.ano}-${p.mes}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={3.5}
              className={p.previsto ? 'grafico-alunos-ponto grafico-alunos-ponto-previsto' : 'grafico-alunos-ponto'}
            />
            <text x={p.x} y={p.y - 9} textAnchor="middle" className="grafico-alunos-valor">
              {p.alunos}
            </text>
            <text x={p.x} y={BASE + 18} textAnchor="middle" className="grafico-alunos-mes">
              {p.label.slice(0, 3)}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  )
}
