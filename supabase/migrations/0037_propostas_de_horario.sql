-- O professor propõe outro horário; a família decide.
--
-- Até aqui, mudar o horário de um aluno confirmado não tinha caminho
-- nenhum na app: o professor combinava por telefone e alguém ia mexer na
-- base de dados, ou cancelava-se a matrícula e pedia-se outra vez do
-- zero — perdendo o histórico pelo caminho.
--
-- É uma proposta e não uma alteração porque a hora da aula é um
-- compromisso de duas partes. Um professor que mude a terça das cinco
-- para a quinta das sete pode estar a desfazer a tarde inteira de uma
-- família, e a app não tem como saber isso. Quem sabe é quem lá vai.
--
-- Não reserva a vaga. Enquanto a família não responde, o horário
-- continua livre para quem chegar primeiro — é a mesma regra das
-- reposições (0031), e a alternativa era encher a grelha de vagas mortas
-- à espera de respostas que nunca vêm.

begin;

create table propostas_horario (
  id bigint generated always as identity primary key,

  matricula_id bigint not null references matriculas(id) on delete cascade,
  aluno_id uuid not null,
  professor_id uuid not null,

  -- Onde está e para onde vai. O horário de origem fica guardado porque
  -- a proposta é um registo do que foi combinado: se entretanto o aluno
  -- mudar por outra via, quem lê a proposta tem de perceber de onde ela
  -- partia.
  horario_atual_id bigint references horarios(id) on delete set null,
  horario_novo_id bigint not null references horarios(id) on delete cascade,

  mensagem text check (mensagem is null or char_length(mensagem) <= 500),
  resposta text check (resposta is null or char_length(resposta) <= 500),

  estado text not null default 'pendente'
    check (estado in ('pendente', 'aceite', 'recusada', 'cancelada')),

  criado_em timestamptz not null default now(),
  respondido_em timestamptz
);

alter table propostas_horario enable row level security;

-- Uma proposta pendente de cada vez por matrícula. Duas propostas
-- abertas para o mesmo aluno são duas perguntas contraditórias na mesma
-- caixa de entrada.
create unique index propostas_horario_uma_pendente
  on propostas_horario (matricula_id)
  where estado = 'pendente';

create index propostas_horario_professor_idx on propostas_horario (professor_id, estado);
create index propostas_horario_aluno_idx on propostas_horario (aluno_id, estado);

create policy "Conta CCG vê as propostas dos seus alunos"
  on propostas_horario for select
  to authenticated
  using (
    exists (select 1 from alunos a where a.id = aluno_id and a.encarregado_id = auth.uid())
  );

create policy "Professor vê as propostas que fez"
  on propostas_horario for select
  to authenticated
  using (auth.uid() = professor_id);

create policy "Administradores veem as propostas"
  on propostas_horario for select
  to authenticated
  using (eh_admin());

alter table notificacoes drop constraint if exists notificacoes_tipo_check;
alter table notificacoes add constraint notificacoes_tipo_check
  check (
    tipo in (
      'pedido_aceite', 'lembrete_aula', 'lembrete_pagamento', 'mudanca_horario',
      'novo_material', 'matricula_cancelada', 'aula_desmarcada',
      'reposicao_pedida', 'reposicao_agendada', 'reposicao_nao_possivel',
      'reposicao_sem_opcoes', 'reposicao_expirada', 'reposicao_lembrete',
      'proposta_horario', 'proposta_aceite', 'proposta_recusada'
    )
  );

-- O professor propõe.
create or replace function public.propor_horario(
  p_matricula_id bigint,
  p_horario_id bigint,
  p_mensagem text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_m record;
  v_h record;
  v_encarregado uuid;
  v_aluno_nome text;
  v_instrumento text;
  v_id bigint;
begin
  if v_quem is null then
    raise exception 'Sem sessão.';
  end if;

  select * into v_m from matriculas where id = p_matricula_id;
  if not found or v_m.professor_id <> v_quem then
    raise exception 'Aluno não encontrado entre os teus.';
  end if;
  if v_m.estado <> 'confirmado' then
    raise exception 'Só se propõe outro horário a uma matrícula confirmada.';
  end if;

  -- O horário tem de ser do próprio professor. Sem isto, bastava passar
  -- o número da linha para propor a sala de outra pessoa.
  select * into v_h from horarios where id = p_horario_id;
  if not found or v_h.professor_id <> v_quem then
    raise exception 'Horário não encontrado.';
  end if;
  if v_h.id = v_m.horario_final_id then
    raise exception 'É o horário que o aluno já tem.';
  end if;

  -- Um horário que já tem lá alguém não se propõe. Não é reserva: é não
  -- prometer o que já está dado.
  if exists (
    select 1 from matriculas outra
    where outra.horario_final_id = p_horario_id
      and outra.estado = 'confirmado'
      and outra.id <> p_matricula_id
  ) then
    raise exception 'Esse horário já tem outro aluno.';
  end if;

  select a.encarregado_id, a.nome into v_encarregado, v_aluno_nome
  from alunos a where a.id = v_m.aluno_id;
  select i.nome into v_instrumento from instrumentos i where i.id = v_m.instrumento_id;

  -- Substitui uma proposta anterior por responder: o professor mudou de
  -- ideias, e a família só deve ver a última.
  update propostas_horario
  set estado = 'cancelada', respondido_em = now()
  where matricula_id = p_matricula_id and estado = 'pendente';

  insert into propostas_horario (
    matricula_id, aluno_id, professor_id,
    horario_atual_id, horario_novo_id, mensagem
  )
  values (
    p_matricula_id, v_m.aluno_id, v_quem,
    v_m.horario_final_id, p_horario_id,
    nullif(btrim(coalesce(p_mensagem, '')), '')
  )
  returning id into v_id;

  insert into notificacoes (user_id, aluno_id, tipo, mensagem)
  values (
    v_encarregado, v_m.aluno_id, 'proposta_horario',
    format(
      'O professor propôs outro horário para %s (%s): %s, %s–%s. Precisa da tua resposta.',
      v_aluno_nome, coalesce(v_instrumento, 'aulas'),
      v_h.dia_semana,
      to_char(v_h.hora_inicio, 'HH24:MI'), to_char(v_h.hora_fim, 'HH24:MI')
    )
  );

  return v_id;
end;
$$;

grant execute on function public.propor_horario(bigint, bigint, text) to authenticated;

-- A família aceita.
create or replace function public.aceitar_proposta_horario(p_proposta_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_p record;
  v_m record;
  v_h record;
  v_encarregado uuid;
  v_aluno_nome text;
begin
  if v_quem is null then
    raise exception 'Sem sessão.';
  end if;

  select * into v_p from propostas_horario where id = p_proposta_id;
  if not found then
    raise exception 'Proposta não encontrada.';
  end if;
  if v_p.estado <> 'pendente' then
    raise exception 'Esta proposta já foi respondida.';
  end if;

  select a.encarregado_id, a.nome into v_encarregado, v_aluno_nome
  from alunos a where a.id = v_p.aluno_id;

  if v_quem is distinct from v_encarregado then
    raise exception 'Sem permissão para responder a esta proposta.';
  end if;

  -- `for update` porque entre propor e aceitar pode ter passado uma
  -- semana, e a vaga não estava reservada. Quem chega primeiro fica com
  -- ela; o segundo tem de levar com um "já não está livre" e não com
  -- duas matrículas na mesma hora.
  select * into v_h from horarios where id = v_p.horario_novo_id for update;
  if not found then
    raise exception 'Esse horário já não existe.';
  end if;

  if exists (
    select 1 from matriculas outra
    where outra.horario_final_id = v_p.horario_novo_id
      and outra.estado = 'confirmado'
      and outra.id <> v_p.matricula_id
  ) then
    raise exception 'Esse horário entretanto ficou ocupado. Fala com o professor.';
  end if;

  select * into v_m from matriculas where id = v_p.matricula_id;

  -- O mesmo aluno não pode estar em dois sítios à mesma hora — a regra
  -- que já existe ao confirmar um pedido, aplicada também aqui.
  if exists (
    select 1
    from matriculas outra
    join horarios ho on ho.id = outra.horario_final_id
    where outra.aluno_id = v_p.aluno_id
      and outra.estado = 'confirmado'
      and outra.id <> v_p.matricula_id
      and ho.dia_semana = v_h.dia_semana
      and ho.hora_inicio < v_h.hora_fim
      and ho.hora_fim > v_h.hora_inicio
  ) then
    raise exception 'O aluno tem outra aula a essa hora.';
  end if;

  update matriculas set horario_final_id = v_p.horario_novo_id where id = v_p.matricula_id;

  -- O horário antigo volta a abrir. Ao contrário do cancelamento (0029),
  -- que o deixa bloqueado, aqui foi o professor que quis a mudança — e
  -- quem liberta uma hora de propósito quer poder preenchê-la.
  if v_m.horario_final_id is not null then
    if not exists (
      select 1 from matriculas outra
      where outra.horario_final_id = v_m.horario_final_id
        and outra.estado = 'confirmado'
        and outra.id <> v_p.matricula_id
    ) then
      update horarios set estado = 'aberto' where id = v_m.horario_final_id;
    end if;
  end if;

  update propostas_horario
  set estado = 'aceite', respondido_em = now()
  where id = p_proposta_id;

  insert into notificacoes (user_id, tipo, mensagem)
  values (
    v_p.professor_id, 'proposta_aceite',
    format(
      '%s aceitou o novo horário: %s, %s–%s.',
      v_aluno_nome, v_h.dia_semana,
      to_char(v_h.hora_inicio, 'HH24:MI'), to_char(v_h.hora_fim, 'HH24:MI')
    )
  );
end;
$$;

grant execute on function public.aceitar_proposta_horario(bigint) to authenticated;

-- A família recusa. Recusar é uma resposta legítima e não um erro: a
-- aula continua exatamente onde estava.
create or replace function public.recusar_proposta_horario(
  p_proposta_id bigint,
  p_resposta text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_p record;
  v_encarregado uuid;
  v_aluno_nome text;
begin
  select * into v_p from propostas_horario where id = p_proposta_id;
  if not found then
    raise exception 'Proposta não encontrada.';
  end if;
  if v_p.estado <> 'pendente' then
    raise exception 'Esta proposta já foi respondida.';
  end if;

  select a.encarregado_id, a.nome into v_encarregado, v_aluno_nome
  from alunos a where a.id = v_p.aluno_id;

  if v_quem is distinct from v_encarregado then
    raise exception 'Sem permissão para responder a esta proposta.';
  end if;

  update propostas_horario
  set estado = 'recusada',
      resposta = nullif(btrim(coalesce(p_resposta, '')), ''),
      respondido_em = now()
  where id = p_proposta_id;

  insert into notificacoes (user_id, tipo, mensagem)
  values (
    v_p.professor_id, 'proposta_recusada',
    format(
      '%s não pode no horário proposto.%s',
      v_aluno_nome,
      case when nullif(btrim(coalesce(p_resposta, '')), '') is null then ''
           else ' ' || btrim(p_resposta) end
    )
  );
end;
$$;

grant execute on function public.recusar_proposta_horario(bigint, text) to authenticated;

commit;
