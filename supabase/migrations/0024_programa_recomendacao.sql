-- Programa de Recomendação das Escolas do CCG — projeto-piloto 2026/2027.
--
-- Modelo em duas tabelas, e não uma, porque o Regulamento trata a
-- recomendação e o benefício como coisas com vidas diferentes:
--   * "recomendacoes" é o facto histórico (quem recomendou quem, com que
--     professor, quando pagou) — é isto que alimenta o relatório final
--     do Art. 30.º/31.º e que nunca deve mudar depois de validado;
--   * "beneficios" é o direito que dela nasce (Art. 12.º), e esse tem
--     estado próprio: nasce pendente, é consumido num mês concreto
--     (Art. 13.º), acumula com outros (Art. 14.º), expira no fim do ano
--     letivo (Art. 15.º) ou perde-se (Art. 16.º/17.º).
-- Uma recomendação validada gera exatamente um benefício, mas juntá-los
-- na mesma linha obrigaria a reescrever o registo histórico sempre que o
-- benefício mudasse de estado.
--
-- Tal como em "mensalidades" desde a 0008/0014, os nomes das pessoas são
-- guardados como cópia ao lado do id. O estudo do fim do ano tem de
-- continuar a fazer sentido mesmo depois de um aluno desistir ou apagar
-- a conta — e o Art. 30.º pede precisamente dados sobre desistências.

-- 1. Adesão voluntária dos professores (Art. 3.º e 4.º).
alter table perfis_escola add column adere_recomendacao boolean not null default false;
alter table perfis_escola add column adesao_recomendacao_em timestamptz;

alter table perfis_escola add constraint perfis_escola_adesao_so_professor
  check (adere_recomendacao = false or tipo = 'professor');

-- 2. O registo central. Os campos são os do Art. 20.º, n.º 2.
create table recomendacoes (
  id bigint generated always as identity primary key,

  -- alunos(id) sem chave estrangeira viva, pelo mesmo motivo de
  -- mensalidades.aluno_id (0014): é um identificador histórico, tem de
  -- sobreviver ao aluno sair da escola sem se desligar sozinho.
  recomendador_id uuid not null,
  recomendador_nome text not null,
  novo_aluno_id uuid,
  novo_aluno_nome text not null,

  professor_id uuid not null,
  professor_nome text not null,
  modalidade text,

  data_inscricao date,
  data_primeiro_pagamento date,
  data_validacao date,

  -- §28 da proposta pede o "valor das inscrições geradas" no relatório
  -- final. Guarda-se por recomendação, e não como constante, porque a
  -- taxa de inscrição da música (10 €) e a da dança podem divergir.
  valor_inscricao numeric(10, 2),

  -- "registada" = a secretaria já sabe da recomendação mas ainda falta
  -- confirmar inscrição/pagamentos (Art. 11.º); "validada" = cumpriu tudo
  -- e o benefício já existe; "anulada" = erro, desistência do
  -- recomendador, saída do professor ou abuso (Art. 16.º/17.º/24.º).
  estado text not null default 'registada'
    check (estado in ('registada', 'validada', 'anulada')),
  motivo_anulacao text,
  observacoes text,

  registado_por uuid references profiles(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- Art. 9.º: ninguém recomenda a si próprio.
  constraint recomendacoes_nao_recomenda_a_si_proprio
    check (novo_aluno_id is null or novo_aluno_id <> recomendador_id)
);

alter table recomendacoes enable row level security;

-- Art. 25.º: quem recomendou quem é informação de gestão interna. Os
-- professores NÃO leem esta tabela — só a de benefícios, que lhes diz o
-- que precisam de saber (que mensalidade não vão receber) sem revelar a
-- relação entre recomendador e recomendado.
create policy "Administradores gerem recomendações"
  on recomendacoes for all
  to authenticated
  using (eh_admin())
  with check (eh_admin());

create index recomendacoes_professor_idx on recomendacoes (professor_id);
create index recomendacoes_recomendador_idx on recomendacoes (recomendador_id);

-- Art. 10.º, n.º 3: cada novo aluno só pode indicar um recomendador.
-- Índice parcial, e não uma constraint, por duas razões: um registo
-- anulado tem de deixar o lugar livre para a correção (Art. 23.º), e
-- vários registos feitos só com o nome escrito à mão (novo_aluno_id
-- nulo) têm de continuar a ser possíveis.
create unique index recomendacoes_um_recomendador_por_novo_aluno
  on recomendacoes (novo_aluno_id)
  where novo_aluno_id is not null and estado <> 'anulada';

-- 3. Os benefícios (Art. 12.º a 17.º).
create table beneficios (
  id bigint generated always as identity primary key,
  recomendacao_id bigint not null references recomendacoes(id) on delete cascade,

  -- O beneficiário é sempre o recomendador (Art. 12.º, n.º 1).
  aluno_id uuid not null,
  aluno_nome text not null,
  professor_id uuid not null,

  estado text not null default 'pendente'
    check (estado in ('pendente', 'usado', 'expirado', 'anulado')),

  -- Preenchidos quando o benefício é consumido, pelo dia 1 do mês
  -- seguinte (Art. 13.º).
  ano_uso int,
  mes_uso int check (mes_uso between 1 and 12),
  mensalidade_id bigint references mensalidades(id) on delete set null,
  valor_coberto numeric(10, 2),

  motivo_anulacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table beneficios enable row level security;

create policy "Administradores gerem benefícios"
  on beneficios for all
  to authenticated
  using (eh_admin())
  with check (eh_admin());

-- Art. 22.º: o professor tem de conseguir identificar, antes do
-- apuramento da sua remuneração, quais das suas mensalidades não vão ser
-- pagas por força do Programa.
create policy "Professor vê os benefícios dos seus alunos"
  on beneficios for select
  to authenticated
  using (professor_id = auth.uid());

-- Índice parcial: a pergunta feita todos os dias 1 é sempre "este aluno
-- tem benefício pendente com este professor?".
create index beneficios_pendentes_idx on beneficios (aluno_id, professor_id)
  where estado = 'pendente';

-- 4. A ligação à cobrança. Uma mensalidade com "beneficio_id" preenchido
-- é a "mensalidade não devida" do Art. 22.º, alínea c).
alter table mensalidades add column beneficio_id bigint references beneficios(id) on delete set null;

-- Fica gravada como paga e a zero de propósito: assim o resto da app
-- (mensalidades por confirmar, avisos de dívida, histórico) trata-a
-- naturalmente como assunto encerrado, sem ter de conhecer o Programa. É
-- o "beneficio_id" que a distingue de um pagamento real, e é só isso que
-- os ecrãs novos precisam de olhar.

-- Art. 22.º, de novo: sem isto o professor não consegue ver o estado das
-- mensalidades dos seus alunos, porque até agora só o admin lia esta
-- tabela.
create policy "Professor vê as mensalidades dos seus alunos"
  on mensalidades for select
  to authenticated
  using (professor_id = auth.uid());

-- 5. Adesão de um professor — via função porque as policies de RLS não
-- distinguem colunas: uma policy de update em "perfis_escola" para
-- admins deixá-los-ia também mexer em "tipo", "programa" ou "admin", que
-- hoje são exclusivos de super admins (0021). A função restringe o poder
-- exatamente a esta coluna.
create or replace function public.definir_adesao_recomendacao(
  professor_id_param uuid,
  adere_param boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só um administrador pode alterar a adesão ao Programa.';
  end if;

  update public.perfis_escola
  set adere_recomendacao = adere_param,
      adesao_recomendacao_em = case when adere_param then now() else null end
  where id = professor_id_param and tipo = 'professor';
end;
$$;

grant execute on function public.definir_adesao_recomendacao(uuid, boolean) to authenticated;

-- 6. Geração mensal — agora com o benefício aplicado automaticamente.
--
-- Corrige também um bug latente que rebentava tudo: desde a 0017,
-- "matriculas.aluno_id" aponta para alunos(id), mas continuava a ser
-- inserido em "notificacoes.user_id", que é uma chave estrangeira para
-- profiles(id). O insert falhava e, por ser dentro do ciclo, abortava a
-- função inteira — nenhuma mensalidade do mês seria gerada a partir de
-- outubro de 2026. A notificação passa a ir para o encarregado, que é
-- quem tem conta (um aluno dependente não tem login próprio).
--
-- De caminho passa a preencher "aluno_nome", que existe desde a 0014
-- precisamente para o histórico sobreviver a contas apagadas, mas que
-- esta função nunca chegou a preencher.
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

    if v_beneficio_id is not null then
      update public.beneficios
      set estado = 'usado',
          ano_uso = v_ano,
          mes_uso = v_mes,
          mensalidade_id = nova_id,
          valor_coberto = m.valor_mensal,
          atualizado_em = now()
      where id = v_beneficio_id;

      insert into public.notificacoes (user_id, tipo, mensagem)
      values (
        m.encarregado_id,
        'lembrete_pagamento',
        'Mensalidade de ' || m.instrumento_nome || ' deste mês abrangida pelo ' ||
          'Programa de Recomendação — não há nada a pagar.'
      );
    else
      insert into public.notificacoes (user_id, tipo, mensagem)
      values (
        m.encarregado_id,
        'lembrete_pagamento',
        'Mensalidade de ' || to_char(m.valor_mensal, 'FM999999990.00') ||
          '€ — prazo de pagamento até dia 8.'
      );
    end if;
  end loop;
end;
$$;

-- Mesmo bug do user_id, mesma correção. O filtro por "beneficio_id is
-- null" é defensivo: uma mensalidade coberta já fica com pago = true, por
-- isso nunca chegaria aqui de qualquer forma.
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
    select men.id, men.valor, a.encarregado_id
    from public.mensalidades men
    join public.alunos a on a.id = men.aluno_id
    where men.ano = extract(year from hoje)::int
      and men.mes = extract(month from hoje)::int
      and men.pago = false
      and men.aviso_final_enviado = false
      and men.beneficio_id is null
  loop
    insert into public.notificacoes (user_id, tipo, mensagem)
    values (
      m.encarregado_id,
      'lembrete_pagamento',
      'Aviso final: ainda não recebemos o pagamento da mensalidade de ' ||
        to_char(m.valor, 'FM999999990.00') || '€, com prazo a dia 8. ' ||
        'Por favor regulariza o quanto antes.'
    );

    update public.mensalidades set aviso_final_enviado = true where id = m.id;
  end loop;
end;
$$;

-- 7. Art. 15.º: o que não for usado até ao fim do ano letivo expira e não
-- transita. Corre no mesmo cron diário; só faz alguma coisa depois de
-- 30 de junho de 2027, e é idempotente.
create or replace function public.expirar_beneficios_ano_letivo()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (now() at time zone 'Europe/Lisbon')::date <= date '2027-06-30' then
    return;
  end if;

  update public.beneficios
  set estado = 'expirado', atualizado_em = now()
  where estado = 'pendente';
end;
$$;

grant execute on function public.expirar_beneficios_ano_letivo() to anon, authenticated;

-- 8. Art. 16.º: cancelar a matrícula faz perder imediatamente os
-- benefícios ainda não usados. Só quando deixa de haver qualquer
-- matrícula confirmada com aquele professor — um aluno que tenha duas
-- disciplinas com o mesmo professor e cancele uma continua a ser aluno
-- dele, e o Regulamento só exige "matrícula ativa" (n.º 3).
create or replace function public.anular_beneficios_por_cancelamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.estado <> 'confirmado' then
    return old;
  end if;

  if exists (
    select 1 from public.matriculas m
    where m.aluno_id = old.aluno_id
      and m.professor_id = old.professor_id
      and m.estado = 'confirmado'
      and m.id <> old.id
  ) then
    return old;
  end if;

  update public.beneficios
  set estado = 'anulado',
      motivo_anulacao = 'Matrícula cancelada (Art. 16.º do Regulamento).',
      atualizado_em = now()
  where aluno_id = old.aluno_id
    and professor_id = old.professor_id
    and estado = 'pendente';

  return old;
end;
$$;

create trigger matriculas_anula_beneficios
  after delete on matriculas
  for each row
  execute function public.anular_beneficios_por_cancelamento();
