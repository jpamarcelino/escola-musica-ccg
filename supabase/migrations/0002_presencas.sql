-- Sistema de presenças — só professores e administradores têm acesso; os
-- alunos não veem nem marcam nada disto (sem policy de select para eles).
--
-- Os horários são um molde semanal recorrente (sem data), por isso uma
-- presença fica ligada à matrícula (aluno + professor + horário final) mais
-- uma data concreta — essa combinação é o que identifica "esta aula, neste
-- dia". Uma linha única por (matricula, data) evita marcar duas vezes a
-- mesma aula.
create table presencas (
  id bigint generated always as identity primary key,
  matricula_id bigint not null references matriculas(id) on delete cascade,
  data date not null,
  estado text not null check (estado in ('presente', 'falta_aviso', 'falta_sem_aviso')),
  marcado_por uuid references profiles(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (matricula_id, data)
);

alter table presencas enable row level security;

create policy "Professor gere presenças das suas matrículas"
  on presencas for all
  to authenticated
  using (
    exists (select 1 from matriculas m where m.id = matricula_id and m.professor_id = auth.uid())
  )
  with check (
    exists (select 1 from matriculas m where m.id = matricula_id and m.professor_id = auth.uid())
  );

create policy "Administradores veem todas as presenças"
  on presencas for select
  to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.admin));
