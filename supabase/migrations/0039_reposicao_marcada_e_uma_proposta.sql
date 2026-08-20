-- Uma reposição marcada pelo professor passa a precisar do sim da família.
--
-- Havia dois caminhos até uma reposição, e os dois acabavam numa aula
-- marcada sem mais nada:
--
--   * a família pede e escolhe horas que lhe dão jeito, e o professor
--     aceita uma delas (aceitar_reposicao). Aqui a família já disse que
--     pode — voltar a perguntar era perguntar duas vezes;
--
--   * o professor marca uma data e uma hora à mão (marcar_reposicao).
--     Aqui ninguém perguntou nada a ninguém. A aula aparecia na agenda
--     da família como facto consumado, numa hora que ela nunca viu.
--
-- É o segundo que muda. Passa a nascer como proposta, e só é aula
-- quando a família aceitar. Recusar leva mensagem — quem recusa
-- normalmente sabe dizer quando é que pode, e essa frase vale mais do
-- que o "não".

begin;

alter table reposicoes
  add column estado text not null default 'confirmada'
    check (estado in ('proposta', 'confirmada', 'recusada')),
  add column resposta text check (resposta is null or char_length(resposta) <= 500),
  add column respondido_em timestamptz;

-- As que já existem foram todas confirmadas à antiga. Ficam como estão:
-- reabrir decisões antigas era inventar dúvidas que ninguém teve.

create index reposicoes_propostas_idx on reposicoes (aluno_id) where estado = 'proposta';

alter table notificacoes drop constraint if exists notificacoes_tipo_check;
alter table notificacoes add constraint notificacoes_tipo_check
  check (
    tipo in (
      'pedido_aceite', 'lembrete_aula', 'lembrete_pagamento', 'mudanca_horario',
      'novo_material', 'matricula_cancelada', 'aula_desmarcada',
      'reposicao_pedida', 'reposicao_agendada', 'reposicao_nao_possivel',
      'reposicao_sem_opcoes', 'reposicao_expirada', 'reposicao_lembrete',
      'proposta_horario', 'proposta_aceite', 'proposta_recusada',
      'reposicao_proposta', 'reposicao_proposta_recusada'
    )
  );

-- marcar_reposicao passa a criar uma proposta. O resto é o da 0032.
create or replace function public.marcar_reposicao(
  p_matricula_id bigint,
  p_data date,
  p_hora_inicio time,
  p_hora_fim time,
  p_aula_desmarcada_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m record;
  v_encarregado uuid;
  v_aluno_nome text;
  v_instrumento text;
  v_quem uuid := auth.uid();
  v_id bigint;
  v_pedido_id bigint;
begin
  select * into v_m from matriculas where id = p_matricula_id;
  if not found or v_m.professor_id <> v_quem then
    raise exception 'Aluno nao encontrado entre os teus.';
  end if;
  if p_hora_fim <= p_hora_inicio then
    raise exception 'A hora de fim tem de ser depois da de inicio.';
  end if;

  select i.nome into v_instrumento from instrumentos i where i.id = v_m.instrumento_id;
  select a.encarregado_id, a.nome into v_encarregado, v_aluno_nome
  from alunos a where a.id = v_m.aluno_id;

  insert into reposicoes (
    aula_desmarcada_id, matricula_id, aluno_id, professor_id, instrumento_nome,
    data, hora_inicio, hora_fim, marcada_por, estado
  )
  values (
    p_aula_desmarcada_id, p_matricula_id, v_m.aluno_id, v_m.professor_id, v_instrumento,
    p_data, p_hora_inicio, p_hora_fim, v_quem, 'proposta'
  )
  returning id into v_id;

  -- A aula desmarcada fica 'pendente' e não 'agendada': ainda não há
  -- reposição nenhuma marcada, há uma pergunta por responder. Dizer
  -- 'agendada' punha o painel do professor a contá-la como resolvida.
  if p_aula_desmarcada_id is not null then
    update aulas_desmarcadas set reposicao_estado = 'pendente'
    where id = p_aula_desmarcada_id and professor_id = v_quem;

    select id into v_pedido_id from pedidos_reposicao
    where aula_desmarcada_id = p_aula_desmarcada_id and estado = 'pendente';

    if v_pedido_id is not null then
      update reposicoes set pedido_id = v_pedido_id where id = v_id;
    end if;
  end if;

  insert into notificacoes (user_id, aluno_id, tipo, mensagem)
  values (
    v_encarregado, v_m.aluno_id, 'reposicao_proposta',
    format(
      'O professor propos uma reposicao de %s para %s, %s-%s. Precisa da tua resposta.',
      coalesce(v_instrumento, 'aulas'),
      to_char(p_data, 'DD/MM'),
      to_char(p_hora_inicio, 'HH24:MI'), to_char(p_hora_fim, 'HH24:MI')
    )
  );

  return v_id;
end;
$$;

-- A família aceita: passa a ser aula.
create or replace function public.aceitar_reposicao_proposta(p_reposicao_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_r record;
  v_encarregado uuid;
  v_aluno_nome text;
begin
  select * into v_r from reposicoes where id = p_reposicao_id;
  if not found then
    raise exception 'Reposicao nao encontrada.';
  end if;
  if v_r.estado <> 'proposta' then
    raise exception 'Esta reposicao ja foi respondida.';
  end if;

  select a.encarregado_id, a.nome into v_encarregado, v_aluno_nome
  from alunos a where a.id = v_r.aluno_id;

  if v_quem is distinct from v_encarregado then
    raise exception 'Sem permissao para responder a esta proposta.';
  end if;

  update reposicoes
  set estado = 'confirmada', respondido_em = now()
  where id = p_reposicao_id;

  if v_r.aula_desmarcada_id is not null then
    update aulas_desmarcadas set reposicao_estado = 'agendada'
    where id = v_r.aula_desmarcada_id;

    update pedidos_reposicao
    set estado = 'agendada', resolvido_em = now()
    where aula_desmarcada_id = v_r.aula_desmarcada_id and estado = 'pendente';
  end if;

  insert into notificacoes (user_id, tipo, mensagem)
  values (
    v_r.professor_id, 'reposicao_agendada',
    format(
      '%s aceitou a reposicao de %s, %s-%s.',
      v_aluno_nome, to_char(v_r.data, 'DD/MM'),
      to_char(v_r.hora_inicio, 'HH24:MI'), to_char(v_r.hora_fim, 'HH24:MI')
    )
  );
end;
$$;

-- A família recusa: a aula desmarcada volta à fila do professor.
create or replace function public.recusar_reposicao_proposta(
  p_reposicao_id bigint,
  p_resposta text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_r record;
  v_encarregado uuid;
  v_aluno_nome text;
begin
  select * into v_r from reposicoes where id = p_reposicao_id;
  if not found then
    raise exception 'Reposicao nao encontrada.';
  end if;
  if v_r.estado <> 'proposta' then
    raise exception 'Esta reposicao ja foi respondida.';
  end if;

  select a.encarregado_id, a.nome into v_encarregado, v_aluno_nome
  from alunos a where a.id = v_r.aluno_id;

  if v_quem is distinct from v_encarregado then
    raise exception 'Sem permissao para responder a esta proposta.';
  end if;

  update reposicoes
  set estado = 'recusada',
      resposta = nullif(btrim(coalesce(p_resposta, '')), ''),
      respondido_em = now()
  where id = p_reposicao_id;

  -- Volta a 'por_repor': a aula continua por repor, e o professor tem de
  -- a voltar a ver na lista dele. Deixá-la 'pendente' escondia-a de toda
  -- a gente — a família já respondeu e o professor não tinha o que
  -- responder.
  if v_r.aula_desmarcada_id is not null then
    update aulas_desmarcadas set reposicao_estado = 'por_repor'
    where id = v_r.aula_desmarcada_id;
  end if;

  insert into notificacoes (user_id, tipo, mensagem)
  values (
    v_r.professor_id, 'reposicao_proposta_recusada',
    format(
      '%s nao pode na reposicao de %s, %s-%s.%s',
      v_aluno_nome, to_char(v_r.data, 'DD/MM'),
      to_char(v_r.hora_inicio, 'HH24:MI'), to_char(v_r.hora_fim, 'HH24:MI'),
      case when nullif(btrim(coalesce(p_resposta, '')), '') is null then ''
           else ' ' || btrim(p_resposta) end
    )
  );
end;
$$;

grant execute on function public.aceitar_reposicao_proposta(bigint) to authenticated;
grant execute on function public.recusar_reposicao_proposta(bigint, text) to authenticated;

commit;
