-- A policy de INSERT em "notificacoes" (0003) comparava
-- matriculas.aluno_id diretamente com notificacoes.user_id — fazia
-- sentido quando aluno_id apontava para profiles(id). Depois da 0017
-- (Fase 2), matriculas.aluno_id passou a apontar para alunos(id), e
-- notificacoes.user_id continua a ser sempre um profiles.id (o
-- encarregado, já que um aluno dependente não tem conta própria). A
-- comparação direta deixou de fazer sentido e a policy passou a recusar
-- sempre o insert — silenciosamente, porque o código nunca verificava o
-- erro do insert. É por isto que confirmarHorario() não estava a criar
-- a notificação para o encarregado.
drop policy "Professor cria notificações para os seus alunos" on notificacoes;
create policy "Professor cria notificações para os seus alunos"
  on notificacoes for insert
  to authenticated
  with check (
    exists (
      select 1 from matriculas m
      join alunos a on a.id = m.aluno_id
      where a.encarregado_id = notificacoes.user_id and m.professor_id = auth.uid()
    )
  );
