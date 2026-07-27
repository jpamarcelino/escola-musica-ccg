-- Mensalidades — só o admin gere isto (definir o valor de cada aluno,
-- marcar quem já pagou). A automação (lembrete dia 1, aviso final dia 20)
-- corre sozinha via funções "security definer", chamadas por um cron job
-- do Vercel sem sessão de utilizador — por isso têm de ser executáveis
-- por "anon", e por isso mesmo cada uma confirma internamente o dia do
-- mês antes de fazer seja o que for, e são idempotentes (podem ser
-- chamadas várias vezes no mesmo dia sem duplicar nada).

-- O valor mensal é por matrícula (disciplina), não por aluno — um aluno
-- com piano e dança aparece uma vez em cada cartão de professor, com o
-- seu próprio valor e o seu próprio "pago este mês".
alter table matriculas add column valor_mensal numeric(10, 2);

create policy "Administradores atualizam matrículas (mensalidade)"
  on matriculas for update
  to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.admin))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.admin));

create table mensalidades (
  id bigint generated always as identity primary key,
  matricula_id bigint not null references matriculas(id) on delete cascade,
  ano int not null,
  mes int not null check (mes between 1 and 12),
  valor numeric(10, 2) not null,
  pago boolean not null default false,
  pago_em timestamptz,
  marcado_por uuid references profiles(id) on delete set null,
  -- Evita mandar o aviso final duas vezes, mesmo que a função do dia 20
  -- seja chamada mais que uma vez nesse dia.
  aviso_final_enviado boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (matricula_id, ano, mes)
);

alter table mensalidades enable row level security;

create policy "Administradores gerem mensalidades"
  on mensalidades for all
  to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.admin))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.admin));

-- Dia 1: cria a cobrança do mês para cada matrícula confirmada com valor
-- definido, e notifica o aluno. "on conflict do nothing" garante que
-- chamar isto várias vezes no mesmo dia 1 não duplica a cobrança nem o
-- aviso (só notifica quando a linha é mesmo nova).
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

  for m in
    select id as matricula_id, aluno_id, valor_mensal
    from public.matriculas
    where estado = 'confirmado' and valor_mensal is not null
  loop
    nova_id := null;

    insert into public.mensalidades (matricula_id, ano, mes, valor)
    values (m.matricula_id, extract(year from hoje)::int, extract(month from hoje)::int, m.valor_mensal)
    on conflict (matricula_id, ano, mes) do nothing
    returning id into nova_id;

    if nova_id is not null then
      insert into public.notificacoes (user_id, tipo, mensagem)
      values (
        m.aluno_id,
        'lembrete_pagamento',
        'Mensalidade de ' || to_char(m.valor_mensal, 'FM999999990.00') ||
          '€ — prazo de pagamento até dia 8.'
      );
    end if;
  end loop;
end;
$$;

-- Dia 20: avisa quem ainda não pagou a mensalidade deste mês. A flag
-- "aviso_final_enviado" garante que não manda o aviso duas vezes.
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

  for m in
    select men.id, men.valor, mat.aluno_id
    from public.mensalidades men
    join public.matriculas mat on mat.id = men.matricula_id
    where men.ano = extract(year from hoje)::int
      and men.mes = extract(month from hoje)::int
      and men.pago = false
      and men.aviso_final_enviado = false
  loop
    insert into public.notificacoes (user_id, tipo, mensagem)
    values (
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

-- Chamadas sem sessão (o cron job do Vercel não tem utilizador
-- autenticado) chegam como "anon" — por isso o grant tem de incluir esse
-- papel, apesar de as funções ficarem seguras pela guarda do dia do mês
-- e pela idempotência acima.
grant execute on function public.gerar_mensalidades_e_avisos() to anon, authenticated;
grant execute on function public.avisar_pagamentos_em_falta() to anon, authenticated;
