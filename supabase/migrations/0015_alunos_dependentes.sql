-- Fase 1 do plano "Conta CCG": desligar o conceito de "aluno" de "ter
-- login próprio", para no futuro um encarregado de educação poder ter
-- vários filhos (sem email/password próprios) dentro da mesma conta.
--
-- Esta migração é só preparação — puramente aditiva. Não muda nada do
-- que já existe: matriculas/presencas/mensalidades continuam a apontar
-- para profiles.id como sempre. A tabela "alunos" fica pronta, e
-- sincronizada com as contas aluno atuais, para a Fase 2 (que passa a
-- app a usar alunos.id e a UI de "adicionar filho") migrar em cima dela
-- com calma, sem pressa e sem correr o risco de o fazer tudo de uma vez.
create table alunos (
  id uuid primary key default gen_random_uuid(),
  -- Quem gere este aluno — cria a matrícula, vê mensalidades, recebe
  -- notificações. É sempre uma conta com login (profiles.id).
  encarregado_id uuid not null references profiles(id) on delete cascade,
  -- Só preenchido quando o próprio aluno tem login (ex: um adulto que se
  -- inscreve a ele próprio). Um filho dependente fica com isto a null —
  -- não tem email, password nem sessão própria.
  propria_conta_id uuid references profiles(id) on delete set null,
  nome text not null,
  data_nascimento date check (
    data_nascimento is null
    or (data_nascimento > '1900-01-01' and data_nascimento <= current_date)
  ),
  criado_em timestamptz not null default now()
);

alter table alunos enable row level security;

create policy "Encarregado vê e gere os seus alunos"
  on alunos for all
  to authenticated
  using (auth.uid() = encarregado_id)
  with check (auth.uid() = encarregado_id);

create policy "Administradores veem todos os alunos"
  on alunos for select
  to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.admin));

-- Backfill: uma linha "alunos" por cada conta que hoje é tipo='aluno' —
-- o encarregado e o próprio aluno são a mesma pessoa, tal como acontece
-- hoje (cada aluno geria-se a ele próprio).
insert into alunos (encarregado_id, propria_conta_id, nome, data_nascimento, criado_em)
select id, id, nome, data_nascimento, criado_em
from profiles
where tipo = 'aluno';

-- Mantém "alunos" sincronizada enquanto a app ainda não usa esta tabela
-- para nada — qualquer novo registo de aluno (pelo fluxo atual, que
-- continua a criar uma conta com login) continua a aparecer aqui também,
-- para a Fase 2 não começar com dados desatualizados.
create or replace function public.sincronizar_aluno_dependente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tipo = 'aluno' then
    insert into public.alunos (encarregado_id, propria_conta_id, nome, data_nascimento, criado_em)
    values (new.id, new.id, new.nome, new.data_nascimento, new.criado_em);
  end if;
  return new;
end;
$$;

create trigger profiles_sincronizar_aluno_dependente
  after insert on profiles
  for each row execute function public.sincronizar_aluno_dependente();
