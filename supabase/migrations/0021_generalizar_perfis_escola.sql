-- Fase 3 do plano "Conta CCG": "profiles" deixa de misturar identidade
-- genérica (nome, email, telefone, foto) com o papel na escola de música
-- e dança (tipo, programa, admin, super_admin, sala_prioridade,
-- sala_candidatos). Essas colunas escolares mudam-se para uma tabela
-- nova, "perfis_escola" (1:1, chave = profiles.id) — deixa "profiles"
-- pronta para ser partilhada por outras secções da CCG no futuro (Fase
-- 4/5: WordPress, rancho, jogos), sem estar presa ao vocabulário da
-- escola de música/dança.
--
-- "data_nascimento" não é migrada para lado nenhum — confirmado por
-- auditoria ao código que já não é lida de "profiles" em lado nenhum da
-- app (só escrita na metadata do signup, e sempre lida de volta via
-- alunos.data_nascimento, desde a Fase 1). Fica só em "alunos".
--
-- Lição da Fase 2 (0019, recursão 42P17 entre alunos/matriculas):
-- qualquer verificação cross-table nas RLS policies passa a usar funções
-- security definer, nunca subqueries inline — para não voltar a
-- descobrir a mesma classe de bug aqui.

-- 1. Tabela nova.
create table perfis_escola (
  id uuid primary key references profiles(id) on delete cascade,
  tipo text not null check (tipo in ('aluno','professor','admin')),
  programa text check (programa in ('musica','danca')),
  admin boolean not null default false,
  super_admin boolean not null default false,
  sala_prioridade int,
  sala_candidatos bigint[],
  constraint perfis_escola_professor_tem_programa check (tipo <> 'professor' or programa is not null)
);

alter table perfis_escola enable row level security;

-- 2. Funções security definer — evitam recursão RLS ao centralizar a
-- verificação "é admin"/"é super admin" numa função que só lê
-- perfis_escola, nunca cruzando de volta com nenhuma tabela cuja RLS
-- possa chamar esta função outra vez.
create or replace function public.eh_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from perfis_escola pe where pe.id = auth.uid() and pe.admin);
$$;

create or replace function public.eh_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from perfis_escola pe where pe.id = auth.uid() and pe.super_admin);
$$;

grant execute on function public.eh_admin() to authenticated;
grant execute on function public.eh_super_admin() to authenticated;

-- 3. RLS de perfis_escola — espelha exatamente as policies atuais de
-- profiles, só com as colunas que ficam cá.
create policy "Utilizadores autenticados veem todos os perfis de escola"
  on perfis_escola for select
  to authenticated
  using (true);

create policy "Utilizador atualiza o seu próprio perfil de escola"
  on perfis_escola for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Super admins atualizam professores e admins"
  on perfis_escola for update
  to authenticated
  using (tipo in ('professor','admin') and eh_super_admin())
  with check (tipo in ('professor','admin') and eh_super_admin());

-- 4. Backfill — antes de anexar o trigger de sincronização (passo 6),
-- para não disparar inserts duplicados em "alunos" para contas já
-- existentes (essas já têm a sua linha em "alunos" desde a Fase 1).
insert into perfis_escola (id, tipo, programa, admin, super_admin, sala_prioridade, sala_candidatos)
select id, tipo, programa, admin, super_admin, sala_prioridade, sala_candidatos
from profiles;

-- 5. Move o trigger anti-auto-promoção de "profiles" para "perfis_escola"
-- (mesma lógica, lê perfis_escola.super_admin em vez de profiles.super_admin).
drop trigger if exists profiles_impedir_auto_promocao_admin on profiles;

create or replace function public.impedir_auto_promocao_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.admin is distinct from old.admin then
    if not exists (select 1 from public.perfis_escola where id = auth.uid() and super_admin) then
      raise exception 'Só um super admin pode alterar este campo.';
    end if;
  end if;
  return new;
end;
$$;

create trigger perfis_escola_impedir_auto_promocao_admin
  before update on perfis_escola
  for each row execute function public.impedir_auto_promocao_admin();

-- 6. Move o trigger de sincronização de aluno dependente (Fase 1) de
-- "profiles" para "perfis_escola" — passa a disparar em função de
-- perfis_escola.tipo (que é onde "tipo" passa a viver), indo buscar
-- nome/criado_em a "profiles" por join. Sem data_nascimento aqui — essa
-- passa a ser tratada só em handle_new_user (passo 8), que a aplica
-- logo a seguir com um update direto.
drop trigger if exists profiles_sincronizar_aluno_dependente on profiles;

create or replace function public.sincronizar_aluno_dependente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil record;
begin
  if new.tipo = 'aluno' then
    select nome, criado_em into v_perfil from public.profiles where id = new.id;
    insert into public.alunos (encarregado_id, propria_conta_id, nome, criado_em)
    values (new.id, new.id, v_perfil.nome, v_perfil.criado_em);
  end if;
  return new;
end;
$$;

create trigger perfis_escola_sincronizar_aluno_dependente
  after insert on perfis_escola
  for each row execute function public.sincronizar_aluno_dependente();

-- 7. recalcular_salas() passa a ler programa/sala_prioridade/
-- sala_candidatos de perfis_escola. salas.dono_id e horarios.professor_id
-- continuam a apontar para profiles.id, sem alteração.
create or replace function public.recalcular_salas()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sala_danca bigint;
  p record;
  h record;
  s record;
  cand bigint;
  ocupada boolean;
begin
  select id into v_sala_danca from public.salas where piso is null and numero is null;

  update public.horarios set sala_id = null where true;

  -- Dança: toda a gente no Salão de Dança, sem verificação de conflitos.
  update public.horarios hor
  set sala_id = v_sala_danca
  from public.perfis_escola pe
  where hor.professor_id = pe.id and pe.programa = 'danca';

  -- Professores com sala própria: recebem-na sempre, sem competir por ela.
  for p in
    select pr.id as professor_id, sa.id as sala_id
    from public.profiles pr
    join public.salas sa on sa.dono_id = pr.id
  loop
    update public.horarios set sala_id = p.sala_id where professor_id = p.professor_id;
  end loop;

  -- Pool flexível: por ordem de prioridade, cada horário tenta a sua lista
  -- de salas candidatas, pela ordem dada, e fica com a primeira livre.
  for p in
    select * from public.perfis_escola
    where sala_candidatos is not null
    order by sala_prioridade nulls last, id
  loop
    for h in
      select * from public.horarios where professor_id = p.id order by dia_semana, hora_inicio, id
    loop
      foreach cand in array p.sala_candidatos
      loop
        select * into s from public.salas where id = cand;

        if s.dono_id is not null and s.dono_id <> p.id and h.dia_semana = any(s.dias_exclusivos) then
          continue;
        end if;

        select exists (
          select 1 from public.horarios h2
          where h2.id <> h.id
            and h2.sala_id = cand
            and h2.dia_semana = h.dia_semana
            and h2.hora_inicio < h.hora_fim
            and h2.hora_fim > h.hora_inicio
        ) into ocupada;

        if not ocupada then
          update public.horarios set sala_id = cand where id = h.id;
          exit;
        end if;
      end loop;
    end loop;
  end loop;
end;
$$;

-- 8. handle_new_user() passa a inserir em "profiles" (colunas genéricas)
-- e depois em "perfis_escola" (tipo/programa/admin — dispara o trigger
-- do passo 6, que cria a linha em "alunos"). data_nascimento deixa de
-- poder ser relayada pelo trigger (já não existe em profiles nem
-- perfis_escola) — por isso é aplicada aqui, num update direto à linha
-- de "alunos" que o trigger acabou de criar.
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
  v_data_nascimento date;
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

  v_data_nascimento := case
    when new.raw_user_meta_data ->> 'data_nascimento' ~ '^\d{4}-\d{2}-\d{2}$'
      then (new.raw_user_meta_data ->> 'data_nascimento')::date
    else null
  end;

  insert into public.profiles (id, nome, email, telefone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.email,
    new.raw_user_meta_data ->> 'telefone'
  );

  insert into public.perfis_escola (id, tipo, programa, admin)
  values (new.id, v_tipo, v_programa, v_admin);
  -- Este insert dispara perfis_escola_sincronizar_aluno_dependente, que
  -- cria automaticamente o perfil de aluno próprio desta conta quando
  -- v_tipo = 'aluno' (sem data_nascimento — aplicada já a seguir).

  if v_tipo = 'aluno' and v_data_nascimento is not null then
    update public.alunos set data_nascimento = v_data_nascimento
      where propria_conta_id = new.id;
  end if;

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

-- 9. Reescreve as policies que hoje verificam admin/super_admin por
-- subquery inline a "profiles", trocando por eh_admin()/eh_super_admin().
drop policy if exists "Administradores veem todas as presenças" on presencas;
create policy "Administradores veem todas as presenças"
  on presencas for select
  to authenticated
  using (eh_admin());

drop policy if exists "Administradores atualizam matrículas (mensalidade)" on matriculas;
create policy "Administradores atualizam matrículas (mensalidade)"
  on matriculas for update
  to authenticated
  using (eh_admin())
  with check (eh_admin());

drop policy if exists "Administradores veem todas as matrículas" on matriculas;
create policy "Administradores veem todas as matrículas"
  on matriculas for select
  to authenticated
  using (eh_admin());

drop policy if exists "Administradores gerem mensalidades" on mensalidades;
create policy "Administradores gerem mensalidades"
  on mensalidades for all
  to authenticated
  using (eh_admin())
  with check (eh_admin());

drop policy if exists "Administradores veem todos os alunos" on alunos;
create policy "Administradores veem todos os alunos"
  on alunos for select
  to authenticated
  using (eh_admin());

drop policy if exists "Administradores criam convites de professor" on convites;
create policy "Administradores criam convites de professor"
  on convites for insert
  to authenticated
  with check (
    tipo = 'professor'
    and criado_por = auth.uid()
    and eh_admin()
  );

drop policy if exists "Super admins criam convites de admin" on convites;
create policy "Super admins criam convites de admin"
  on convites for insert
  to authenticated
  with check (
    tipo = 'admin'
    and criado_por = auth.uid()
    and eh_super_admin()
  );

-- 10. profiles fica só com as duas policies genéricas — a policy de
-- super-admin sobre tipo/admin mudou de tabela (passo 3).
drop policy if exists "Super admins atualizam professores e admins" on profiles;

-- 11. Por último, remove as colunas escolares de profiles. Corre-se no
-- fim de propósito: se alguma coisa acima ainda referenciar uma destas
-- colunas, o Postgres falha aqui e a transação inteira faz rollback —
-- funciona como verificação da própria migração.
alter table profiles
  drop column tipo,
  drop column programa,
  drop column admin,
  drop column super_admin,
  drop column sala_prioridade,
  drop column sala_candidatos,
  drop column data_nascimento;
