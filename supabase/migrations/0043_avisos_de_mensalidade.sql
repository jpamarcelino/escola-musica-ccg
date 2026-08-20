-- Os dois avisos automáticos de mensalidade, com o texto da escola.
--
-- Os avisos já existiam e já corriam nos dias certos: o do dia 1 dentro
-- de `gerar_mensalidades_e_avisos`, o do dia 20 dentro de
-- `avisar_pagamentos_em_falta`, ambos chamados pelo cron diário
-- (`/api/cron/mensalidades`, um só agendamento porque o plano do Vercel
-- não dá mais). O que muda aqui é o que eles dizem.
--
-- Três diferenças em relação ao texto anterior:
--
--   1. O nome do aluno volta ao texto. A migração 0024 tinha-o tirado, e
--      a 0025 pôs `notificacoes.aluno_id` no lugar dele — uma etiqueta na
--      lista de avisos a dizer de quem se fala. Isso deixou de chegar: com
--      as push (0041), o que aterra no telemóvel é o texto e mais nada, e
--      "a mensalidade deste mês" numa família com dois filhos não diz de
--      quem é. O `aluno_id` fica na mesma — é o que faz o filtro por aluno.
--
--   2. A disciplina também. Duas matrículas são duas mensalidades, e dois
--      avisos iguais no mesmo dia eram indistinguíveis.
--
--   3. O registo é o da secretaria, não o da app. Estes avisos são
--      cobrança; o texto foi escrito pela direção e está aqui tal e qual.
--
-- O valor em euros sai do texto do dia 1 — era o que lá estava antes.
-- Fica registado que sai: hoje não há mais nenhum sítio na app onde uma
-- família veja quanto tem a pagar.

begin;

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
  v_quem text;
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

    -- "de Fulano, relativa a Piano" — ou só "de Fulano", quando a
    -- disciplina se perdeu (a matrícula aponta para um instrumento
    -- apagado). Uma frase com um espaço em branco no meio dela era pior
    -- do que uma frase mais curta.
    v_quem := m.aluno_nome ||
      case
        when coalesce(m.instrumento_nome, '') = '' then ''
        else ', relativa a ' || m.instrumento_nome || ','
      end;

    if v_beneficio_id is not null then
      update public.beneficios
      set estado = 'usado',
          ano_uso = v_ano,
          mes_uso = v_mes,
          mensalidade_id = nova_id,
          valor_coberto = m.valor_mensal,
          atualizado_em = now()
      where id = v_beneficio_id;

      -- O mês grátis não leva prazo nenhum: dizer a alguém que tem de
      -- pagar até dia 8 aquilo que já está pago era o pior erro que este
      -- aviso podia cometer.
      insert into public.notificacoes (user_id, aluno_id, tipo, mensagem)
      values (
        m.encarregado_id,
        m.aluno_id,
        'lembrete_pagamento',
        'Informamos que a mensalidade de ' || v_quem ||
          ' se encontra abrangida pelo Programa de Recomendação. ' ||
          'Não há qualquer valor a pagar este mês.'
      );
    else
      insert into public.notificacoes (user_id, aluno_id, tipo, mensagem)
      values (
        m.encarregado_id,
        m.aluno_id,
        'lembrete_pagamento',
        'Informamos que a mensalidade de ' || v_quem ||
          ' deverá ser paga até ao dia 8 do mês corrente.'
      );
    end if;
  end loop;
end;
$$;

-- Dia 20: só quem ainda não tem a mensalidade confirmada.
--
-- As três condições que decidem isso já lá estavam e ficam: `pago = false`
-- (a secretaria ainda não confirmou), `aviso_final_enviado = false` (não
-- se avisa duas vezes) e `beneficio_id is null` (um mês grátis não está em
-- atraso, está pago).
create or replace function public.avisar_pagamentos_em_falta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hoje date := (now() at time zone 'Europe/Lisbon')::date;
  m record;
  v_quem text;
begin
  if extract(day from hoje) <> 20 then
    return;
  end if;
  if hoje < date '2026-10-01' or hoje > date '2027-06-30' then
    return;
  end if;

  for m in
    select men.id, men.valor, men.aluno_id, men.instrumento_nome,
           a.nome as aluno_nome, a.encarregado_id
    from public.mensalidades men
    join public.alunos a on a.id = men.aluno_id
    where men.ano = extract(year from hoje)::int
      and men.mes = extract(month from hoje)::int
      and men.pago = false
      and men.aviso_final_enviado = false
      and men.beneficio_id is null
  loop
    v_quem := m.aluno_nome ||
      case
        when coalesce(m.instrumento_nome, '') = '' then ''
        else ', relativa a ' || m.instrumento_nome || ','
      end;

    insert into public.notificacoes (user_id, aluno_id, tipo, mensagem)
    values (
      m.encarregado_id,
      m.aluno_id,
      'lembrete_pagamento',
      'Informamos que a mensalidade de ' || v_quem ||
        ' se encontra em atraso. Caso o pagamento não seja regularizado ' ||
        'até ao final do mês, será aplicado um acréscimo de 20% na ' ||
        'mensalidade do mês seguinte. Se já efetuou o pagamento, por favor ' ||
        'desconsidere esta mensagem.'
    );

    update public.mensalidades set aviso_final_enviado = true where id = m.id;
  end loop;
end;
$$;

commit;
