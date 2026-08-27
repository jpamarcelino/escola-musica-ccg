-- O campo de recomendação passa a perguntar COM QUE PROFESSOR tem aulas
-- quem recomendou, em vez de pedir a modalidade por escrito.
--
-- O Art. 8.º só admite recomendações dentro do mesmo professor, e isso
-- não estava dito em lado nenhum no formulário: quem chegava escrevia um
-- nome, escrevia "piano", e só descobria que não contava quando a
-- secretaria lhe dizia. Com a lista, a resposta aparece no momento.
--
-- Duas funções são precisas para isso, e a primeira é a correção de uma
-- regressão.

begin;

-- 1. professores_publicos volta a dizer quem aderiu ao Programa ---------
--
-- A 0026 acrescentou "adere_recomendacao" a esta função, e é dela que o
-- wizard público (/pedir-aula) decide se mostra o campo de recomendação.
-- A 0050 redefiniu a função para trazer "tem_ficha" e, ao reescrevê-la,
-- deixou "adere_recomendacao" pelo caminho.
--
-- Não rebentou nada visivelmente: o TypeScript continuou a ler o campo, o
-- valor passou a vir "undefined" e o `?? false` do código transformou-o
-- num "ninguém aderiu". Resultado — desde a 0050 que o campo de
-- recomendação NUNCA aparece num pedido feito pela via pública. O fluxo
-- autenticado não foi afetado, porque esse lê perfis_escola diretamente.
drop function if exists public.professores_publicos(bigint);
create or replace function public.professores_publicos(instrumento_id_param bigint)
returns table (
  professor_id uuid,
  nome text,
  foto_url text,
  especialidade text,
  tem_ficha boolean,
  adere_recomendacao boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.nome, p.foto_url, pi.especialidade,
         nullif(btrim(coalesce(pe.bio, '')), '') is not null as tem_ficha,
         pe.adere_recomendacao
  from professor_instrumentos pi
  join profiles p on p.id = pi.professor_id
  join perfis_escola pe on pe.id = pi.professor_id
  where pi.instrumento_id = instrumento_id_param
    and pe.tipo = 'professor';
$$;

grant execute on function public.professores_publicos(bigint) to anon, authenticated;

-- 2. A lista para o seletor ---------------------------------------------
--
-- Só id e nome. Não é a ficha pública do professor: é uma lista para
-- responder a "com quem tem aulas a pessoa que te recomendou", e para
-- isso o nome chega.
--
-- Os nomes dos professores já são públicos (o cartaz, a ficha pública, a
-- própria escolha de professor no pedido), por isso isto não expõe nada
-- de novo. O que continua fora de vista é o que o Art. 25.º protege — a
-- ligação entre quem recomenda e quem é recomendado — que não passa por
-- aqui: a lista é a mesma para toda a gente e não diz quem anda na
-- escola.
--
-- Security definer porque "profiles" e "perfis_escola" não têm leitura
-- para anon, e não vão passar a ter só por causa disto.
create or replace function public.professores_para_recomendacao()
returns table (
  professor_id uuid,
  nome text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.nome
  from perfis_escola pe
  join profiles p on p.id = pe.id
  where pe.tipo = 'professor'
  order by p.nome;
$$;

-- No schema "public" o Postgres dá EXECUTE ao papel "public" sozinho, e o
-- Supabase ainda o dá diretamente a "anon" — revogar só de um deixa a
-- porta aberta pelo outro. Aqui a lista é mesmo para ser pública, mas o
-- par revoke/grant deixa escrito quem pode e quem não pode.
revoke execute on function public.professores_para_recomendacao() from public, anon;
grant execute on function public.professores_para_recomendacao() to anon, authenticated;

commit;
