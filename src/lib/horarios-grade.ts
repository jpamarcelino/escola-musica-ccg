// Partilhado entre a grelha do aluno (escolher horários de um professor) e a
// grelha do próprio professor (gerir os seus horários) — mesma unidade de
// medida e formatação, para as duas ficarem sempre visualmente coerentes.

// Altura em pixels de uma hora de relógio; cada cartão de horário ocupa
// exatamente a fração correspondente à sua duração real, não à altura da linha.
export const HOUR_HEIGHT = 64

export function paraMinutos(hhmmss: string): number {
  const [h, m] = hhmmss.split(':').map(Number)
  return h * 60 + m
}

export function formatarHora(hhmmss: string): string {
  const [h, m] = hhmmss.split(':').map(Number)
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}
