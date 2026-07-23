-- Esquema da base de dados da Fase 1
-- Escola de Música: registo, escolha de instrumento/professor, disponibilidades, atribuição final

-- 1. Perfis de utilizador (aluno ou professor), ligados à conta de login do Supabase
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('aluno', 'professor')),
  criado_em timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Utilizadores autenticados veem todos os perfis"
  on profiles for select
  to authenticated
  using (true);

create policy "Utilizador atualiza o seu próprio perfil"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

-- Cria automaticamente um "profile" sempre que alguém se regista
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, tipo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'tipo', 'aluno')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Instrumentos disponíveis na escola
create table instrumentos (
  id bigint generated always as identity primary key,
  nome text not null unique
);

alter table instrumentos enable row level security;

create policy "Utilizadores autenticados veem instrumentos"
  on instrumentos for select
  to authenticated
  using (true);

-- Alguns instrumentos iniciais (podes editar/adicionar mais tarde)
insert into instrumentos (nome) values
  ('Piano'), ('Guitarra'), ('Violino'), ('Bateria'), ('Canto'), ('Flauta');

-- 3. Que professores ensinam que instrumentos
create table professor_instrumentos (
  professor_id uuid not null references profiles(id) on delete cascade,
  instrumento_id bigint not null references instrumentos(id) on delete cascade,
  primary key (professor_id, instrumento_id)
);

alter table professor_instrumentos enable row level security;

create policy "Utilizadores autenticados veem professor_instrumentos"
  on professor_instrumentos for select
  to authenticated
  using (true);

create policy "Professor gere os seus próprios instrumentos"
  on professor_instrumentos for all
  to authenticated
  using (auth.uid() = professor_id)
  with check (auth.uid() = professor_id);

-- 4. Horários semanais que um professor disponibiliza (molde recorrente, sem data específica)
create table horarios (
  id bigint generated always as identity primary key,
  professor_id uuid not null references profiles(id) on delete cascade,
  instrumento_id bigint not null references instrumentos(id) on delete cascade,
  dia_semana text not null check (dia_semana in ('Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo')),
  hora_inicio time not null,
  hora_fim time not null,
  estado text not null default 'aberto' check (estado in ('aberto', 'bloqueado'))
);

alter table horarios enable row level security;

create policy "Utilizadores autenticados veem horários"
  on horarios for select
  to authenticated
  using (true);

create policy "Professor gere os seus próprios horários"
  on horarios for all
  to authenticated
  using (auth.uid() = professor_id)
  with check (auth.uid() = professor_id);

-- 5. Matrícula: o processo de um aluno com um professor/instrumento
create table matriculas (
  id bigint generated always as identity primary key,
  aluno_id uuid not null references profiles(id) on delete cascade,
  professor_id uuid not null references profiles(id) on delete cascade,
  instrumento_id bigint not null references instrumentos(id) on delete cascade,
  horario_final_id bigint references horarios(id),
  estado text not null default 'a_escolher' check (estado in ('a_escolher', 'confirmado')),
  criado_em timestamptz not null default now()
);

alter table matriculas enable row level security;

create policy "Aluno e professor veem as suas matrículas"
  on matriculas for select
  to authenticated
  using (auth.uid() = aluno_id or auth.uid() = professor_id);

create policy "Aluno cria a sua matrícula"
  on matriculas for insert
  to authenticated
  with check (auth.uid() = aluno_id);

create policy "Professor atualiza matrículas dos seus alunos"
  on matriculas for update
  to authenticated
  using (auth.uid() = professor_id)
  with check (auth.uid() = professor_id);

create policy "Aluno cancela o seu pedido pendente"
  on matriculas for delete
  to authenticated
  using (auth.uid() = aluno_id and estado = 'a_escolher');

-- 6. Disponibilidades que o aluno marcou como possíveis (opções, não pedidos)
create table disponibilidades_selecionadas (
  id bigint generated always as identity primary key,
  matricula_id bigint not null references matriculas(id) on delete cascade,
  horario_id bigint not null references horarios(id) on delete cascade,
  unique (matricula_id, horario_id)
);

alter table disponibilidades_selecionadas enable row level security;

create policy "Aluno e professor veem disponibilidades da matrícula"
  on disponibilidades_selecionadas for select
  to authenticated
  using (
    exists (
      select 1 from matriculas m
      where m.id = matricula_id
      and (m.aluno_id = auth.uid() or m.professor_id = auth.uid())
    )
  );

create policy "Aluno gere as suas disponibilidades"
  on disponibilidades_selecionadas for all
  to authenticated
  using (
    exists (select 1 from matriculas m where m.id = matricula_id and m.aluno_id = auth.uid())
  )
  with check (
    exists (select 1 from matriculas m where m.id = matricula_id and m.aluno_id = auth.uid())
  );
