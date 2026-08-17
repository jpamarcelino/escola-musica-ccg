// A ordem importa e é indexada pela posição: datas.ts converte o getDay()
// do JavaScript (0 = Domingo) para esta convenção (0 = Segunda). Trocar a
// ordem aqui faz a marcação de presenças gravar no dia errado sem dar
// erro nenhum — por isso há um teste que fixa a ordem.
//
// O `as const` não é decoração: é o que dá o tipo DiaSemana abaixo, e é
// esse tipo que impede um `'Terca'` sem cedilha de compilar. A tabela
// horarios tem uma constraint CHECK com estes mesmos sete valores, e o
// @ccg/types tem um teste que confirma que as duas listas não divergiram.
export const DIAS_SEMANA = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
] as const

export type DiaSemana = (typeof DIAS_SEMANA)[number]
