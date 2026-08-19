-- Validação automática da recomendação ao primeiro pagamento.
--
-- O Art. 11.º pede que a secretaria confirme a inscrição e o pagamento da
-- primeira mensalidade antes de a recomendação valer. A app pedia isso
-- duas vezes: uma ao marcar a mensalidade como paga, em /admin/pagamentos,
-- e outra ao escrever a mesma data à mão no formulário da recomendação.
--
-- É a mesma confirmação, feita pela mesma pessoa, sobre o mesmo facto. A
-- segunda não acrescenta verificação nenhuma — acrescenta uma
-- oportunidade de a data sair trocada, e de a recomendação ficar
-- esquecida em "registada" por ninguém se ter lembrado de lá voltar.
--
-- Passa a ser o próprio pagamento a validar. Marcar a mensalidade paga
-- continua a ser um ato humano e deliberado; o que desaparece é o
-- trabalho repetido a seguir.

begin;

-- Art. 11.º, n.º 2: o benefício só existe depois da validação, e é
-- sempre para o recomendador. O mês em que será usado não se decide
-- aqui — quem o atribui é a geração do dia 1 (Art. 13.º).
create or replace function public.validar_recomendacao_ao_pagar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aluno_id uuid;
  v_professor_id uuid;
  v_criado_em date;
  v_recomendacao record;
begin
  -- Só interessa a transição para pago. Um update que mexa noutra coluna
  -- de uma mensalidade já paga não deve repetir nada disto.
  if new.pago is not true or coalesce(old.pago, false) is true then
    return new;
  end if;

  -- O aluno e o professor vêm da própria mensalidade, e não da matrícula:
  -- desde 0008 que a mensalidade os guarda em colunas suas (not null), e
  -- desde então `matricula_id` é anulável — uma matrícula apagada deixa o
  -- histórico de pagamentos de pé com a ligação vazia. Ir buscá-los à
  -- matrícula fazia a regra depender de uma ligação que pode não existir.
  v_aluno_id := new.aluno_id;
  v_professor_id := new.professor_id;

  -- A data da matrícula é só para preencher a data de inscrição em falta.
  -- Se a matrícula já não existir, fica sem ela em vez de inventar uma.
  select m.criado_em::date into v_criado_em
  from matriculas m
  where m.id = new.matricula_id;

  -- A recomendação em que este aluno é o recomendado, com este professor,
  -- e que ainda espera validação. O índice único de 0024 garante que não
  -- há duas.
  select r.* into v_recomendacao
  from recomendacoes r
  where r.novo_aluno_id = v_aluno_id
    and r.professor_id = v_professor_id
    and r.estado = 'registada'
  limit 1;

  if not found then
    return new;
  end if;

  -- Só o PRIMEIRO pagamento valida. A comparação é por aluno e professor,
  -- e não por matrícula, pela mesma razão de cima — e porque é assim que
  -- o Art. 11.º se lê: o primeiro pagamento daquele aluno àquele
  -- professor, mesmo que a disciplina tenha mudado pelo meio.
  if exists (
    select 1 from mensalidades outra
    where outra.aluno_id = new.aluno_id
      and outra.professor_id = new.professor_id
      and outra.id <> new.id
      and outra.pago is true
  ) then
    return new;
  end if;

  update recomendacoes
  set
    -- A data do pagamento é a que ficou registada na mensalidade, e não
    -- "hoje": marcar em atraso um pagamento de há duas semanas tem de
    -- guardar a data real.
    data_primeiro_pagamento = coalesce(
      data_primeiro_pagamento, new.pago_em::date, current_date
    ),
    -- A data de inscrição não existe como campo próprio na app. O que se
    -- sabe é quando a matrícula foi criada, que é quando a família se
    -- inscreveu nesta disciplina — e é isso que fica escrito, sem fingir
    -- uma precisão que não há. Se a secretaria já lá tinha posto outra
    -- data, essa prevalece.
    data_inscricao = coalesce(data_inscricao, v_criado_em, new.pago_em::date),
    data_validacao = current_date,
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

  return new;
end;
$$;

-- Em trigger, e não na ação que marca o pagamento, porque há dois
-- caminhos que marcam mensalidades como pagas (o botão de confirmar e a
-- edição do histórico) e é provável que venha a haver mais. Uma regra
-- desta importância não deve depender de alguém se lembrar de a chamar.
drop trigger if exists mensalidades_validam_recomendacao on mensalidades;
create trigger mensalidades_validam_recomendacao
  after update of pago on mensalidades
  for each row
  execute function public.validar_recomendacao_ao_pagar();

commit;
