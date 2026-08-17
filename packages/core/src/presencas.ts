import { dataEhFutura, diaSemanaDaData } from './datas'
import type { DiaSemana } from './dias-semana'

// As regras de quando se pode marcar uma presença.
//
// ATENÇÃO a uma coisa que não é óbvia: estas regras NÃO são impostas pela
// base de dados. A política de RLS da tabela `presencas` garante a posse
// — um professor só escreve presenças das suas matrículas — e mais nada.
// Que a data não seja no futuro, e que caia no dia da semana do horário,
// é verificado pela aplicação e só por ela.
//
// Isso já era verdade antes da app móvel: a Server Action da web faz esta
// verificação, mas quem tenha uma sessão válida consegue escrever direto
// na base de dados sem passar por ela. O que a app móvel muda é o número
// de sítios onde a regra tem de estar escrita — daí estar aqui, uma vez.
//
// Fechar isto a sério quer uma constraint ou um trigger no Postgres, ou
// seja uma migração e uma alteração ao esquema de produção. Fica na
// dívida conhecida, para ser decisão do dono do projeto e não minha.

export function validarDataDePresenca(
  data: string,
  diaDoHorario: DiaSemana
): string | null {
  if (!data) return 'Indica a data da aula.'

  if (dataEhFutura(data)) {
    return 'Não é possível marcar presenças para uma data futura.'
  }

  const dia = diaSemanaDaData(data)
  if (dia !== diaDoHorario) {
    return `Essa data não é uma ${diaDoHorario}, o dia deste horário.`
  }

  return null
}
