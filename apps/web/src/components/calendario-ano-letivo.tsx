import {
  ANO_LETIVO_FIM,
  ANO_LETIVO_INICIO,
  INTERRUPCOES,
  feriados,
  formatarDataEscolar,
  hojeISO,
  mesesDoCalendario,
  type DiaDoCalendario,
} from '@ccg/core'
import type { AulaNoCalendario, GrupoDoCalendario } from '@/lib/calendario'

const DIAS_CABECALHO = [
  { curto: 'S', longo: 'Segunda' },
  { curto: 'T', longo: 'Terça' },
  { curto: 'Q', longo: 'Quarta' },
  { curto: 'Q', longo: 'Quinta' },
  { curto: 'S', longo: 'Sexta' },
  { curto: 'S', longo: 'Sábado' },
  { curto: 'D', longo: 'Domingo' },
]

const CLASSE_ESTADO: Record<DiaDoCalendario['estado'], string> = {
  aula: 'calendario-dia-aula',
  fim_de_semana: 'calendario-dia-fechado',
  feriado: 'calendario-dia-fechado',
  interrupcao: 'calendario-dia-fechado',
  fora_do_ano: 'calendario-dia-fechado',
}

function rotuloDoDia(dia: DiaDoCalendario, aulas: AulaNoCalendario[]): string {
  const data = formatarDataEscolar(dia.data, { weekday: 'long', day: 'numeric', month: 'long' })
  const estado =
    dia.motivo ??
    (dia.estado === 'aula'
      ? 'dia de aulas'
      : dia.estado === 'fim_de_semana'
        ? 'fim de semana'
        : 'fora do ano letivo')
  if (aulas.length === 0) return `${data} — ${estado}`
  return `${data} — ${estado}. ${aulas.map((a) => `${a.titulo}, ${a.detalhe}`).join('. ')}`
}

// O calendário do ano letivo, de setembro a agosto.
//
// Os dias de aulas a azul e tudo o resto a cinzento — é a única pergunta
// que traz alguém a um calendário escolar ("há aula no dia 8?"), e a
// resposta tem de se ver sem ler nada. Por cima disso, um ponto por aula
// marcada: quem tem aulas quer saber onde é que as suas caem, não só que
// dias a escola abre.
//
// Não é interativo de propósito. Um calendário de doze meses com casas
// clicáveis num telemóvel é uma coleção de alvos pequenos demais para o
// dedo; o que cada dia tem vai no `aria-label` e no `title`, e a agenda
// continua a ser o sítio onde se age sobre uma aula.
export function CalendarioAnoLetivo({
  porData,
  grupos,
}: {
  porData: Map<string, AulaNoCalendario[]>
  grupos: GrupoDoCalendario[]
}) {
  const meses = mesesDoCalendario()
  const hoje = hojeISO()
  const indiceDoGrupo = new Map(grupos.map((g, i) => [g.chave, i % 4]))

  const paragens = [
    ...[...feriados(2026), ...feriados(2027)]
      .filter(([data]) => data >= ANO_LETIVO_INICIO && data <= ANO_LETIVO_FIM)
      .map(([data, nome]) => ({ data, nome })),
    ...INTERRUPCOES.map((i) => ({ data: i.inicio, nome: i.nome })),
  ].sort((a, b) => a.data.localeCompare(b.data))

  return (
    <div className="space-y-6">
      <div className="calendario-legenda">
        <span>
          <i className="calendario-amostra calendario-dia-aula" aria-hidden="true" /> Dias de aulas
        </span>
        <span>
          <i className="calendario-amostra calendario-dia-fechado" aria-hidden="true" /> Sem aulas
        </span>
        {grupos.map((g) => (
          <span key={g.chave}>
            <i
              className="calendario-amostra calendario-ponto"
              data-cor={indiceDoGrupo.get(g.chave)}
              aria-hidden="true"
            />{' '}
            {g.nome}
          </span>
        ))}
        {grupos.length === 0 && porData.size > 0 && (
          <span>
            <i className="calendario-amostra calendario-ponto" data-cor={0} aria-hidden="true" /> As
            tuas aulas
          </span>
        )}
      </div>

      <div className="calendario-meses">
        {meses.map((mes) => (
          <section key={`${mes.ano}-${mes.mes}`} className="calendario-mes">
            <h2>
              {mes.label} <span>{mes.ano}</span>
            </h2>
            <table>
              <thead>
                <tr>
                  {DIAS_CABECALHO.map((d, i) => (
                    <th key={i} scope="col">
                      <abbr title={d.longo}>{d.curto}</abbr>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mes.semanas.map((semana, i) => (
                  <tr key={i}>
                    {semana.map((dia, j) => {
                      if (!dia) return <td key={j} className="calendario-vazio" />
                      const aulas = porData.get(dia.data) ?? []
                      const rotulo = rotuloDoDia(dia, aulas)
                      return (
                        <td key={j}>
                          <span
                            className={`calendario-dia ${CLASSE_ESTADO[dia.estado]} ${dia.data === hoje ? 'calendario-dia-hoje' : ''}`}
                            title={rotulo}
                          >
                            <span aria-hidden="true">{Number(dia.data.slice(8))}</span>
                            <span className="sr-only">{rotulo}</span>
                            {aulas.length > 0 && (
                              <span className="calendario-pontos" aria-hidden="true">
                                {aulas.slice(0, 3).map((aula, k) => (
                                  <i
                                    key={k}
                                    className="calendario-ponto"
                                    data-cor={indiceDoGrupo.get(aula.grupo) ?? 0}
                                  />
                                ))}
                              </span>
                            )}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      {/* Porque é que o dia 25 está a cinzento. Sem esta lista, um dia
          fechado a meio da semana parece um erro do calendário. */}
      <section className="space-y-3 border-t border-[var(--color-linha)] pt-6">
        <h2 className="font-semibold">Dias em que a escola fecha</h2>
        <ul className="space-y-1 text-sm text-foreground/70">
          {paragens.map((p) => (
            <li key={p.data}>
              <strong className="font-medium text-foreground">
                {formatarDataEscolar(p.data, { day: 'numeric', month: 'long' })}
              </strong>{' '}
              · {p.nome}
            </li>
          ))}
        </ul>
        {INTERRUPCOES.length === 0 && (
          <p className="text-sm text-foreground/60">
            As interrupções do Natal, do Carnaval e da Páscoa ainda não estão marcadas. Assim que a
            escola as definir, aparecem aqui e os dias ficam a cinzento.
          </p>
        )}
      </section>
    </div>
  )
}
