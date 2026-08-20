-- Duas coisas sobre dinheiro: a disciplina passa a contar, e as famílias
-- passam a ter desconto.
--
-- 1) A identidade de uma mensalidade era (aluno, professor, ano, mês).
-- Não incluía a disciplina — e por isso um aluno com duas disciplinas
-- COM O MESMO PROFESSOR era cobrado uma vez em vez de duas: o segundo
-- lançamento batia no `on conflict do nothing` e desaparecia sem dizer
-- nada. Nos dados de hoje acontecia ao Fernando (Piano + Bateria) e ao
-- Rodrigo Lima (Guitarra + Bateria).
--
-- O bilhete de identidade passa a incluir `instrumento_id`, que é
-- guardado na própria mensalidade — como já se guardava o nome do aluno e
-- o da disciplina, e pela mesma razão: o histórico tem de sobreviver a
-- apagar-se a matrícula.
--
-- 2) Desconto familiar: 10% na mensalidade, ao par. Dois familiares na
-- escola, um desconto; três, um desconto na mesma, porque é a pares;
-- quatro, dois. O desconto cai sempre em quem paga menos.
--
-- Não acumula com a isenção dos 10 € do CCG (voluntários de outras
-- valências): vale o maior dos dois. Nos preços de hoje ganha sempre a
-- isenção — 10 € contra 5 € em música, 3,60 € em dança — mas a regra
-- fica escrita para o dia em que os preços mudarem.
--
-- Nenhum destes descontos sai do bolso do professor: descem primeiro da
-- parte do CCG. Um professor de música continua a receber 40 € por aluno,
-- tenha o aluno desconto familiar, isenção, ou nenhum dos dois.

begin;

-- 1. A disciplina entra na identidade -----------------------------------
--
-- Sem chave estrangeira, de propósito, e a acompanhar o
-- `instrumento_nome` que já cá estava: uma mensalidade é um registo
-- histórico e não pode mudar de forma quando alguém apaga uma disciplina
-- do catálogo. Zero significa "sem disciplina conhecida" e mantém a
-- coluna utilizável numa chave única (um nulo não colide com outro nulo,
-- e voltávamos a ter duplicados).
alter table mensalidades add column if not exists instrumento_id bigint not null default 0;

update mensalidades m
set instrumento_id = coalesce(mat.instrumento_id, 0)
from matriculas mat
where mat.id = m.matricula_id and m.instrumento_id = 0;

-- As que já perderam a matrícula: tenta-se pelo nome guardado.
update mensalidades m
set instrumento_id = coalesce((
  select i.id from instrumentos i where i.nome = m.instrumento_nome limit 1
), 0)
where m.instrumento_id = 0 and m.instrumento_nome is not null;

alter table mensalidades drop constraint if exists mensalidades_aluno_professor_ano_mes_key;
alter table mensalidades add constraint mensalidades_identidade_key
  unique (aluno_id, professor_id, instrumento_id, ano, mes);

-- 2. De que é feito o valor, continuação ---------------------------------
alter table mensalidades add column if not exists desconto numeric(10, 2) not null default 0;

-- 3. A geração do dia 1, agora a olhar para a família inteira -----------
--
-- O desconto não se decide olhando para uma matrícula: é preciso saber
-- quantos familiares há e qual deles paga menos. Isso resolve-se na
-- consulta que alimenta o ciclo, com funções de janela, em vez de num
-- segundo ciclo em PL/pgSQL — a mesma decisão fica num sítio só e lê-se
-- de uma vez.
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

  v_letivo int := case when v_mes >= 9 then v_ano else v_ano - 1 end;
  v_chave_ini int := v_letivo * 12 + 10;
  v_chave_fim int := (v_letivo + 1) * 12 + 6;

  v_ant_chave int := v_ano * 12 + v_mes - 1;
  v_ant_ano int := (v_ant_chave - 1) / 12;
  v_ant_mes int := (v_ant_chave - 1) % 12 + 1;

  m record;
  nova_id bigint;
  v_beneficio_id bigint;
  v_quem text;

  v_isencao numeric(10, 2);
  v_desconto numeric(10, 2);
  v_beneficio numeric(10, 2);
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
    with base as (
      select mat.id as matricula_id, mat.aluno_id, mat.professor_id,
             coalesce(mat.instrumento_id, 0) as instrumento_id,
             mat.isento_ccg,
             ins.nome as instrumento_nome,
             a.nome as aluno_nome, a.encarregado_id,
             coalesce(mat.valor_mensal, t.mensalidade, 0) as preco,
             coalesce(t.inscricao, 0) as taxa_inscricao,
             coalesce(t.seguro, 0) as taxa_seguro,
             coalesce(t.retencao_ccg, 0) as taxa_retencao
      from public.matriculas mat
      join public.alunos a on a.id = mat.aluno_id
      left join public.instrumentos ins on ins.id = mat.instrumento_id
      left join public.taxas_escola t on t.programa = ins.programa
      where mat.estado = 'confirmado'
    ),
    por_aluno as (
      select b.*,
             -- A disciplina mais barata de cada aluno: é nela que cai o
             -- desconto, e é ela que leva a inscrição e o seguro do ano.
             row_number() over (
               partition by b.aluno_id order by b.preco, b.matricula_id
             ) as ordem_no_aluno,
             min(b.preco) over (partition by b.aluno_id) as preco_do_aluno
      from base b
    ),
    familia as (
      select p.*,
             -- Posição do aluno dentro da família, do mais barato para o
             -- mais caro. `dense_rank` e não `row_number` porque um aluno
             -- com duas disciplinas aparece em duas linhas e não pode
             -- gastar dois lugares.
             dense_rank() over (
               partition by p.encarregado_id
               order by p.preco_do_aluno, p.aluno_id
             ) as posicao
      from por_aluno p
    ),
    contagem as (
      -- Quantos familiares. Sai do próprio ranking: como o `dense_rank`
      -- dá um lugar a cada aluno, o maior lugar da família é o número de
      -- alunos que ela tem. `count(distinct …) over (…)` seria a forma
      -- óbvia de o dizer e o Postgres não a implementa.
      select f.*, max(f.posicao) over (partition by f.encarregado_id) as familiares
      from familia f
    )
    select c.*,
           -- Ao par: dois familiares dão um desconto, três dão um na
           -- mesma, quatro dão dois. Sempre a quem paga menos.
           (c.posicao <= floor(c.familiares / 2.0) and c.ordem_no_aluno = 1) as tem_desconto
    from contagem c
    -- Ordem determinada, para o ciclo não depender da sorte: dois
    -- lançamentos do mesmo aluno têm de sair sempre pela mesma ordem.
    order by c.aluno_id, c.ordem_no_aluno
  loop
    select b.id into v_beneficio_id
    from public.beneficios b
    where b.aluno_id = m.aluno_id
      and b.professor_id = m.professor_id
      and b.estado = 'pendente'
    order by b.criado_em, b.id
    limit 1;

    -- Os dois benefícios possíveis, e só o maior conta.
    v_isencao := case when m.isento_ccg then least(m.taxa_retencao, m.preco) else 0 end;
    v_desconto := case when m.tem_desconto then round(m.preco * 0.10, 2) else 0 end;
    v_beneficio := greatest(v_isencao, v_desconto);

    v_mensalidade := case
      when v_beneficio_id is not null then 0
      else greatest(m.preco - v_beneficio, 0)
    end;

    -- Inscrição e seguro: uma vez por ano letivo e por ALUNO, não por
    -- disciplina. Quem anda em duas disciplinas inscreveu-se uma vez.
    -- `ordem_no_aluno = 1` garante que só uma das linhas as leva.
    --
    -- O mês corrente fica de fora da pergunta, e é isso que a faz
    -- funcionar: sem essa exclusão, a primeira disciplina que este mesmo
    -- ciclo inserisse tornava a resposta "não" para as irmãs — e se
    -- calhasse ser processada primeiro uma que não é a `ordem 1`, o aluno
    -- acabava o ano inteiro sem pagar inscrição nenhuma. Aconteceu em
    -- teste, a um aluno com três disciplinas.
    select not exists (
      select 1 from public.mensalidades men
      where men.aluno_id = m.aluno_id
        and (men.ano * 12 + men.mes) between v_chave_ini and v_chave_fim
        and (men.ano * 12 + men.mes) <> (v_ano * 12 + v_mes)
    ) into v_primeira;

    v_inscricao := case
      when v_primeira and m.ordem_no_aluno = 1 then m.taxa_inscricao else 0
    end;
    v_seguro := case
      when v_primeira and m.ordem_no_aluno = 1 then m.taxa_seguro else 0
    end;

    -- O atraso é por disciplina: cada mensalidade é a sua própria dívida.
    v_devia := false;
    if v_mensalidade > 0 then
      select true into v_devia
      from public.mensalidades men
      where men.aluno_id = m.aluno_id
        and men.professor_id = m.professor_id
        and men.instrumento_id = m.instrumento_id
        and men.ano = v_ant_ano
        and men.mes = v_ant_mes
        and men.pago = false
        and men.desistencia = false
        and men.beneficio_id is null
        and men.valor > 0;
    end if;

    v_acrescimo := case
      when coalesce(v_devia, false) then round(v_mensalidade * 0.20, 2) else 0
    end;

    -- O desconto desce primeiro da parte do CCG. Só depois de a esgotar é
    -- que tocaria no professor — que com os preços de hoje nunca acontece,
    -- e que a fórmula trata sozinho se um dia acontecer.
    v_retencao := least(
      greatest(m.taxa_retencao - v_beneficio, 0),
      v_mensalidade
    );

    v_total := v_mensalidade + v_acrescimo + v_inscricao + v_seguro;

    nova_id := null;

    insert into public.mensalidades (
      matricula_id, aluno_id, professor_id, instrumento_id, instrumento_nome, aluno_nome,
      ano, mes, valor, desconto, acrescimo, inscricao, seguro, retencao_ccg,
      pago, pago_em, beneficio_id
    )
    values (
      m.matricula_id, m.aluno_id, m.professor_id, m.instrumento_id, m.instrumento_nome,
      m.aluno_nome, v_ano, v_mes, v_total,
      case when v_beneficio_id is null then v_beneficio else 0 end,
      v_acrescimo, v_inscricao, v_seguro, v_retencao,
      v_total = 0,
      case when v_total = 0 then now() else null end,
      v_beneficio_id
    )
    on conflict (aluno_id, professor_id, instrumento_id, ano, mes) do nothing
    returning id into nova_id;

    if nova_id is null then
      continue;
    end if;

    if v_beneficio_id is not null then
      update public.beneficios
      set estado = 'usado',
          ano_uso = v_ano,
          mes_uso = v_mes,
          mensalidade_id = nova_id,
          valor_coberto = m.preco,
          atualizado_em = now()
      where id = v_beneficio_id;
    end if;

    v_quem := m.aluno_nome ||
      case
        when coalesce(m.instrumento_nome, '') = '' then ''
        else ', relativa a ' || m.instrumento_nome || ','
      end;

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
  end loop;
end;
$$;

commit;
