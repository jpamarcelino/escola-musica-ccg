-- Sistema de convites: substitui os códigos partilhados e estáticos
-- (PROFESSOR_INVITE_CODE / ADMIN_INVITE_CODE) por links de uso único,
-- gerados pelo admin para cada pessoa que convida. O mesmo mecanismo
-- serve também para o encarregado de educação "migrar" um perfil de
-- aluno dependente para o próprio aluno gerir, quando crescer.
create table convites (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  tipo text not null check (tipo in ('professor', 'admin', 'migracao_aluno')),
  -- só para tipo='professor' — a escola já fica decidida no convite, o
  -- convidado deixa de escolher isto no registo.
  programa text check (programa in ('musica', 'danca')),
  -- só para tipo='migracao_aluno' — qual perfil de aluno está a ser
  -- transferido.
  aluno_id uuid references alunos(id) on delete cascade,
  criado_por uuid not null references profiles(id) on delete cascade,
  usado_por uuid references profiles(id) on delete set null,
  usado_em timestamptz,
  criado_em timestamptz not null default now(),
  constraint convites_professor_tem_programa check (tipo <> 'professor' or programa is not null),
  constraint convites_migracao_tem_aluno check (tipo <> 'migracao_aluno' or aluno_id is not null)
);

alter table convites enable row level security;

-- Ninguém lê a tabela diretamente por aqui (nem para listar códigos de
-- outros, nem um visitante ainda sem conta a validar o link) — isso
-- passa pela função validar_convite abaixo, que só devolve informação
-- sobre o código exato pedido.
create policy "Quem criou vê os seus convites"
  on convites for select
  to authenticated
  using (auth.uid() = criado_por);

create policy "Administradores criam convites de professor"
  on convites for insert
  to authenticated
  with check (
    tipo = 'professor'
    and criado_por = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.admin)
  );

create policy "Super admins criam convites de admin"
  on convites for insert
  to authenticated
  with check (
    tipo = 'admin'
    and criado_por = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.super_admin)
  );

create policy "Encarregado cria convite de migração para o seu aluno"
  on convites for insert
  to authenticated
  with check (
    tipo = 'migracao_aluno'
    and criado_por = auth.uid()
    and exists (select 1 from alunos a where a.id = aluno_id and a.encarregado_id = auth.uid())
  );

create policy "Quem criou cancela um convite ainda não usado"
  on convites for delete
  to authenticated
  using (auth.uid() = criado_por and usado_em is null);

-- Valida um código de convite sem expor a tabela toda — só devolve
-- informação sobre o código exato pedido (usável por quem ainda nem tem
-- conta, por isso "anon" também).
create or replace function public.validar_convite(p_codigo text)
returns table(tipo text, programa text, aluno_id uuid, aluno_nome text, valido boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    select c.tipo, c.programa, c.aluno_id, a.nome, (c.usado_em is null)
    from public.convites c
    left join public.alunos a on a.id = c.aluno_id
    where c.codigo = p_codigo;
end;
$$;

grant execute on function public.validar_convite(text) to anon, authenticated;

-- Resgata um convite de migração quando quem clica no link já tem conta
-- CCG própria (não passa pelo registo — só liga o perfil de aluno à
-- conta já existente).
create or replace function public.resgatar_convite_migracao(p_codigo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_convite record;
begin
  select * into v_convite from public.convites
    where codigo = p_codigo and tipo = 'migracao_aluno' and usado_em is null
    for update;

  if v_convite.id is null then
    raise exception 'Convite inválido ou já utilizado.';
  end if;

  update public.convites set usado_por = auth.uid(), usado_em = now() where id = v_convite.id;

  update public.alunos
    set encarregado_id = auth.uid(), propria_conta_id = auth.uid()
    where id = v_convite.aluno_id;
end;
$$;

grant execute on function public.resgatar_convite_migracao(text) to authenticated;

-- Regista genérico: o registo público deixa de perguntar "aluno,
-- professor ou admin" — cria sempre uma conta normal (tipo 'aluno', que
-- passa a significar "pessoa/cliente", não necessariamente alguém com
-- aulas). Professor e admin só se tornam isso através de um convite de
-- uso único gerado por um admin (metadata "convite_codigo" no signUp).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text := new.raw_user_meta_data ->> 'convite_codigo';
  v_convite record;
  v_tem_convite boolean := false;
  v_tipo text := 'aluno';
  v_programa text := null;
  v_admin boolean := false;
begin
  if v_codigo is not null then
    select * into v_convite from public.convites
      where codigo = v_codigo and usado_em is null
      for update;

    -- "select into" numa record não deixa "v_convite.id" acessível se
    -- não encontrou nada (o record fica por atribuir) — por isso a
    -- flag, em vez de testar v_convite.id diretamente.
    v_tem_convite := found;

    if v_tem_convite then
      if v_convite.tipo = 'professor' then
        v_tipo := 'professor';
        v_programa := v_convite.programa;
      elsif v_convite.tipo = 'admin' then
        v_tipo := 'admin';
        v_admin := true;
      end if;
      -- 'migracao_aluno' mantém v_tipo = 'aluno' (é uma pessoa normal) —
      -- a transferência do perfil de aluno acontece já a seguir.
    end if;
  end if;

  insert into public.profiles (id, nome, email, tipo, programa, data_nascimento, telefone, admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.email,
    v_tipo,
    v_programa,
    case
      when new.raw_user_meta_data ->> 'data_nascimento' ~ '^\d{4}-\d{2}-\d{2}$'
        then (new.raw_user_meta_data ->> 'data_nascimento')::date
      else null
    end,
    new.raw_user_meta_data ->> 'telefone',
    v_admin
  );
  -- Este insert dispara profiles_sincronizar_aluno_dependente (migração
  -- 0015), que cria automaticamente o perfil de aluno próprio desta
  -- conta quando v_tipo = 'aluno'.

  -- Só agora, com o perfil já criado, é que dá para marcar o convite como
  -- usado — convites.usado_por referencia profiles(id), e essa linha só
  -- passa a existir depois do insert acima (marcar antes disparava sempre
  -- uma violação de foreign key).
  if v_tem_convite then
    update public.convites set usado_por = new.id, usado_em = now() where id = v_convite.id;
  end if;

  -- Nota: "if a and b" não garante em PL/pgSQL que "b" só é avaliado
  -- quando "a" é verdadeiro — por isso usar um "if" aninhado em vez de
  -- confiar em curto-circuito, já que v_convite fica por atribuir
  -- (nem "not null", literalmente nunca populada) quando não há convite.
  if v_tem_convite then
    if v_convite.tipo = 'migracao_aluno' then
      -- O perfil próprio que acabou de ser criado automaticamente fica
      -- redundante — quem se regista por um link de migração já vai
      -- herdar o perfil de aluno existente (com histórico), não precisa
      -- de um segundo em branco.
      delete from public.alunos where propria_conta_id = new.id and id <> v_convite.aluno_id;

      update public.alunos
        set encarregado_id = new.id, propria_conta_id = new.id
        where id = v_convite.aluno_id;
    end if;
  end if;

  return new;
end;
$$;
