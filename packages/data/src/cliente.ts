import type { SupabaseClient } from '@supabase/supabase-js'

// O tipo do cliente que as funções deste pacote recebem.
//
// A regra que dá forma a tudo aqui: este pacote **nunca cria** um cliente
// Supabase — recebe-o sempre por parâmetro. Duas consequências, e as duas
// são o motivo de ser assim.
//
// A primeira é poder ser partilhado. Na web o cliente é o do servidor, que
// lê a sessão dos cookies; na app móvel é um cliente com a sessão em
// armazenamento local. As queries e as regras são as mesmas; o que muda é
// só de onde vem a sessão, e isso fica fora daqui.
//
// A segunda é de segurança, e é a mais importante. Um pacote que criasse o
// seu próprio cliente teria de ir buscar chaves ao ambiente, e mais cedo
// ou mais tarde alguém punha lá a `service role key` — que ignora todas as
// regras de RLS e que, num bundle de app móvel, é código entregue ao
// telemóvel de quem a instala. Como o pacote não conhece chave nenhuma,
// isso não pode acontecer por distração. Há um teste que o verifica.
//
// Do lado prático: quem chama já teve de autenticar, e as políticas de RLS
// continuam a decidir o que cada pessoa vê. Este pacote não é uma via para
// contornar permissões — é só onde as queries vivem.
export type ClienteCcg = SupabaseClient
