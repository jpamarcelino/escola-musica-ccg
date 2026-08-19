-- As taxas que a escola cobra, num sítio só.
--
-- O relatório final do Programa (Art. 28.º/30.º) pede o valor das
-- inscrições geradas pelas recomendações. Esse valor estava a ser pedido
-- à mão, recomendação a recomendação, e por isso ficava quase sempre por
-- preencher — ninguém escreve dez euros trinta vezes.
--
-- Mas também não pode ser uma constante escrita dentro do código: as
-- taxas mudam de ano para ano, e a Música e a Dança podem divergir. E se
-- mudarem, as recomendações antigas têm de continuar a valer o que
-- valiam na altura — um relatório que se reescreve sozinho quando os
-- preços sobem não é um relatório.
--
-- Daí esta tabela: o preço de hoje vive aqui, e é COPIADO para cada
-- recomendação no momento em que ela é validada. Mudar o preço amanhã
-- não mexe no que já aconteceu.

begin;

create table taxas_escola (
  -- Uma linha por escola. O `programa` é o mesmo vocabulário do resto da
  -- app ('musica', 'danca', 'bebes').
  programa text primary key,

  -- Cobradas uma vez, no primeiro pagamento, a somar à mensalidade.
  inscricao numeric(10, 2) not null default 0,
  seguro numeric(10, 2) not null default 0,

  atualizado_em timestamptz not null default now()
);

alter table taxas_escola enable row level security;

-- Qualquer pessoa com sessão pode ler — é o preço de tabela, não é
-- segredo, e a página de inscrição há de querer mostrá-lo. Mexer nele é
-- da secretaria.
create policy "Toda a gente lê as taxas"
  on taxas_escola for select
  to authenticated
  using (true);

create policy "Administradores mudam as taxas"
  on taxas_escola for all
  to authenticated
  using (eh_admin())
  with check (eh_admin());

insert into taxas_escola (programa, inscricao, seguro) values
  ('musica', 10, 10),
  ('danca', 10, 10),
  ('bebes', 10, 10);

-- O seguro passa a ficar guardado ao lado da inscrição. São duas taxas
-- distintas e podem divergir; somá-las numa só perderia a informação de
-- que parte do dinheiro é de quê.
alter table recomendacoes add column valor_seguro numeric(10, 2);

-- O gatilho de 0027 passa a copiar as duas taxas ao validar. O resto da
-- lógica é a mesma — ver os comentários dessa migração.
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
  v_programa text;
  v_inscricao numeric(10, 2);
  v_seguro numeric(10, 2);
  v_recomendacao record;
begin
  if new.pago is not true or coalesce(old.pago, false) is true then
    return new;
  end if;

  v_aluno_id := new.aluno_id;
  v_professor_id := new.professor_id;

  select m.criado_em::date into v_criado_em
  from matriculas m
  where m.id = new.matricula_id;

  select r.* into v_recomendacao
  from recomendacoes r
  where r.novo_aluno_id = v_aluno_id
    and r.professor_id = v_professor_id
    and r.estado = 'registada'
  limit 1;

  if not found then
    return new;
  end if;

  if exists (
    select 1 from mensalidades outra
    where outra.aluno_id = new.aluno_id
      and outra.professor_id = new.professor_id
      and outra.id <> new.id
      and outra.pago is true
  ) then
    return new;
  end if;

  -- A escola vem do professor, e não da disciplina: um professor
  -- pertence a uma escola, e `mensalidades` só guarda o nome do
  -- instrumento em texto, que não serve para ligar a lado nenhum.
  select pe.programa into v_programa
  from perfis_escola pe
  where pe.id = v_professor_id;

  select t.inscricao, t.seguro into v_inscricao, v_seguro
  from taxas_escola t
  where t.programa = v_programa;

  update recomendacoes
  set
    data_primeiro_pagamento = coalesce(data_primeiro_pagamento, new.pago_em::date, current_date),
    data_inscricao = coalesce(data_inscricao, v_criado_em, new.pago_em::date),
    -- coalesce pela mesma razão das datas: se a secretaria já lá tinha
    -- escrito um valor à mão, é esse que manda.
    valor_inscricao = coalesce(valor_inscricao, v_inscricao),
    valor_seguro = coalesce(valor_seguro, v_seguro),
    data_validacao = current_date,
    estado = 'validada',
    atualizado_em = now()
  where id = v_recomendacao.id;

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

commit;
