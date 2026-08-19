import { formatarDataEscolar, hojeISO, mesesDoCalendario, type DiaDoCalendario } from '@ccg/core'
import type { AulaNoCalendario, GrupoDoCalendario, TipoDeAula } from '@/lib/calendario'

const DIAS_CABECALHO = [
  { curto: 'D', longo: 'Domingo' },
  { curto: 'S', longo: 'Segunda' },
  { curto: 'T', longo: 'Terça' },
  { curto: 'Q', longo: 'Quarta' },
  { curto: 'Q', longo: 'Quinta' },
  { curto: 'S', longo: 'Sexta' },
  { curto: 'S', longo: 'Sábado' },
]

const CLASSE_ESTADO: Record<DiaDoCalendario['estado'], string> = {
  aula: 'calendario-dia-aula',
  fim_de_semana: 'calendario-dia-fechado',
  feriado: 'calendario-dia-fechado',
  interrupcao: 'calendario-dia-fechado',
  fora_do_ano: 'calendario-dia-fechado',
}

const ROTULO_AULA: Record<TipoDeAula, string> = {
  aula: 'Aula',
  reposicao: 'Reposição',
  desmarcada: 'Desmarcada',
}

// O que dizer por baixo do número, quando não há aulas nesse dia.
//
// Os fins de semana não levam nada: escrever "fim de semana" 104 vezes
// num calendário só ensina o que toda a gente já sabe. Feriado e férias
// levam, porque são a diferença entre "não tenho aula" e "esqueci-me".
function rotuloDoEstado(dia: DiaDoCalendario): string | null {
  if (dia.estado === 'feriado') return 'Feriado'
  if (dia.estado === 'interrupcao') return 'Férias'
  if (dia.estado === 'fora_do_ano') return 'Férias'
  return null
}

function descricaoDoDia(dia: DiaDoCalendario, aulas: AulaNoCalendario[]): string {
  const data = formatarDataEscolar(dia.data, { weekday: 'long', day: 'numeric', month: 'long' })
  const estado =
    dia.motivo ??
    (dia.estado === 'aula'
      ? 'dia de aulas'
      : dia.estado === 'fim_de_semana'
        ? 'fim de semana'
        : 'sem aulas')
  if (aulas.length === 0) return `${data} — ${estado}`
  return `${data} — ${estado}. ${aulas.map((a) => `${a.titulo}, ${a.detalhe}`).join('. ')}`
}

// O calendário do ano letivo, de setembro a agosto.
//
// Os dias de aulas a azul e tudo o resto a cinzento — é a única pergunta
// que traz alguém a um calendário escolar ("há aula no dia 8?"), e a
// resposta tem de se ver sem ler nada. Por baixo do número, o que há
// nesse dia: aula, reposição, desmarcada, feriado, férias.
//
// Não é interativo de propósito. Um calendário de doze meses com casas
// clicáveis num telemóvel é uma coleção de alvos pequenos demais para o
// dedo; a agenda continua a ser o sítio onde se age sobre uma aula.
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
  // Com um aluno só, a cor não distingue nada de nada — o ponto ao lado
  // de "Aula" seria decoração, e a legenda uma linha a explicar-se a si
  // própria.
  const distinguirGrupos = grupos.length > 1

  return (
    <div className="space-y-6">
      <div className="calendario-legenda">
        <span>
          <i className="calendario-amostra calendario-dia-aula" aria-hidden="true" /> Dias de aulas
        </span>
        <span>
          <i className="calendario-amostra calendario-dia-fechado" aria-hidden="true" /> Sem aulas
        </span>
        {distinguirGrupos &&
          grupos.map((g) => (
            <span key={g.chave}>
              <i
                className="calendario-amostra calendario-ponto"
                data-cor={indiceDoGrupo.get(g.chave)}
                aria-hidden="true"
              />{' '}
              {g.nome}
            </span>
          ))}
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
                      const estado = rotuloDoEstado(dia)
                      return (
                        <td key={j}>
                          <span
                            className={`calendario-dia ${CLASSE_ESTADO[dia.estado]} ${dia.data === hoje ? 'calendario-dia-hoje' : ''}`}
                            title={descricaoDoDia(dia, aulas)}
                          >
                            <span className="calendario-dia-numero" aria-hidden="true">
                              {Number(dia.data.slice(8))}
                            </span>
                            <span className="sr-only">{descricaoDoDia(dia, aulas)}</span>
                            {/* Duas aulas cabem; à terceira, o dia
                                passa a dizer quantas são. Encher a casa
                                de linhas de 8px não é mostrar mais, é
                                deixar de se ler. */}
                            {aulas.slice(0, 2).map((aula, k) => (
                              <span key={k} className="calendario-evento" aria-hidden="true">
                                <span className="calendario-evento-rotulo" data-tipo={aula.tipo}>
                                  {ROTULO_AULA[aula.tipo]}
                                </span>
                                {/* De quem é a aula, por baixo. Fora da
                                    linha da palavra e não ao lado dela:
                                    numa casa de 43px, um ponto ao lado
                                    de "Desmarcada" era o que faltava
                                    para a palavra deixar de caber. */}
                                {distinguirGrupos && (
                                  <span
                                    className="calendario-evento-nome"
                                    data-cor={indiceDoGrupo.get(aula.grupo) ?? 0}
                                  >
                                    {aula.titulo.split(' ')[0]}
                                  </span>
                                )}
                              </span>
                            ))}
                            {aulas.length > 2 && (
                              <span className="calendario-evento" aria-hidden="true">
                                <span className="calendario-evento-rotulo">
                                  +{aulas.length - 2}
                                </span>
                              </span>
                            )}
                            {aulas.length === 0 && estado && (
                              <span className="calendario-evento" aria-hidden="true">
                                <span className="calendario-evento-rotulo" data-tipo="fechado">
                                  {estado}
                                </span>
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
    </div>
  )
}
