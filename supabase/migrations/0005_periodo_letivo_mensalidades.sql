-- As mensalidades só começam a ser cobradas e lembradas dentro do ano
-- letivo 2026/2027 (outubro de 2026 a junho de 2027, inclusive). Fora
-- desta janela, as funções não fazem nada — mesmo que caia dia 1 ou 20.
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
