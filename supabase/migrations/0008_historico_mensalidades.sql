-- O histórico de mensalidades tem de sobreviver a um aluno se desmatricular
-- (a matrícula pode ser apagada, mas o registo de pagamentos não). Por
-- isso a identidade de cada mensalidade passa a ser (aluno, professor,
-- ano, mês) — independente da matrícula continuar a existir — em vez de
-- (matrícula, ano, mês).
alter table mensalidades add column aluno_id uuid references profiles(id) on delete set null;
alter table mensalidades add column professor_id uuid references profiles(id) on delete set null;
alter table mensalidades add column instrumento_nome text;

update mensalidades men
set aluno_id = mat.aluno_id,
    professor_id = mat.professor_id,
    instrumento_nome = ins.nome
from matriculas mat
left join instrumentos ins on ins.id = mat.instrumento_id
where men.matricula_id = mat.id;

alter table mensalidades alter column aluno_id set not null;
alter table mensalidades alter column professor_id set not null;

-- A matrícula fica só como referência informativa — deixa de cascatear a
-- eliminação: apagar a matrícula agora só desliga esta ligação (set null),
-- nunca apaga o histórico de pagamentos.
alter table mensalidades drop constraint if exists mensalidades_matricula_id_fkey;
alter table mensalidades alter column matricula_id drop not null;
alter table mensalidades add constraint mensalidades_matricula_id_fkey
  foreign key (matricula_id) references matriculas(id) on delete set null;

alter table mensalidades drop constraint if exists mensalidades_matricula_id_ano_mes_key;
alter table mensalidades add constraint mensalidades_aluno_professor_ano_mes_key
  unique (aluno_id, professor_id, ano, mes);

-- As funções automáticas passam a preencher aluno_id/professor_id/
-- instrumento_nome diretamente e a usar a nova identidade no "on conflict".
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
           ins.nome as instrumento_nome
    from public.matriculas mat
    left join public.instrumentos ins on ins.id = mat.instrumento_id
    where mat.estado = 'confirmado' and mat.valor_mensal is not null
  loop
    nova_id := null;

    insert into public.mensalidades (
      matricula_id, aluno_id, professor_id, instrumento_nome, ano, mes, valor
    )
    values (
      m.matricula_id, m.aluno_id, m.professor_id, m.instrumento_nome,
      extract(year from hoje)::int, extract(month from hoje)::int, m.valor_mensal
    )
    on conflict (aluno_id, professor_id, ano, mes) do nothing
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
    select id, valor, aluno_id
    from public.mensalidades
    where ano = extract(year from hoje)::int
      and mes = extract(month from hoje)::int
      and pago = false
      and aviso_final_enviado = false
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
