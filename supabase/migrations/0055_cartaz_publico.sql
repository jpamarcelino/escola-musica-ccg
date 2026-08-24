-- O que a home pública mostra a quem ainda não tem conta.
--
-- Duas funções, pela mesma razão que a professores_publicos (0050)
-- existe: quem não tem sessão não pode ler nem profiles nem alunos nem
-- matriculas, e é assim que deve ser. O que se pode mostrar decide-se
-- aqui dentro, uma vez, em vez de se abrir as tabelas e confiar que
-- ninguém pede a coluna a mais.
--
-- Sem isto, a home teria de pedir os professores instrumento a
-- instrumento — a professores_publicos recebe um instrumento de cada
-- vez — e eram vinte chamadas para desenhar três cartões. E os números
-- da escola não teria mesmo como os obter: contaria os que conseguisse
-- ver, que é zero, ou mostraria um número inventado.

begin;

-- ---------------------------------------------------------------------
-- 1. Todos os professores com ficha pública
-- ---------------------------------------------------------------------
--
-- As mesmas colunas que a professores_publicos já entrega, sem o filtro
-- por instrumento. A especialidade passa a ser a lista das disciplinas
-- que a pessoa dá — na home não há instrumento escolhido, e "Piano" era
-- meia verdade em quem também dá guitarra.
create or replace function public.professores_do_cartaz()
returns table (
  professor_id uuid,
  nome text,
  foto_url text,
  areas text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id,
         p.nome,
         p.foto_url,
         -- Duas disciplinas, não todas: com um string_agg de tudo saía
         -- "Acordeão e Concertina e Piano", que ninguém escreve.
         array_to_string((array_agg(distinct i.nome order by i.nome))[1:2], ' e ') as areas
  from perfis_escola pe
  join profiles p on p.id = pe.id
  left join professor_instrumentos pi on pi.professor_id = pe.id
  left join instrumentos i on i.id = pi.instrumento_id
  where pe.tipo = 'professor'
  group by p.id, p.nome, p.foto_url
  -- Sem disciplina nenhuma não há o que dizer no cartão, e um cartão com
  -- o nome e uma linha vazia parece avaria.
  having count(i.id) > 0;
$$;

revoke execute on function public.professores_do_cartaz() from public;
grant execute on function public.professores_do_cartaz() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Os três números
-- ---------------------------------------------------------------------
--
-- Contagens e mais nada. Um total não identifica ninguém, e é o que
-- permite dizer "128 alunos" sem abrir a tabela de alunos a quem passa.
--
-- Alunos conta pessoas com matrícula confirmada, não perfis criados: um
-- perfil que nunca chegou a ter aula não é aluno da escola, e contá-lo
-- era inflacionar o número na página de quem está a decidir inscrever-se.
create or replace function public.numeros_da_escola()
returns table (
  alunos integer,
  professores integer,
  escolas integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(distinct m.aluno_id) from matriculas m where m.estado = 'confirmado')::integer,
    (select count(*) from perfis_escola pe where pe.tipo = 'professor')::integer,
    (select count(distinct i.programa) from instrumentos i)::integer;
$$;

revoke execute on function public.numeros_da_escola() from public;
grant execute on function public.numeros_da_escola() to anon, authenticated;

commit;
