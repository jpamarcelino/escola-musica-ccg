import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// Para onde leva um aviso, dito em português.
//
// `tipos_aviso.destino` (migração 0041) guarda um caminho, que serve
// para a push e para o botão da página do aviso. Um botão que diga
// "/dashboard/reposicoes/pedidos" não diz nada a ninguém, e um botão
// genérico ("Abrir") obriga a pessoa a carregar para descobrir onde vai
// parar. Daí este mapa.
//
// Um destino desconhecido não fica sem botão: cai no texto neutro. E o
// próprio arquivo de avisos não conta como destino — é de onde a pessoa
// veio.
const TEXTOS: Record<string, string> = {
  '/dashboard/agenda': 'Ver na agenda',
  '/dashboard/pedidos': 'Ver o pedido',
  '/dashboard/reposicoes/pedidos': 'Ver os pedidos de reposição',
  '/dashboard/meus-alunos': 'Ver os teus alunos',
  '/dashboard/conta': 'Ver a conta',
  '/dashboard/mensalidades': 'Ver as mensalidades',
  '/admin/professores/disciplinas': 'Ver os pedidos de disciplina',
  '/admin/pagamentos': 'Ver as mensalidades',
}

export function accaoDoAviso(
  destino: string | null | undefined
): { href: string; texto: string } | null {
  if (!destino) return null
  if (destino === '/dashboard/avisos' || destino === '/admin/avisos') return null

  return { href: destino, texto: TEXTOS[destino] ?? 'Abrir' }
}

// ---------------------------------------------------------------------
// Que avisos pertencem a que papel
// ---------------------------------------------------------------------
//
// Uma conta pode acumular papéis — o caso real é ser professor e estar na
// direção — e a caixa de avisos é da conta, não do papel. Sem isto, os
// pedidos de disciplina da secretaria apareciam no meio dos avisos de
// professor, e os pedidos de aula no meio dos da secretaria.
//
// A classificação vive em `tipos_aviso.papeis` (migração 0047), e não em
// cada notificação: ver lá o porquê.

export type PapelAviso = 'familia' | 'professor' | 'secretaria'

export type TipoAviso = {
  tipo: string
  titulo?: string
  destino: string | null
  papeis: string[] | null
}

// Um tipo por classificar (ou que ainda não existe na tabela) aparece em
// todas as caixas. É a escolha segura: um aviso a mais lê-se e ignora-se,
// um aviso escondido nunca chega a ninguém.
export function avisoDoPapel(tipo: TipoAviso | undefined, papel: PapelAviso): boolean {
  const papeis = tipo?.papeis
  if (!papeis || papeis.length === 0) return true
  return papeis.includes(papel)
}

// Os tipos que NÃO pertencem a este papel — para a consulta de contagem,
// que não pode trazer as linhas para filtrar em memória. Diz-se o que se
// exclui, e não o que se inclui, para que um tipo desconhecido continue a
// contar em vez de desaparecer da conta.
export function tiposFora(tipos: TipoAviso[], papel: PapelAviso): string[] {
  return tipos.filter((t) => !avisoDoPapel(t, papel)).map((t) => t.tipo)
}

// Os tipos a excluir de uma consulta feita para este papel. Em `cache`
// porque o layout (contagem do ponto vermelho) e a página pedem-nos no
// mesmo pedido.
export const tiposForaDoPapel = cache(async (papel: PapelAviso): Promise<string[]> => {
  const supabase = await createClient()
  const { data } = await supabase.from('tipos_aviso').select('tipo, destino, papeis')
  return tiposFora((data ?? []) as TipoAviso[], papel)
})
