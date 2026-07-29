-- A policy de SELECT em "alunos" criada na 0018 consulta "matriculas" para
-- saber se o professor tem uma matrícula com aquele aluno. Mas a policy de
-- SELECT em "matriculas" também consulta "alunos" (para o encarregado ver
-- as suas matrículas). Duas tabelas cujas RLS se consultam mutuamente
-- causam recursão infinita no Postgres (ERRO 42P17), e como o código da
-- app não verificava `error` no resultado do Supabase, isto ficava
-- silenciosamente mascarado como "não há pedidos pendentes".
--
-- A correção é isolar a consulta a "matriculas" numa função SECURITY
-- DEFINER: como o dono da função (postgres) tem BYPASSRLS, a consulta
-- interna não volta a acionar a RLS de "matriculas", quebrando o ciclo.
create or replace function professor_tem_matricula_com_aluno(p_aluno_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from matriculas m
    where m.aluno_id = p_aluno_id and m.professor_id = auth.uid()
  );
$$;

grant execute on function professor_tem_matricula_com_aluno(uuid) to authenticated;

drop policy "Professor vê os alunos das suas matrículas" on alunos;
create policy "Professor vê os alunos das suas matrículas"
  on alunos for select
  to authenticated
  using (professor_tem_matricula_com_aluno(alunos.id));
