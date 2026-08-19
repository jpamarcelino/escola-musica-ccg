-- A validação de uma recomendação deixa de ter um botão.
--
-- O que é manual no Programa é o REGISTO da recomendação: alguém tem de
-- dizer à secretaria que o João trouxe a Maria. A validação não — essa é
-- uma consequência de um facto que a app já conhece, o primeiro
-- pagamento (Art. 11.º). A 0027 já a tinha automatizado, mas por duas
-- portas estreitas demais:
--
--   1. O gatilho era `after update of pago`. As mensalidades são
--      gravadas com `upsert`: quando a linha daquele mês ainda não
--      existe — um mês que a geração do dia 1 nunca criou, um mês
--      passado lançado à mão no histórico — o upsert faz INSERT, o
--      gatilho não corre, e a recomendação fica à espera de alguém se
--      lembrar dela. Era o esquecimento que a 0027 queria acabar, a
--      entrar por outra porta.
--
--   2. Só o primeiro pagamento validava, e por comparação com "existe
--      outra mensalidade paga?". Se a recomendação fosse registada
--      DEPOIS de o aluno já ter pago — que é o caso mais natural de
--      todos, porque é quando a secretaria dá pela recomendação — nunca
--      mais nenhum pagamento a validava.
--
-- Passa a haver uma função só, chamada de dois sítios: de qualquer
-- pagamento e do registo da própria recomendação. E a data do primeiro
-- pagamento deixa de depender da ordem por que as linhas foram
-- marcadas: é o mínimo das que estão pagas.

begin;

-- A validação, num sítio só.
--
-- Não recebe a mensalidade que a despoletou: recebe o par
-- (aluno, professor), que é o que o Art. 11.º de facto usa, e vai ela
-- própria ver se já há pagamento. Assim serve tanto a quem acabou de
-- pagar como a quem já tinha pago antes de a recomendação existir.
create or replace function public.validar_recomendacao(
  p_aluno_id uuid,
  p_professor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recomendacao record;
  v_primeiro_pagamento date;
  v_criado_em date;
  v_programa text;
  v_inscricao numeric(10, 2);
  v_seguro numeric(10, 2);
begin
  if p_aluno_id is null or p_professor_id is null then
    return;
  end if;

  -- O índice único de 0024 garante que não há duas por validar para o
  -- mesmo par.
  select r.* into v_recomendacao
  from recomendacoes r
  where r.novo_aluno_id = p_aluno_id
    and r.professor_id = p_professor_id
    and r.estado = 'registada'
  limit 1;

  if not found then
    return;
  end if;

  -- O primeiro pagamento é o mais antigo dos que estão pagos, e não "o
  -- que acabou de ser marcado": a secretaria pode lançar setembro depois
  -- de outubro, e a data que fica no registo histórico tem de ser a que
  -- aconteceu primeiro.
  -- Tudo convertido para a hora de Lisboa: o servidor está em UTC, e
  -- entre as 23h e a meia-noite `::date` ainda dá ontem. Um pagamento
  -- feito às 23h30 de 31 de outubro ficava registado em outubro no
  -- relógio da escola e em outubro no papel, mas com a data do dia
  -- anterior no relatório do fim do ano.
  select min(coalesce((m.pago_em at time zone 'Europe/Lisbon')::date, agora_na_escola()::date))
    into v_primeiro_pagamento
  from mensalidades m
  where m.aluno_id = p_aluno_id
    and m.professor_id = p_professor_id
    and m.pago is true;

  -- Sem pagamento nenhum não há validação. É a única condição do
  -- Art. 11.º que a app consegue mesmo verificar.
  if v_primeiro_pagamento is null then
    return;
  end if;

  -- A data de inscrição não existe como campo próprio. O que se sabe é
  -- quando a matrícula foi criada, que é quando a família se inscreveu.
  select min((m.criado_em at time zone 'Europe/Lisbon')::date) into v_criado_em
  from matriculas m
  where m.aluno_id = p_aluno_id
    and m.professor_id = p_professor_id;

  -- A escola vem do professor: `mensalidades` só guarda o nome do
  -- instrumento em texto, que não liga a lado nenhum.
  select pe.programa into v_programa
  from perfis_escola pe
  where pe.id = p_professor_id;

  select t.inscricao, t.seguro into v_inscricao, v_seguro
  from taxas_escola t
  where t.programa = v_programa;

  update recomendacoes
  set
    -- coalesce em todos: se a secretaria já lá tinha escrito um valor ou
    -- uma data à mão, é essa que manda.
    data_primeiro_pagamento = coalesce(data_primeiro_pagamento, v_primeiro_pagamento),
    data_inscricao = coalesce(data_inscricao, v_criado_em, v_primeiro_pagamento),
    valor_inscricao = coalesce(valor_inscricao, v_inscricao),
    valor_seguro = coalesce(valor_seguro, v_seguro),
    data_validacao = agora_na_escola()::date,
    estado = 'validada',
    atualizado_em = now()
  where id = v_recomendacao.id;

  -- O benefício é sempre do recomendador (Art. 12.º, n.º 1). O "not
  -- exists" protege de uma segunda passagem criar um segundo mês grátis.
  if not exists (
    select 1 from beneficios b where b.recomendacao_id = v_recomendacao.id
  ) then
    insert into beneficios (recomendacao_id, aluno_id, aluno_nome, professor_id)
    values (
      v_recomendacao.id,
      v_recomendacao.recomendador_id,
      v_recomendacao.recomendador_nome,
      v_recomendacao.professor_id
    );
  end if;
end;
$$;

-- Porta 1: uma mensalidade passa a paga.
create or replace function public.validar_recomendacao_ao_pagar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.pago is not true then
    return new;
  end if;
  -- Num UPDATE, só a transição interessa. Num INSERT não há `old`.
  if tg_op = 'UPDATE' and coalesce(old.pago, false) is true then
    return new;
  end if;

  perform validar_recomendacao(new.aluno_id, new.professor_id);
  return new;
end;
$$;

-- `insert or update` e não só `update`: ver o ponto 1 lá em cima. Em
-- gatilho, e não na ação que marca o pagamento, porque há vários
-- caminhos que marcam mensalidades como pagas e é provável que venha a
-- haver mais.
drop trigger if exists mensalidades_validam_recomendacao on mensalidades;
create trigger mensalidades_validam_recomendacao
  after insert or update of pago on mensalidades
  for each row
  execute function public.validar_recomendacao_ao_pagar();

-- Porta 2: a recomendação é registada depois de o aluno já ter pago.
--
-- É o caso mais comum de todos — a secretaria só soube da recomendação
-- quando a família a mencionou, semanas depois da inscrição. Sem isto,
-- ficava para sempre por validar à espera de um pagamento que já tinha
-- acontecido.
create or replace function public.validar_recomendacao_ao_registar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'registada' and new.novo_aluno_id is not null then
    perform validar_recomendacao(new.novo_aluno_id, new.professor_id);
  end if;
  return new;
end;
$$;

drop trigger if exists recomendacoes_validam_se_ja_pago on recomendacoes;
create trigger recomendacoes_validam_se_ja_pago
  after insert on recomendacoes
  for each row
  execute function public.validar_recomendacao_ao_registar();

-- As que ficaram para trás: recomendações por validar cujo aluno já
-- pagou. São exatamente as que os dois buracos acima deixaram passar.
do $$
declare
  r record;
begin
  for r in
    select id, novo_aluno_id, professor_id
    from recomendacoes
    where estado = 'registada' and novo_aluno_id is not null
  loop
    perform validar_recomendacao(r.novo_aluno_id, r.professor_id);
  end loop;
end;
$$;

commit;
