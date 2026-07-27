-- Notificações do aluno. Por agora só é gerada uma: quando um professor
-- confirma um pedido de aula. Os outros tipos (lembrete de aula, lembrete
-- de pagamento, mudança de horário, novo material) ficam previstos no
-- "check" mas só passam a ser gerados quando essas funcionalidades existirem.
create table notificacoes (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  tipo text not null check (
    tipo in (
      'pedido_aceite',
      'lembrete_aula',
      'lembrete_pagamento',
      'mudanca_horario',
      'novo_material'
    )
  ),
  mensagem text not null,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);

alter table notificacoes enable row level security;

create policy "Utilizador vê as suas notificações"
  on notificacoes for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Utilizador marca as suas notificações como lidas"
  on notificacoes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Só o professor de uma matrícula pode notificar esse aluno — evita que
-- qualquer conta autenticada crie notificações para outra pessoa.
create policy "Professor cria notificações para os seus alunos"
  on notificacoes for insert
  to authenticated
  with check (
    exists (
      select 1 from matriculas m
      where m.aluno_id = user_id and m.professor_id = auth.uid()
    )
  );
