-- Fase 2 do plano "Conta CCG": matriculas.aluno_id passa a apontar para
-- alunos(id) em vez de profiles(id) — a peça central que desliga de vez
-- "ter aulas" de "ter login próprio". Sem isto, um perfil de aluno
-- dependente (sem conta) nunca poderia ter matrículas.
--
-- Hoje (verificado antes de escrever esta migração) todas as 5 matrículas
-- e as 2 presenças existentes já têm um "alunos" correspondente via
-- propria_conta_id (backfill da migração 0015) — não há mensalidades
-- ainda (ano letivo só começa em outubro). O backfill abaixo é por isso
-- garantidamente completo para os dados atuais.

alter table matriculas drop constraint matriculas_aluno_id_fkey;

update matriculas m
set aluno_id = a.id
from alunos a
where a.propria_conta_id = m.aluno_id;

alter table matriculas add constraint matriculas_aluno_id_fkey
  foreign key (aluno_id) references alunos(id) on delete cascade;

-- mensalidades.aluno_id já não tinha FK (migração 0014). presencas.aluno_id
-- ainda tinha uma para profiles(id) (migração 0013, "on delete set null")
-- — que deixa de fazer sentido, pelo mesmo motivo: passa a ser um
-- identificador histórico solto, tal como mensalidades, para sobreviver a
-- uma conta ser apagada sem se desligar sozinho.
alter table presencas drop constraint presencas_aluno_id_fkey;

update presencas p
set aluno_id = a.id
from alunos a
where p.aluno_id is not null and a.propria_conta_id = p.aluno_id;

update mensalidades m
set aluno_id = a.id
from alunos a
where m.aluno_id is not null and a.propria_conta_id = m.aluno_id;

-- RLS de matriculas: "auth.uid() = aluno_id" deixa de fazer sentido —
-- aluno_id já não é uma conta de login. Passa a verificar-se que o aluno
-- é gerido pela conta autenticada (auth.uid() = alunos.encarregado_id).
drop policy "Aluno e professor veem as suas matrículas" on matriculas;
create policy "Aluno e professor veem as suas matrículas"
  on matriculas for select
  to authenticated
  using (
    exists (select 1 from alunos a where a.id = aluno_id and a.encarregado_id = auth.uid())
    or auth.uid() = professor_id
  );

drop policy "Aluno cria a sua matrícula" on matriculas;
create policy "Aluno cria a sua matrícula"
  on matriculas for insert
  to authenticated
  with check (
    exists (select 1 from alunos a where a.id = aluno_id and a.encarregado_id = auth.uid())
  );

drop policy "Aluno cancela o seu pedido pendente" on matriculas;
create policy "Aluno cancela o seu pedido pendente"
  on matriculas for delete
  to authenticated
  using (
    estado = 'a_escolher'
    and exists (select 1 from alunos a where a.id = aluno_id and a.encarregado_id = auth.uid())
  );

drop policy "Aluno cancela a sua matrícula confirmada" on matriculas;
create policy "Aluno cancela a sua matrícula confirmada"
  on matriculas for delete
  to authenticated
  using (
    estado = 'confirmado'
    and exists (select 1 from alunos a where a.id = aluno_id and a.encarregado_id = auth.uid())
  );

drop policy "Aluno e professor veem disponibilidades da matrícula" on disponibilidades_selecionadas;
create policy "Aluno e professor veem disponibilidades da matrícula"
  on disponibilidades_selecionadas for select
  to authenticated
  using (
    exists (
      select 1 from matriculas m
      join alunos a on a.id = m.aluno_id
      where m.id = matricula_id
      and (a.encarregado_id = auth.uid() or m.professor_id = auth.uid())
    )
  );

drop policy "Aluno gere as suas disponibilidades" on disponibilidades_selecionadas;
create policy "Aluno gere as suas disponibilidades"
  on disponibilidades_selecionadas for all
  to authenticated
  using (
    exists (
      select 1 from matriculas m
      join alunos a on a.id = m.aluno_id
      where m.id = matricula_id and a.encarregado_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from matriculas m
      join alunos a on a.id = m.aluno_id
      where m.id = matricula_id and a.encarregado_id = auth.uid()
    )
  );

-- Apagar a própria conta: passa a percorrer TODOS os alunos geridos por
-- esta conta (o próprio, se for esse o caso, e quaisquer dependentes) —
-- cada um deles pode ter matrículas próprias a marcar como "DT". Antes só
-- olhava para auth.uid() como se fosse sempre o próprio aluno.
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
  select tipo into v_tipo from public.profiles where id = auth.uid();

  if v_tipo = 'aluno' then
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

-- Cron: notificações passam a ir para quem gere o aluno (encarregado_id),
-- não para "aluno_id" como se fosse sempre uma conta de login — um
-- dependente não tem inbox própria. Também passa a gravar aluno_nome logo
-- na criação (antes ficava em branco até alguém editar manualmente).
create or replace function public.gerar_mensalidades_e_avisos()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hoje date := (now() at time zone 'Europe/Lisbon')::date;
  m record;
  nova_id bigint;
begin
  if extract(day from hoje) <> 1 then
    return;
  end if;
  if hoje < date '2026-10-01' or hoje > date '2027-06-30' then
    return;
  end if;

  for m in
    select mat.id as matricula_id, mat.aluno_id, mat.professor_id, mat.valor_mensal,
           a.nome as aluno_nome, a.encarregado_id, ins.nome as instrumento_nome
    from public.matriculas mat
    join public.alunos a on a.id = mat.aluno_id
    left join public.instrumentos ins on ins.id = mat.instrumento_id
    where mat.estado = 'confirmado' and mat.valor_mensal is not null
  loop
    nova_id := null;

    insert into public.mensalidades (
      matricula_id, aluno_id, professor_id, instrumento_nome, aluno_nome, ano, mes, valor
    )
    values (
      m.matricula_id, m.aluno_id, m.professor_id, m.instrumento_nome, m.aluno_nome,
      extract(year from hoje)::int, extract(month from hoje)::int, m.valor_mensal
    )
    on conflict (aluno_id, professor_id, ano, mes) do nothing
    returning id into nova_id;

    if nova_id is not null then
      insert into public.notificacoes (user_id, tipo, mensagem)
      values (
        m.encarregado_id,
        'lembrete_pagamento',
        'Mensalidade de ' || m.aluno_nome || ': ' || to_char(m.valor_mensal, 'FM999999990.00') ||
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
    select men.id, men.valor, men.aluno_nome, a.encarregado_id
    from public.mensalidades men
    join public.alunos a on a.id = men.aluno_id
    where men.ano = extract(year from hoje)::int
      and men.mes = extract(month from hoje)::int
      and men.pago = false
      and men.aviso_final_enviado = false
  loop
    insert into public.notificacoes (user_id, tipo, mensagem)
    values (
      m.encarregado_id,
      'lembrete_pagamento',
      'Aviso final: ainda não recebemos o pagamento da mensalidade de ' || m.aluno_nome ||
        ' (' || to_char(m.valor, 'FM999999990.00') || '€), com prazo a dia 8. ' ||
        'Por favor regulariza o quanto antes.'
    );

    update public.mensalidades set aviso_final_enviado = true where id = m.id;
  end loop;
end;
$$;
