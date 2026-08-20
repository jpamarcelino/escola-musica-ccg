// O histórico de mensagens, em português.
//
// A base guarda o alvo como foi escolhido (`publico` + `filtro` + os
// ids), que é o que permite dizer mais do que "enviada a 34 pessoas" —
// mas é vocabulário de tabela. A tradução vive aqui porque as duas
// páginas que mostram histórico (secretaria e professor) precisam da
// mesma frase.

export type MensagemEnviada = {
  id: number
  assinatura: string | null
  corpo: string
  publico: string
  filtro: string
  programa: string | null
  destinatarios: number
  criado_em: string
  autor?: { nome: string } | null
}

const ESCOLA: Record<string, string> = {
  musica: 'Música',
  danca: 'Dança',
  bebes: 'Música para bebés',
}

export function descreverAlvo(m: MensagemEnviada): string {
  if (m.publico === 'professores') {
    return m.filtro === 'todos' ? 'Todos os professores' : 'Professores escolhidos'
  }

  switch (m.filtro) {
    case 'todos':
      return 'Todos os alunos'
    case 'por_professor':
      return 'Alunos de professores escolhidos'
    case 'por_escola':
      return `Alunos de ${ESCOLA[m.programa ?? ''] ?? 'uma escola'}`
    default:
      return 'Alunos escolhidos'
  }
}
