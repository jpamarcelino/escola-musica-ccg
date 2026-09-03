-- Dois papéis dentro da administração: secretaria e direção.
--
-- Até aqui "administrador" era uma coisa só. Passa a haver quem TRATA da
-- escola (a secretaria: mensalidades, recomendações, disciplinas,
-- turmas de bebés) e quem a DIRIGE — que precisa de ver tudo para
-- decidir e não tem nada que mexer na caixa.
--
-- A regra é curta: um diretor lê tudo o que um administrador lia e não
-- escreve nada. A única exceção é mandar mensagens da escola, que
-- continua a ser de qualquer administrador — quem dirige também
-- comunica, e a assinatura é escrita na altura, não presa ao papel.
--
-- Marcar avisos como lidos não precisa de exceção: `notificacoes` já é
-- uma linha por pessoa, com o seu próprio `lida`.

begin;

alter table perfis_escola
  add column if not exists secretaria boolean not null default false;

comment on column perfis_escola.secretaria is
  'Administrador que trata da operação (mensalidades, recomendações, disciplinas, bebés). Sem isto, o administrador só vê.';

-- A conta de operação da escola. Feito ANTES de o gatilho passar a
-- guardar esta coluna: aqui não há auth.uid(), e o gatilho recusaria.
update perfis_escola pe
   set secretaria = true
  from profiles p
 where p.id = pe.id
   and pe.admin
   and p.nome = 'Conta Admin';

-- Um super administrador é secretaria por definição — está na função e
-- não na coluna, para não haver dois sítios a ter de concordar. É a
-- mesma escolha que já se fez com `admin` e `super_admin`.
create or replace function public.eh_secretaria()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from perfis_escola pe
     where pe.id = auth.uid()
       and pe.admin
       and (pe.secretaria or pe.super_admin)
  );
$$;

grant execute on function public.eh_secretaria() to authenticated;

-- Toda a escrita que era de "administrador" passa a ser da secretaria.
--
-- Feito a ler o catálogo e não a reescrever as policies uma a uma: são
-- perto de cinquenta, foram redefinidas ao longo de vinte migrações, e
-- uma lista escrita à mão aqui envelhecia no dia em que alguém
-- acrescentasse a próxima. O que interessa é a REGRA, e a regra
-- aplica-se a tudo o que existir no momento em que isto correr.
--
-- As de SELECT ficam como estão: é o que dá ao diretor o "vê tudo".
-- Numa policy FOR ALL não se pode fazer isso, porque a mesma expressão
-- serve leitura e escrita — por isso nasce uma gémea só de leitura com
-- a condição antiga, e a original fica com a nova. Policies permissivas
-- somam-se, portanto quem lê passa por uma ou pela outra.
do $$
declare
  p record;
  v_using text;
  v_check text;
  v_total int := 0;
begin
  for p in
    select schemaname, tablename, policyname, cmd, qual, with_check
      from pg_policies
     where schemaname = 'public'
       and (qual like '%eh_admin()%' or with_check like '%eh_admin()%')
       and cmd <> 'SELECT'
  loop
    if p.cmd = 'ALL' and p.qual is not null then
      execute format(
        'create policy %I on %I.%I for select to authenticated using (%s)',
        p.policyname || ' (leitura)', p.schemaname, p.tablename, p.qual
      );
    end if;

    v_using := replace(coalesce(p.qual, ''), 'eh_admin()', 'eh_secretaria()');
    v_check := replace(coalesce(p.with_check, ''), 'eh_admin()', 'eh_secretaria()');

    if p.qual is not null and p.with_check is not null then
      execute format('alter policy %I on %I.%I using (%s) with check (%s)',
                     p.policyname, p.schemaname, p.tablename, v_using, v_check);
    elsif p.qual is not null then
      execute format('alter policy %I on %I.%I using (%s)',
                     p.policyname, p.schemaname, p.tablename, v_using);
    else
      execute format('alter policy %I on %I.%I with check (%s)',
                     p.policyname, p.schemaname, p.tablename, v_check);
    end if;

    v_total := v_total + 1;
  end loop;

  if v_total = 0 then
    raise exception 'Nenhuma policy de escrita encontrada — o catálogo não é o esperado.';
  end if;

  raise notice 'Policies de escrita passadas para eh_secretaria(): %', v_total;
end $$;

-- As funções que decidem por si, sem passar por policy nenhuma. Aqui a
-- lista é escrita à mão de propósito: é curta, e `enviar_mensagem_escola`
-- tem de ficar de fora — é a exceção que deixa um diretor comunicar.
do $$
declare
  f record;
  v_total int := 0;
begin
  for f in
    select p.oid, p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = any (array[
         'definir_adesao_recomendacao',
         'responder_pedido_instrumento',
         'definir_ficha_publica',
         'mudar_horario_turma_bebes',
         'aceitar_pedido_bebes',
         'recusar_pedido_bebes'
       ])
  loop
    execute replace(pg_get_functiondef(f.oid), 'eh_admin()', 'eh_secretaria()');
    v_total := v_total + 1;
  end loop;

  if v_total <> 6 then
    raise exception 'Esperava 6 funções de operação, encontrei %.', v_total;
  end if;
end $$;

-- O gatilho passa a guardar as duas colunas. Sem isto, quem tivesse
-- update em perfis_escola promovia-se a secretaria sozinho — a coluna
-- é nova, a porta seria nova também.
create or replace function public.impedir_auto_promocao_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.admin is distinct from old.admin
     or new.secretaria is distinct from old.secretaria then
    if not exists (select 1 from public.perfis_escola where id = auth.uid() and super_admin) then
      raise exception 'Só um super admin pode alterar este campo.';
    end if;
  end if;
  return new;
end;
$$;

-- Quem dá e tira a secretaria. Mesmas regras da `definir_administrador`:
-- só um super administrador, e nunca a si próprio.
create or replace function public.definir_secretaria(
  p_user_id uuid,
  p_secretaria boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_alvo record;
begin
  if v_quem is null then
    raise exception 'Sem sessão.';
  end if;

  if not eh_super_admin() then
    raise exception 'Só um super administrador pode gerir administradores.';
  end if;

  if p_user_id = v_quem then
    raise exception 'Não podes alterar o teu próprio acesso.';
  end if;

  select pe.id, pe.admin, pe.super_admin into v_alvo
    from perfis_escola pe
   where pe.id = p_user_id;

  if not found then
    raise exception 'Pessoa não encontrada.';
  end if;

  -- Secretaria sem acesso ao painel não é nada: seria uma marca que não
  -- se vê em lado nenhum e que alguém mais tarde leria como poder a
  -- mais.
  if not v_alvo.admin and p_secretaria then
    raise exception 'Primeiro dá-lhe acesso à administração.';
  end if;

  update perfis_escola set secretaria = p_secretaria where id = p_user_id;
end;
$$;

grant execute on function public.definir_secretaria(uuid, boolean) to authenticated;

commit;
