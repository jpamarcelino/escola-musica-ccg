-- O que o professor recebe não é o que a família paga.
--
-- Numa mensalidade de 50 €, 10 € ficam para o CCG e 40 € são do
-- professor. Até aqui a app mostrava-lhe os 50 — na linha de cada aluno
-- e no total do mês — e portanto todos os meses lhe prometia mais do que
-- ia receber.
--
-- A retenção fica em duas camadas, e não numa só:
--
--   * `taxas_escola.retencao_ccg` é o valor em vigor, por escola. A
--     Música e a Dança podem divergir, tal como já divergem na inscrição
--     e no seguro;
--   * `mensalidades.retencao_ccg` é o valor que valeu NAQUELE mês,
--     copiado no momento em que a mensalidade nasce.
--
-- A cópia é o mesmo princípio do valor das inscrições nas recomendações
-- (0028): mudar a retenção em janeiro não pode reescrever o que o
-- professor recebeu em outubro. Um extrato que se altera sozinho quando
-- os preços mudam não é um extrato.

begin;

alter table taxas_escola add column retencao_ccg numeric(10, 2) not null default 0;

-- 10 € por mensalidade, que é o valor em vigor. Fica configurável em vez
-- de escrito no código porque é o tipo de número que muda de ano para
-- ano sem avisar ninguém.
update taxas_escola set retencao_ccg = 10;

alter table mensalidades add column retencao_ccg numeric(10, 2) not null default 0;

-- As mensalidades que já existem passam a ter a retenção de hoje. É uma
-- aproximação assumida: não há registo do que valeu em cada mês passado,
-- e deixá-las a zero era continuar a dizer ao professor que recebeu o
-- valor cheio.
--
-- `least` porque a retenção nunca pode ser maior do que a própria
-- mensalidade: numa linha de 10 €, reter 10 deixaria o professor a zero,
-- e reter mais punha-o a negativo.
update mensalidades m
set retencao_ccg = least(
  m.valor,
  coalesce((
    select t.retencao_ccg
    from perfis_escola pe
    join taxas_escola t on t.programa = pe.programa
    where pe.id = m.professor_id
  ), 0)
)
where m.valor is not null;

-- A geração do dia 1 passa a copiar a retenção em vigor. O resto da
-- função é o da 0005 — ver os comentários dessa migração.
create or replace function public.gerar_mensalidades_do_mes()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hoje date := (now() at time zone 'Europe/Lisbon')::date;
  m record;
  nova_id bigint;
  v_retencao numeric(10, 2);
begin
  if extract(day from hoje) <> 1 then
    return;
  end if;

  for m in
    select mat.id as matricula_id, mat.aluno_id, mat.valor_mensal, mat.professor_id
    from public.matriculas mat
    where mat.estado = 'confirmado' and mat.valor_mensal is not null
  loop
    -- A escola vem do professor: é ela que define quanto o CCG retém.
    select least(m.valor_mensal, coalesce(t.retencao_ccg, 0)) into v_retencao
    from public.perfis_escola pe
    left join public.taxas_escola t on t.programa = pe.programa
    where pe.id = m.professor_id;

    nova_id := null;

    insert into public.mensalidades (matricula_id, ano, mes, valor, retencao_ccg)
    values (
      m.matricula_id,
      extract(year from hoje)::int,
      extract(month from hoje)::int,
      m.valor_mensal,
      coalesce(v_retencao, 0)
    )
    on conflict (matricula_id, ano, mes) do nothing
    returning id into nova_id;

    if nova_id is not null then
      insert into public.notificacoes (user_id, tipo, mensagem)
      values (
        m.aluno_id,
        'lembrete_pagamento',
        -- À família diz-se sempre o valor cheio: é o que ela paga.
        'Mensalidade de ' || to_char(m.valor_mensal, 'FM999999990.00') ||
          '€ — prazo de pagamento até dia 8.'
      );
    end if;
  end loop;
end;
$$;

commit;
