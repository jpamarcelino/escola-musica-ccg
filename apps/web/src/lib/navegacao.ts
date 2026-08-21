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
//
// O separador do meio era "Alunos" e abria a gestão de perfis — uma lista
// com um formulário de "adicionar aluno" por baixo. Isso é administração,
// e faz-se uma vez por ano; o que se abre todas as semanas é o material
// da aula. Passou a ser "Materiais", e a gestão de perfis continua a
// chegar-se pela Home e pela agenda, onde já estava ligada.
export const NAV_CONTA: ItemNav[] = [
  { href: '/dashboard', label: 'Hoje', icone: 'inicio', correspondencia: 'exata' },
  { href: '/dashboard/agenda', label: 'Agenda', icone: 'calendario' },
  { href: '/dashboard/materiais', label: 'Materiais', icone: 'materiais' },
  { href: '/dashboard/avisos', label: 'Avisos', icone: 'notificacoes' },
  { href: '/dashboard/conta', label: 'Conta', icone: 'perfil' },
]

// Dentro da área de um aluno, o separador do meio é o que muda: aponta
// para o caderno DESSE aluno — o alunoId vem do URL, não de uma consulta
// à base de dados.
//
// A agenda deixou de ser individual. Uma família com dois filhos quer ver
// a semana inteira de uma vez, não saltar entre duas agendas para saber
// quem tem aula a seguir; e com um filho só, a agenda individual e a da
// conta mostravam exatamente a mesma coisa. O que ganha em ser por aluno
// é o material — esse é de quem tem a aula.
export function navAluno(alunoId: string): ItemNav[] {
  return [
    { href: '/dashboard', label: 'Hoje', icone: 'inicio', correspondencia: 'exata' },
    { href: '/dashboard/agenda', label: 'Agenda', icone: 'calendario' },
    { href: `/aluno/${alunoId}/materiais`, label: 'Materiais', icone: 'materiais' },
    { href: '/dashboard/avisos', label: 'Avisos', icone: 'notificacoes' },
    { href: '/dashboard/conta', label: 'Conta', icone: 'perfil' },
  ]
}

// O separador dos avisos passa a ter ponto quando há coisas por ler.
//
// Fica aqui, e não em cada layout, porque são três os sítios que montam
// a barra da Conta CCG (/dashboard, /aluno/(gerais) e /aluno/[alunoId]) —
// e a última vez que uma regra destas viveu copiada nos três, as cópias
// divergiram (ver o comentário no topo).
export function comAvisosPorLer(itens: ItemNav[], quantidade: number): ItemNav[] {
  if (quantidade <= 0) return itens
  return itens.map((item) =>
    item.href === '/dashboard/avisos' ? { ...item, distintivo: quantidade } : item
  )
}

// O professor passou a ter Avisos. Recebia-os desde sempre — horário
// aceite, pedido de reposição, disciplina respondida — e não tinha onde
// os ler: as linhas ficavam na base de dados a acumular. Com push a
// entrar, um aviso que chega ao telemóvel tem de ter um sítio na app
// para onde levar.
//
// Não tem "Pedidos": com seis separadores a 375px cada um ficava com
// ~58px, e a barra deixava de se ler. Pedidos é a única das seis que não
// é um sítio onde se está — é uma fila que se despacha e fica vazia —,
// por isso passou para a lista de Gestão do "Hoje", que é onde o
// professor já vê quantos há por responder.
export const NAV_PROFESSOR: ItemNav[] = [
  { href: '/dashboard', label: 'Hoje', icone: 'inicio', correspondencia: 'exata' },
  { href: '/dashboard/agenda', label: 'Agenda', icone: 'calendario' },
  { href: '/dashboard/presencas', label: 'Presenças', icone: 'presencas' },
  { href: '/dashboard/avisos', label: 'Avisos', icone: 'notificacoes' },
  { href: '/dashboard/conta', label: 'Conta', icone: 'perfil' },
]
