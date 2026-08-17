-- Separação definitiva entre a Conta CCG e os perfis de aluno.
--
-- Até aqui, "aluno" era ao mesmo tempo o tipo da conta autenticada e a
-- pessoa que tem aulas. Isso obrigava a que criar uma conta criasse logo
-- um aluno com o nome do titular — mesmo quando quem se regista é um pai
-- que nunca vai ter aulas. O resultado era uma lista de alunos com uma
-- pessoa a mais, e sem forma de a remover.
--
--   Conta CCG (perfis_escola.tipo = 'conta') = quem gere
--   Aluno     (linha em "alunos")            = quem tem aulas
--
-- A tabela "alunos" já suportava o modelo (encarregado_id +
-- propria_conta_id); o que faltava era deixar de a preencher sozinha.
--
-- ATENÇÃO — esta migração e o deploy do código têm de ser feitos juntos.
-- Assim que corre, qualquer código que ainda teste tipo = 'aluno' deixa de
-- reconhecer as contas e fica sem navegação.

-- 1. O tipo novo -----------------------------------------------------------
-- A constraint tem de aceitar 'conta' ANTES de migrar as linhas, e só
-- depois é que 'aluno' pode deixar de ser aceite. Feito ao contrário, o
-- update falhava contra a constraint antiga.
alter table perfis_escola drop constraint if exists perfis_escola_tipo_check;
alter table perfis_escola add constraint perfis_escola_tipo_check
  check (tipo in ('conta', 'aluno', 'professor', 'admin'));

update perfis_escola set tipo = 'conta' where tipo = 'aluno';

-- Agora que não há linhas 'aluno', fecha-se a porta. Se sobrar código a
-- escrever 'aluno', falha alto em vez de criar contas que ninguém
-- reconhece.
alter table perfis_escola drop constraint perfis_escola_tipo_check;
alter table perfis_escola add constraint perfis_escola_tipo_check
  check (tipo in ('conta', 'professor', 'admin'));

-- 2. Deixar de criar alunos sozinho ---------------------------------------
-- Este trigger (0021, e antes dele 0015) era o que criava a linha em
-- "alunos" a cada registo. É exatamente o comportamento que se quer
-- acabar: quem se regista passa a escolher em /dashboard/alunos quem vai
-- ter aulas — o próprio, um filho, ou vários.
--
-- Os alunos já existentes não são tocados: continuam com o seu
-- encarregado_id e, quando são o próprio titular, com propria_conta_id
-- preenchido. Matrículas, presenças, mensalidades e materiais seguem
-- ligados a alunos(id) e ficam intactos.
drop trigger if exists perfis_escola_sincronizar_aluno_dependente on perfis_escola;
drop function if exists public.sincronizar_aluno_dependente();

-- 3. handle_new_user() sem criação automática de aluno ---------------------
-- Diferenças face à versão da 0021:
--   * v_tipo passa a 'conta' (era 'aluno');
--   * deixa de existir o update a "alunos" com a data de nascimento — não
--     há aluno para atualizar. A data continua a ser recolhida no registo
--     e guardada em raw_user_meta_data (é a do titular da conta), mas
--     deixa de ser copiada para lado nenhum: quem for ele próprio aluno
--     indica-a ao criar o seu perfil em /dashboard/alunos;
--   * no convite de migração deixa de ser preciso apagar o aluno criado
--     automaticamente (já não é criado) — só transferir o existente.
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
  v_tipo text := 'conta';
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
      -- 'migracao_aluno' mantém v_tipo = 'conta' (é uma pessoa normal a
      -- criar a sua Conta CCG) — a transferência do perfil de aluno
      -- existente acontece já a seguir.
    end if;
  end if;

  insert into public.profiles (id, nome, email, telefone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.email,
    new.raw_user_meta_data ->> 'telefone'
  );

  insert into public.perfis_escola (id, tipo, programa, admin)
  values (new.id, v_tipo, v_programa, v_admin);

  -- Só agora, com o perfil já criado, é que dá para marcar o convite como
  -- usado — convites.usado_por referencia profiles(id), e essa linha só
  -- passa a existir depois do insert acima (marcar antes disparava sempre
  -- uma violação de foreign key).
  if v_tem_convite then
    update public.convites set usado_por = new.id, usado_em = now() where id = v_convite.id;
  end if;

  -- Nota: "if a and b" não garante em PL/pgSQL que "b" só é avaliado
  -- quando "a" é verdadeiro — por isso o "if" aninhado, já que v_convite
  -- fica literalmente por atribuir quando não há convite.
  if v_tem_convite then
    if v_convite.tipo = 'migracao_aluno' then
      -- O aluno existente (com todo o histórico) passa a ser gerido por
      -- esta conta nova. propria_conta_id fica preenchido porque um
      -- convite de migração é sempre para a própria pessoa.
      update public.alunos
        set encarregado_id = new.id, propria_conta_id = new.id
        where id = v_convite.aluno_id;
    end if;
  end if;

  return new;
end;
$$;

-- 4. apagar_propria_conta() ------------------------------------------------
-- Estava partida desde a 0021: continuava a ler "profiles.tipo", coluna
-- que essa migração eliminou ao mover o tipo para "perfis_escola". Como
-- PL/pgSQL só valida o corpo em execução, o erro (42703, coluna
-- inexistente) só aparecia a quem tentasse apagar a conta — e ninguém
-- tentou desde então. Aproveita-se para corrigir e para aceitar o tipo
-- novo. O resto do comportamento é o mesmo da 0017: marcar como
-- desistência as mensalidades futuras de todos os alunos geridos, e
-- deixar o cascade tratar do resto.
create or replace function public.apagar_propria_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo text;
  v_hoje date := (now() at time zone 'Europe/Lisbon')::date;
  v_chave_atual int := extract(year from v_hoje)::int * 12 + extract(month from v_hoje)::int;
  v_aluno record;
  m record;
begin
  select tipo into v_tipo from public.perfis_escola where id = auth.uid();

  if v_tipo = 'conta' then
    for v_aluno in select id, nome from public.alunos where encarregado_id = auth.uid()
    loop
      for m in
        select mat.professor_id, ins.nome as instrumento_nome
        from public.matriculas mat
        left join public.instrumentos ins on ins.id = mat.instrumento_id
        where mat.aluno_id = v_aluno.id
          and mat.estado = 'confirmado'
          and mat.valor_mensal is not null
      loop
        insert into public.mensalidades (
          aluno_id, professor_id, instrumento_nome, aluno_nome, ano, mes,
          valor, pago, desistencia
        )
        select v_aluno.id, m.professor_id, m.instrumento_nome, v_aluno.nome, meses.ano, meses.mes,
               null, true, true
        from (values
          (2026,9),(2026,10),(2026,11),(2026,12),
          (2027,1),(2027,2),(2027,3),(2027,4),(2027,5),(2027,6),(2027,7),(2027,8)
        ) as meses(ano, mes)
        where meses.ano * 12 + meses.mes > v_chave_atual
        on conflict (aluno_id, professor_id, ano, mes) do nothing;
      end loop;
    end loop;
  end if;

  -- O cascade de auth.users -> profiles -> alunos.encarregado_id ->
  -- matriculas.aluno_id apaga o resto sozinho (perfis dependentes
  -- incluídos); presenças e mensalidades já geradas ficam, tal como
  -- antes.
  delete from auth.users where id = auth.uid();
end;
$$;

-- 5. Avisos por aluno ------------------------------------------------------
-- As notificações continuam a pertencer à Conta CCG (user_id é sempre o
-- encarregado — um dependente não tem caixa de entrada própria), mas
-- passam a poder dizer a que aluno se referem.
--
--   aluno_id null      -> aviso geral da conta
--   aluno_id preenchido -> aviso sobre esse aluno
--
-- "on delete set null" e não cascade: se um dia um perfil de aluno for
-- apagado, o histórico de avisos não desaparece com ele — passa a geral.
-- Os avisos antigos ficam todos a null, e a página tem de continuar a
-- mostrá-los.
alter table notificacoes add column aluno_id uuid references alunos(id) on delete set null;

create index notificacoes_aluno_id_idx on notificacoes (aluno_id) where aluno_id is not null;

-- A policy de INSERT (0020) já garante que só o professor de uma
-- matrícula desse encarregado pode criar avisos. Acrescenta-se que, se o
-- aviso indicar um aluno, esse aluno tem mesmo de pertencer ao
-- destinatário — senão um professor podia carimbar o aviso com o nome de
-- um aluno de outra família.
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
    and (
      notificacoes.aluno_id is null
      or exists (
        select 1 from alunos a2
        where a2.id = notificacoes.aluno_id
          and a2.encarregado_id = notificacoes.user_id
      )
    )
  );


-- 6. Os avisos automáticos passam a identificar o aluno ---------------------
-- Partem das versões da 0024 (Programa de Recomendação), que são as que
-- estão em vigor — a única diferença é o aluno_id preenchido.
--
-- Repare-se que a 0024 tirou o nome do aluno das mensagens ("Mensalidade
-- de Piano deste mês…"), o que deixou os avisos de uma família com vários
-- filhos sem forma de dizer de quem falam. O aluno_id resolve isso sem
-- mexer no texto.
create or replace function public.gerar_mensalidades_e_avisos()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hoje date := (now() at time zone 'Europe/Lisbon')::date;
  v_ano int := extract(year from hoje)::int;
  v_mes int := extract(month from hoje)::int;
  m record;
  nova_id bigint;
  v_beneficio_id bigint;
begin
  if extract(day from hoje) <> 1 then
    return;
  end if;
  if hoje < date '2026-10-01' or hoje > date '2027-06-30' then
    return;
  end if;

  for m in
    select mat.id as matricula_id, mat.aluno_id, mat.professor_id, mat.valor_mensal,
           ins.nome as instrumento_nome, a.nome as aluno_nome, a.encarregado_id
    from public.matriculas mat
    join public.alunos a on a.id = mat.aluno_id
    left join public.instrumentos ins on ins.id = mat.instrumento_id
    where mat.estado = 'confirmado' and mat.valor_mensal is not null
  loop
    -- Art. 13.º e 14.º: havendo benefícios acumulados, gasta-se o mais
    -- antigo primeiro, um por mês — é isto que os torna "consecutivos".
    select b.id into v_beneficio_id
    from public.beneficios b
    where b.aluno_id = m.aluno_id
      and b.professor_id = m.professor_id
      and b.estado = 'pendente'
    order by b.criado_em, b.id
    limit 1;

    nova_id := null;

    insert into public.mensalidades (
      matricula_id, aluno_id, professor_id, instrumento_nome, aluno_nome,
      ano, mes, valor, pago, pago_em, beneficio_id
    )
    values (
      m.matricula_id, m.aluno_id, m.professor_id, m.instrumento_nome, m.aluno_nome,
      v_ano, v_mes,
      case when v_beneficio_id is null then m.valor_mensal else 0 end,
      v_beneficio_id is not null,
      case when v_beneficio_id is null then null else now() end,
      v_beneficio_id
    )
    on conflict (aluno_id, professor_id, ano, mes) do nothing
    returning id into nova_id;

    -- Já existia (a função correu duas vezes no mesmo dia 1): não volta a
    -- notificar nem, sobretudo, a consumir um benefício.
    if nova_id is null then
      continue;
    end if;

    if v_beneficio_id is not null then
      update public.beneficios
      set estado = 'usado',
          ano_uso = v_ano,
          mes_uso = v_mes,
          mensalidade_id = nova_id,
          valor_coberto = m.valor_mensal,
          atualizado_em = now()
      where id = v_beneficio_id;

      insert into public.notificacoes (user_id, aluno_id, tipo, mensagem)
      values (
        m.encarregado_id,
        m.aluno_id,
        'lembrete_pagamento',
        'Mensalidade de ' || m.instrumento_nome || ' deste mês abrangida pelo ' ||
          'Programa de Recomendação — não há nada a pagar.'
      );
    else
      insert into public.notificacoes (user_id, aluno_id, tipo, mensagem)
      values (
        m.encarregado_id,
        m.aluno_id,
        'lembrete_pagamento',
        'Mensalidade de ' || to_char(m.valor_mensal, 'FM999999990.00') ||
          '€ — prazo de pagamento até dia 8.'
      );
    end if;
  end loop;
end;
$$;

create or replace function public.avisar_pagamentos_em_falta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hoje date := (now() at time zone 'Europe/Lisbon')::date;
  m record;
begin
  if extract(day from hoje) <> 20 then
    return;
  end if;
  if hoje < date '2026-10-01' or hoje > date '2027-06-30' then
    return;
  end if;

  for m in
    select men.id, men.valor, men.aluno_id, a.encarregado_id
    from public.mensalidades men
    join public.alunos a on a.id = men.aluno_id
    where men.ano = extract(year from hoje)::int
      and men.mes = extract(month from hoje)::int
      and men.pago = false
      and men.aviso_final_enviado = false
      and men.beneficio_id is null
  loop
    insert into public.notificacoes (user_id, aluno_id, tipo, mensagem)
    values (
      m.encarregado_id,
      m.aluno_id,
      'lembrete_pagamento',
      'Aviso final: ainda não recebemos o pagamento da mensalidade de ' ||
        to_char(m.valor, 'FM999999990.00') || '€, com prazo a dia 8. ' ||
        'Por favor regulariza o quanto antes.'
    );

    update public.mensalidades set aviso_final_enviado = true where id = m.id;
  end loop;
end;
$$;

-- 7. Um só "próprio" por conta ---------------------------------------------
-- propria_conta_id marca o aluno que É o titular da conta (um adulto que
-- se inscreve a si mesmo). Faz sentido haver no máximo um: duas linhas a
-- dizer "este sou eu" seriam a mesma pessoa duas vezes, com matrículas
-- repartidas entre as duas.
--
-- A página de gestão de alunos já impede isto, mas duas submissões ao
-- mesmo tempo passariam pela verificação em paralelo — daí a garantia
-- ficar também aqui, que é o único sítio onde não há corrida possível.
--
-- Verificado antes de criar: nas 24 linhas existentes não há nenhuma
-- conta com mais do que um próprio.
create unique index alunos_propria_conta_unica
  on alunos (propria_conta_id)
  where propria_conta_id is not null;
