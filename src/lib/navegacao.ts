import type { ItemNav } from '@/components/bottom-navigation'

// Uma Conta CCG é o perfil de quem gere alunos — por oposição a professor
// e a admin. Chamava-se 'aluno' até à migração 0025, nome que confundia a
// conta com a pessoa que tem aulas.
//
// Continua a ser uma função e não uma comparação solta porque é o sítio
// único onde este conceito está definido: se um dia houver outro tipo de
// conta que também gere alunos, muda-se aqui.
export function ehContaCCG(tipo: string | undefined | null): boolean {
  return tipo === 'conta'
}

// Barras de navegação inferior da Conta CCG, num sítio só — antes estava
// copiada em três layouts (/dashboard, /aluno/(gerais) e /aluno/[alunoId]),
// e cada cópia foi divergindo.
//
// A regra que as separa: a barra global nunca aponta para um aluno em
// concreto. A versão anterior escolhia o primeiro aluno da conta com um
// `.limit(1)` para preencher "Agenda" e "Aluno" — quem tivesse dois filhos
// carregava em "Aluno" e caía sempre no mesmo, sem perceber porquê, e quem
// não tivesse nenhum ia parar a /dashboard disfarçado de outro separador.

// Conta CCG fora da área de um aluno. Todos os destinos são de família.
export const NAV_CONTA: ItemNav[] = [
  { href: '/dashboard', label: 'Hoje', icone: 'inicio', correspondencia: 'exata' },
  { href: '/dashboard/agenda', label: 'Agenda', icone: 'calendario' },
  { href: '/dashboard/alunos', label: 'Alunos', icone: 'alunos' },
  { href: '/dashboard/avisos', label: 'Avisos', icone: 'notificacoes' },
  { href: '/dashboard/conta', label: 'Conta', icone: 'perfil' },
]

// Dentro da área de um aluno, "Agenda" e "Aluno" passam a apontar
// explicitamente para ESSE aluno — o alunoId vem do URL, não de uma
// consulta à base de dados.
export function navAluno(alunoId: string): ItemNav[] {
  return [
    { href: '/dashboard', label: 'Hoje', icone: 'inicio', correspondencia: 'exata' },
    { href: `/aluno/${alunoId}/horario`, label: 'Agenda', icone: 'calendario' },
    { href: `/aluno/${alunoId}`, label: 'Aluno', icone: 'alunos', correspondencia: 'exata' },
    { href: '/dashboard/avisos', label: 'Avisos', icone: 'notificacoes' },
    { href: '/dashboard/conta', label: 'Conta', icone: 'perfil' },
  ]
}

export const NAV_PROFESSOR: ItemNav[] = [
  { href: '/dashboard', label: 'Hoje', icone: 'inicio', correspondencia: 'exata' },
  { href: '/dashboard/agenda', label: 'Agenda', icone: 'calendario' },
  { href: '/dashboard/presencas', label: 'Presenças', icone: 'presencas' },
  { href: '/dashboard/pedidos', label: 'Pedidos', icone: 'pedidos' },
  { href: '/dashboard/conta', label: 'Conta', icone: 'perfil' },
]
