-- Esquema da base de dados da Fase 1
-- Centro Cultural: registo, escolha de disciplina/professor, disponibilidades, atribuição final
-- Duas escolas partilham a mesma estrutura: Música e Dança, distinguidas pela
-- coluna "programa" em instrumentos (que aqui também guarda modalidades de dança).

-- 1. Perfis de utilizador (aluno ou professor), ligados à conta de login do Supabase
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('aluno', 'professor')),
  -- Só professores têm programa (a escola em que ensinam); um aluno pode
  -- pedir aulas de Música e de Dança sem estar preso a nenhuma das duas.
  programa text check (programa in ('musica', 'danca')),
  admin boolean not null default false,
  criado_em timestamptz not null default now(),
  constraint profiles_professor_tem_programa check (tipo <> 'professor' or programa is not null)
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

create policy "Administradores atualizam professores (para gerir admins)"
  on profiles for update
  to authenticated
  using (
    tipo = 'professor'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.admin)
  )
  with check (
    tipo = 'professor'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.admin)
  );

-- Impede que alguém se torne administrador a si próprio por fora da app
-- (ex: chamando a API diretamente). Só um administrador existente pode
-- alterar a coluna "admin" de outra conta.
create or replace function public.impedir_auto_promocao_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.admin is distinct from old.admin then
    if not exists (select 1 from public.profiles where id = auth.uid() and admin) then
      raise exception 'Só um administrador pode alterar este campo.';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_impedir_auto_promocao_admin
  before update on profiles
  for each row execute function public.impedir_auto_promocao_admin();

-- Cria automaticamente um "profile" sempre que alguém se regista
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, tipo, programa)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'tipo', 'aluno'),
    new.raw_user_meta_data ->> 'programa'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Instrumentos (Música) e modalidades (Dança) disponíveis, distinguidos por "programa"
create table instrumentos (
  id bigint generated always as identity primary key,
  nome text not null,
  programa text not null default 'musica' check (programa in ('musica', 'danca')),
  unique (programa, nome)
);

alter table instrumentos enable row level security;

create policy "Utilizadores autenticados veem instrumentos"
  on instrumentos for select
  to authenticated
  using (true);

-- Alguns exemplos iniciais (podes editar/adicionar mais tarde)
insert into instrumentos (nome, programa) values
  ('Piano', 'musica'), ('Guitarra', 'musica'), ('Violino', 'musica'),
  ('Bateria', 'musica'), ('Canto', 'musica'), ('Flauta', 'musica'),
  ('Ballet', 'danca'), ('Hip Hop', 'danca'), ('Contemporâneo', 'danca'),
  ('Jazz', 'danca'), ('Danças de Salão', 'danca');

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
-- Não estão ligados a um instrumento específico: um professor que dá vários
-- instrumentos tem horários livres, válidos para qualquer um deles.
create table horarios (
  id bigint generated always as identity primary key,
  professor_id uuid not null references profiles(id) on delete cascade,
  dia_semana text not null check (dia_semana in ('Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo')),
  hora_inicio time not null,
  hora_fim time not null,
  estado text not null default 'aberto' check (estado in ('aberto', 'bloqueado')),
  unique (professor_id, dia_semana, hora_inicio, hora_fim)
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

-- Um aluno pode ter matrículas em várias disciplinas ao mesmo tempo, mas não
-- pode ter duas matrículas ativas (pendente ou confirmada) na mesma disciplina.
create unique index matriculas_aluno_instrumento_ativa_unique
  on matriculas (aluno_id, instrumento_id)
  where estado in ('a_escolher', 'confirmado');

alter table matriculas enable row level security;

create policy "Aluno e professor veem as suas matrículas"
  on matriculas for select
  to authenticated
  using (auth.uid() = aluno_id or auth.uid() = professor_id);

create policy "Administradores veem todas as matrículas"
  on matriculas for select
  to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.admin));

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
