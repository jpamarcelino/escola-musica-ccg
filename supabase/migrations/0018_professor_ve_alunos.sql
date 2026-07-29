-- A migração 0017 moveu matriculas.aluno_id para apontar para alunos(id),
-- mas a tabela "alunos" só tinha RLS de select para o próprio encarregado
-- e para admins — nenhum professor conseguia ver o nome de um aluno que
-- lhe pediu ou tem aula confirmada. Como o join embutido do Supabase
-- (`alunos(nome)`) filtra pela RLS da tabela relacionada, isto não dava
-- erro — simplesmente devolvia null, e o nome do aluno aparecia em
-- branco em toda a parte do professor (pedidos, horários, agenda,
-- presenças) e as disponibilidades_selecionadas também deixavam de
-- aparecer (o EXISTS que as protege faz join a alunos por dentro).
create policy "Professor vê os alunos das suas matrículas"
  on alunos for select
  to authenticated
  using (
    exists (select 1 from matriculas m where m.aluno_id = alunos.id and m.professor_id = auth.uid())
  );
