// Regras de idade por disciplina, partilhadas entre o ecrã de escolha
// (src/app/aluno/pedido/page.tsx, só para mostrar/bloquear os cartões) e a
// ação do servidor que cria o pedido (src/lib/actions/aluno.ts, que é quem
// realmente impede o pedido de avançar). Manter as duas em sincronia é
// importante: uma sem a outra só dá segurança de fachada.

// Idade mínima/máxima aceite por disciplina. Para a Música ainda não há
// escalões próprios por instrumento — usa-se um intervalo largo para
// todos, por agora.
export const MUSICA_IDADE_MIN = 5
export const MUSICA_IDADE_MAX = 80

// As modalidades de dança guardam a faixa etária entre parênteses no nome
// (ex: "Estilos Urbanos (6 aos 18 anos)"); separa-a do título.
export function separarFaixaEtaria(nome: string): { titulo: string; idade?: string } {
  const match = nome.match(/^(.*)\s\(([^)]+)\)$/)
  if (!match) return { titulo: nome }
  return { titulo: match[1], idade: match[2] }
}

export function parseFaixaEtaria(idade: string | undefined): { min: number; max: number } | null {
  if (!idade) return null
  const match = idade.match(/(\d+)\s*aos\s*(\d+)/)
  if (!match) return null
  return { min: Number(match[1]), max: Number(match[2]) }
}

// Sem data de nascimento (contas antigas, criadas antes deste campo
// existir), não há como saber a idade — nesse caso não bloqueia nada.
export function dentroDaFaixa(
  idadeAluno: number | null,
  faixa: { min: number; max: number } | null
): boolean {
  if (idadeAluno === null || !faixa) return true
  return idadeAluno >= faixa.min && idadeAluno <= faixa.max
}

export function elegivelParaDisciplina(
  idadeAluno: number | null,
  programa: string | null | undefined,
  nomeInstrumento: string
): boolean {
  if (programa === 'danca') {
    const { idade } = separarFaixaEtaria(nomeInstrumento)
    return dentroDaFaixa(idadeAluno, parseFaixaEtaria(idade))
  }
  // "Música para bebés" guarda a faixa etária no próprio nome (ex: "0 aos 3
  // anos"), sem título separado — parseFaixaEtaria já procura o padrão
  // "X aos Y" em qualquer posição da string.
  if (programa === 'bebes') {
    return dentroDaFaixa(idadeAluno, parseFaixaEtaria(nomeInstrumento))
  }
  return dentroDaFaixa(idadeAluno, { min: MUSICA_IDADE_MIN, max: MUSICA_IDADE_MAX })
}
