-- Os preços da escola, e o que a app pode calcular sozinha.
--
-- Até aqui, `matriculas.valor_mensal` era escrito à mão pela secretaria,
-- aluno a aluno, e sem ele não se gerava mensalidade nem saía aviso — em
-- silêncio. Estavam dez matrículas em onze sem valor. A 1 de outubro,
-- dez famílias não recebiam nada e ninguém dava por isso.
--
-- Passa a haver preço de tabela por escola, ao lado da inscrição, do
-- seguro e da retenção do CCG, que já ali viviam. O `valor_mensal` da
-- matrícula deixa de ser obrigatório e passa a ser o que sempre devia
-- ter sido: uma exceção que se escreve por cima da regra.
--
-- O que fica automático, porque é regra:
--
--   * o preço (50 € música, 36 € dança e bebés);
--   * a inscrição e o seguro, uma vez por ano letivo, na primeira
--     mensalidade desse ano;
--   * o acréscimo de 20% quando o mês anterior ficou por pagar.
--
-- O que fica à mão, porque é caso a caso:
--
--   * a isenção dos 10 € do CCG (voluntários do rancho e afins);
--   * o valor de um mês em concreto — um aluno que entrou a meio do mês
--     paga metade, e isso não se adivinha. A secretaria corrige na
--     grelha do histórico, que já existe e já grava o valor.
--
-- Nada disto aparece no texto dos avisos. Um número dentro de uma
-- notificação fica congelado no telemóvel de quem a recebeu: se a
-- secretaria corrigir o valor no dia 3, a mensagem do dia 1 continua a
-- mentir, para sempre. O valor vive numa página, que diz a verdade de
-- hoje — e é para lá que o aviso passa a levar.

begin;

-- 1. O preço de tabela ------------------------------------------------

alter table taxas_escola add column if not exists mensalidade numeric(10, 2) not null default 0;

update taxas_escola set mensalidade = 50 where programa = 'musica';
update taxas_escola set mensalidade = 36 where programa in ('danca', 'bebes');

-- 2. A isenção dos 10 € do CCG ----------------------------------------
--
-- Na matrícula e não na pessoa, de propósito: quem decide é a secretaria,
-- caso a caso, e um voluntário do rancho pode ter um filho isento e outro
-- não. Uma regra automática ("é voluntário, logo não paga") obrigaria a
-- app a saber quem é voluntário, e ela não sabe nem tem como saber.
alter table matriculas add column if not exists isento_ccg boolean not null default false;

-- 3. De que é feito o valor de cada mês -------------------------------
--
-- `valor` continua a ser o que a família paga — é o número que a grelha
-- do histórico edita e que a secretaria confirma. Estas três colunas
-- dizem de que ele é feito, e existem por duas razões: para a página da
-- família poder explicar o valor em vez de o afirmar, e porque nenhuma
-- delas é do professor. Sem as separar, uma inscrição de 10 € aparecia
-- ao professor como 10 € que lhe entravam.
alter table mensalidades add column if not exists acrescimo numeric(10, 2) not null default 0;
alter table mensalidades add column if not exists inscricao numeric(10, 2) not null default 0;
alter table mensalidades add column if not exists seguro numeric(10, 2) not null default 0;

-- 4. Uma função morta que já custou dinheiro --------------------------
--
-- A 0038 criou a retenção do CCG e foi ensiná-la a `gerar_mensalidades_do_mes`
-- — que não é chamada por ninguém. Quem corre é `gerar_mensalidades_e_avisos`,
-- e essa nunca preencheu a retenção: a partir de outubro, todas as
-- mensalidades novas nasciam com retenção zero e o professor via 50 € onde
-- devia ver 40 €.
--
-- A cópia morta desaparece. Foi por parecer viva que o erro passou.
drop function if exists public.gerar_mensalidades_do_mes();

-- 5. A família passa a poder ver o que deve -----------------------------
--
-- `mensalidades` só era legível por administradores e pelo professor dos
-- alunos em causa. A família — que é quem paga — não via nada, e por isso
-- o valor só existia dentro do texto de um aviso. Aqui está a raiz do
-- problema que esta migração resolve.
--
-- Função `security definer` em vez de subconsulta dentro da policy: é a
-- regra deste projeto desde a 0019, onde uma verificação cruzada inline
-- entre `alunos` e `matriculas` deu recursão infinita (42P17). A função
-- corta o ciclo por construção.
create or replace function public.eh_meu_educando(p_aluno_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from alunos a
    where a.id = p_aluno_id and a.encarregado_id = auth.uid()
  );
$$;

grant execute on function public.eh_meu_educando(uuid) to authenticated;

drop policy if exists "Encarregado ve as mensalidades dos seus educandos" on mensalidades;
create policy "Encarregado ve as mensalidades dos seus educandos"
  on mensalidades for select
  to authenticated
  using (eh_meu_educando(aluno_id));

-- Ver, e só. Quem confirma um pagamento é a secretaria — a policy de
-- escrita continua a ser só dela.

-- 6. O aviso passa a levar ao valor -----------------------------------
update tipos_aviso
set destino = '/dashboard/mensalidades'
where tipo = 'lembrete_pagamento';

-- 7. A geração do dia 1 -----------------------------------------------

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

  -- O ano letivo a que este mês pertence. De setembro em diante é o que
  -- começa neste ano civil; de janeiro a agosto é o que começou no
  -- anterior. Serve para saber se esta é a primeira mensalidade do ano
  -- (a que leva inscrição e seguro).
  v_letivo int := case when v_mes >= 9 then v_ano else v_ano - 1 end;
  v_chave_ini int := v_letivo * 12 + 10;
  v_chave_fim int := (v_letivo + 1) * 12 + 6;

  -- O mês anterior, para o acréscimo.
  v_ant_chave int := v_ano * 12 + v_mes - 1;
  v_ant_ano int := (v_ant_chave - 1) / 12;
  v_ant_mes int := (v_ant_chave - 1) % 12 + 1;

  m record;
  nova_id bigint;
  v_beneficio_id bigint;
  v_quem text;

  v_preco numeric(10, 2);
  v_mensalidade numeric(10, 2);
  v_acrescimo numeric(10, 2);
  v_inscricao numeric(10, 2);
  v_seguro numeric(10, 2);
  v_retencao numeric(10, 2);
  v_total numeric(10, 2);
  v_primeira boolean;
  v_devia boolean;
begin
  if extract(day from hoje) <> 1 then
    return;
  end if;
  if hoje < date '2026-10-01' or hoje > date '2027-06-30' then
    return;
  end if;

  for m in
    select mat.id as matricula_id, mat.aluno_id, mat.professor_id,
           mat.valor_mensal, mat.isento_ccg,
           ins.nome as instrumento_nome, a.nome as aluno_nome, a.encarregado_id,
           t.mensalidade as preco_tabela,
           coalesce(t.inscricao, 0) as taxa_inscricao,
           coalesce(t.seguro, 0) as taxa_seguro,
           coalesce(t.retencao_ccg, 0) as taxa_retencao
    from public.matriculas mat
    join public.alunos a on a.id = mat.aluno_id
    left join public.instrumentos ins on ins.id = mat.instrumento_id
    left join public.taxas_escola t on t.programa = ins.programa
    -- O filtro `valor_mensal is not null` desapareceu: o preço agora vem
    -- da tabela, e a matrícula só o escreve por cima quando é caso disso.
    where mat.estado = 'confirmado'
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

    -- O preço: o da matrícula manda sobre o da tabela.
    --
    -- A isenção desconta na FAMÍLIA e não no professor: quem é voluntário
    -- deixa de pagar os 10 € que iam para o CCG, e o professor continua a
    -- receber os seus 40. Descontar só na retenção deixava a família a
    -- pagar os 50 na mesma e entregava os 10 ao professor — que não é
    -- nada do que foi combinado.
    v_preco := coalesce(m.valor_mensal, m.preco_tabela, 0);
    if m.isento_ccg then
      v_preco := greatest(v_preco - m.taxa_retencao, 0);
    end if;

    v_mensalidade := case when v_beneficio_id is null then v_preco else 0 end;

    -- Primeira mensalidade deste ano letivo? Conta-se ANTES de inserir a
    -- deste mês, senão a resposta era sempre "não".
    select not exists (
      select 1 from public.mensalidades men
      where men.aluno_id = m.aluno_id
        and men.professor_id = m.professor_id
        and (men.ano * 12 + men.mes) between v_chave_ini and v_chave_fim
    ) into v_primeira;

    v_inscricao := case when v_primeira then m.taxa_inscricao else 0 end;
    v_seguro := case when v_primeira then m.taxa_seguro else 0 end;

    -- O acréscimo por atraso: 20% do preço, e só isso. Não acumula nem
    -- rende juros — três meses em falta dão o mesmo 20% que um. E incide
    -- sobre o preço, nunca sobre um valor já agravado.
    --
    -- Só há atraso se no mês anterior havia mesmo alguma coisa a pagar:
    -- um mês grátis do Programa, uma desistência ou um mês que nunca
    -- chegou a ser gerado não são dívida.
    v_devia := false;
    if v_mensalidade > 0 then
      select true into v_devia
      from public.mensalidades men
      where men.aluno_id = m.aluno_id
        and men.professor_id = m.professor_id
        and men.ano = v_ant_ano
        and men.mes = v_ant_mes
        and men.pago = false
        and men.desistencia = false
        and men.beneficio_id is null
        and men.valor > 0;
    end if;

    -- 20% do que esta família paga — que num isento já é o preço sem os
    -- 10 € do CCG.
    v_acrescimo := case when coalesce(v_devia, false) then round(v_mensalidade * 0.20, 2) else 0 end;

    -- A retenção do CCG sai da mensalidade, não do total: a inscrição, o
    -- seguro e o acréscimo não são do professor nem passam por ele.
    -- `least` porque reter mais do que a mensalidade punha o professor a
    -- dever dinheiro à escola.
    v_retencao := case
      when m.isento_ccg then 0
      else least(v_mensalidade, m.taxa_retencao)
    end;

    v_total := v_mensalidade + v_acrescimo + v_inscricao + v_seguro;

    nova_id := null;

    insert into public.mensalidades (
      matricula_id, aluno_id, professor_id, instrumento_nome, aluno_nome,
      ano, mes, valor, acrescimo, inscricao, seguro, retencao_ccg,
      pago, pago_em, beneficio_id
    )
    values (
      m.matricula_id, m.aluno_id, m.professor_id, m.instrumento_nome, m.aluno_nome,
      v_ano, v_mes, v_total, v_acrescimo, v_inscricao, v_seguro, v_retencao,
      -- "Paga" quando não há nada a pagar. Vale para o mês grátis do
      -- Programa e para qualquer outra razão de o total dar zero.
      v_total = 0,
      case when v_total = 0 then now() else null end,
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
          valor_coberto = v_preco,
          atualizado_em = now()
      where id = v_beneficio_id;
    end if;

    v_quem := m.aluno_nome ||
      case
        when coalesce(m.instrumento_nome, '') = '' then ''
        else ', relativa a ' || m.instrumento_nome || ','
      end;

    -- O que separa as mensagens é haver ou não alguma coisa a pagar, e
    -- não o motivo. Um mês grátis do Programa com a inscrição ainda por
    -- liquidar TEM valor a pagar, e mandar-lhe "não há nada a pagar"
    -- era mentir.
    if v_total > 0 then
      insert into public.notificacoes (user_id, aluno_id, tipo, mensagem)
      values (
        m.encarregado_id,
        m.aluno_id,
        'lembrete_pagamento',
        'Informamos que a mensalidade de ' || v_quem ||
          ' deverá ser paga até ao dia 8 do mês corrente.'
      );
    elsif v_beneficio_id is not null then
      insert into public.notificacoes (user_id, aluno_id, tipo, mensagem)
      values (
        m.encarregado_id,
        m.aluno_id,
        'lembrete_pagamento',
        'Informamos que a mensalidade de ' || v_quem ||
          ' se encontra abrangida pelo Programa de Recomendação. ' ||
          'Não há qualquer valor a pagar este mês.'
      );
    end if;
    -- Total zero sem benefício não gera aviso nenhum. É o caso de uma
    -- matrícula sem preço — nem na matrícula nem na tabela — e não há
    -- frase honesta para isso: dizer "está liquidada" seria inventar.
    -- A linha fica na grelha da secretaria, a zero, à vista.
  end loop;
end;
$$;

commit;
