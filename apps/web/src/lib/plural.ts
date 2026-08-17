// Concordância de número — para não voltar a aparecer "1 alunos".
//
// A app tinha isto resolvido à mão em sítios soltos (contarRecomendacoes
// em admin/recomendacoes/estudo) e por resolver noutros, onde o número
// era interpolado directamente antes do plural fixo.
//
// Não usa Intl.PluralRules de propósito: em português a regra é só
// "um / muitos", e o que varia de facto é a palavra — "aula/aulas",
// mas também "1 aluno por marcar" vs "3 alunos por marcar". Passar a
// forma singular e a plural é mais claro à leitura do que uma regra
// genérica.
export function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

// Quando o número não deve aparecer — "aula" vs "aulas" numa frase que
// já diz a quantidade de outra maneira.
export function palavra(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural
}
