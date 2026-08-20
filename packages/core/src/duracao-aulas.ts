// Quanto dura uma aula, por escola.
//
// Não é uma escolha do professor: é uma regra da casa. Cada escola tem a
// sua duração e ela é a mesma para toda a gente — dois professores de
// música com aulas de tamanhos diferentes davam duas escolas dentro da
// mesma escola, e a mensalidade é igual para os dois.
//
// Vive no core porque decide três coisas em sítios afastados: os blocos
// que se geram ao criar horários, a validação de um horário editado à
// mão, e o que os ecrãs dizem à pessoa antes de ela escrever seja o que
// for.

export type ProgramaEscola = 'musica' | 'danca' | 'bebes'

export const DURACAO_AULA: Record<ProgramaEscola, number> = {
  musica: 45,
  danca: 50,
  // Música para Bebés e crianças. Os horários destas são criados pela
  // secretaria e não pelo professor — mas a duração é a mesma regra.
  bebes: 60,
}

export function duracaoDaAula(programa: string | null | undefined): number | null {
  if (programa === 'musica' || programa === 'danca' || programa === 'bebes') {
    return DURACAO_AULA[programa]
  }
  return null
}

// Quem cria os seus próprios horários. Em Bebés, os horários são
// definidos pela secretaria: são aulas de grupo, e a grelha é montada
// para a escola inteira e não professor a professor.
export function professorCriaHorarios(programa: string | null | undefined): boolean {
  return programa === 'musica' || programa === 'danca'
}

// Os minutos entre duas horas "HH:MM". Devolve null se alguma delas não
// vier no formato — quem chama decide o que dizer nesse caso.
export function minutosEntre(horaInicio: string, horaFim: string): number | null {
  const partes = /^(\d{2}):(\d{2})/
  const a = partes.exec(horaInicio)
  const b = partes.exec(horaFim)
  if (!a || !b) return null
  return (Number(b[1]) * 60 + Number(b[2])) - (Number(a[1]) * 60 + Number(a[2]))
}
