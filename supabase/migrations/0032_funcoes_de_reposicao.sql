-- As operações de cancelamento e reposição, todas em funções.
--
-- Nenhuma delas é uma escrita simples: desmarcar uma aula cria a exceção,
-- escreve a presença, avisa o outro lado e decide o estado da reposição —
-- quatro efeitos que só fazem sentido juntos. Aceitar um pedido ocupa uma
-- vaga, cria a reposição, fecha o pedido, avisa o aluno e pode deixar
-- outros pedidos sem opções. Repartir isto por políticas de RLS deixava
-- cada ecrã responsável por se lembrar da metade que falta.
--
-- Todas verificam a permissão por dentro, porque `security definer`
-- desliga a RLS: sem isso, qualquer sessão desmarcava a aula de qualquer
-- pessoa passando o número da linha.

begin;

-- O dia da semana em português, no mesmo vocabulário de `horarios`.
create function public.dia_semana_pt(p_data date)
returns text
language sql
immutable
as $$
  select (array['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'])[
    extract(isodow from p_data)::int
  ];
$$;

-- A hora, na escola. Todas as comparações de "já passou?" passam por aqui
-- para não dependerem do fuso do servidor.
create function public.agora_na_escola()
returns timestamp
language sql
stable
as $$
  select (now() at time zone 'Europe/Lisbon');
$$;

-- Só música tem reposições.
create function public.matricula_eh_musica(p_matricula_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select i.programa = 'musica'
     from matriculas m join instrumentos i on i.id = m.instrumento_id
     where m.id = p_matricula_id),
    false
  );
$$;

-- ---------------------------------------------------------------------
-- Desmarcar uma aula
-- ---------------------------------------------------------------------
--
-- Serve os dois lados. Quem chama decide o que acontece: o aluno tem de
-- avisar com 24 horas e a aula fica com falta com aviso; o professor pode
-- desmarcar até à hora de início, a falta é dele, e a aula fica por repor.
create function public.desmarcar_aula(
  p_matricula_id bigint,
  p_data date,
  p_motivo text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m record;
  v_h record;
  v_encarregado uuid;
  v_aluno_nome text;
  v_professor_nome text;
  v_instrumento text;
  v_quem uuid := auth.uid();
  v_pelo_professor boolean;
  v_inicio timestamp;
  v_id bigint;
begin
  if v_quem is null then
    raise exception 'Sem sessão.';
  end if;

  select * into v_m from matriculas where id = p_matricula_id;
  if not found or v_m.estado <> 'confirmado' then
    raise exception 'Aula não encontrada.';
  end if;

  if not matricula_eh_musica(p_matricula_id) then
    raise exception 'As reposições existem só nas aulas de música.';
  end if;

  select a.encarregado_id, a.nome into v_encarregado, v_aluno_nome
  from alunos a where a.id = v_m.aluno_id;

  v_pelo_professor := v_quem = v_m.professor_id;
  if not v_pelo_professor and v_quem is distinct from v_encarregado then
    raise exception 'Sem permissão para desmarcar esta aula.';
  end if;

  select * into v_h from horarios where id = v_m.horario_final_id;
  if not found then
    raise exception 'Esta matrícula ainda não tem horário.';
  end if;

  if dia_semana_pt(p_data) <> v_h.dia_semana then
    raise exception 'Nessa data não há aula desta disciplina.';
  end if;

  v_inicio := (p_data + v_h.hora_inicio);

  -- O professor pode desmarcar até a aula começar. O aluno tem de avisar
  -- com um dia: depois disso a vaga já não se aproveita, e quem decide se
  -- abre uma exceção é o professor, falando com a família.
  if v_pelo_professor then
    if v_inicio <= agora_na_escola() then
      raise exception 'Essa aula já começou.';
    end if;
  else
    if v_inicio <= agora_na_escola() + interval '24 hours' then
      raise exception 'As aulas só podem ser desmarcadas até 24 horas antes.';
    end if;
  end if;

  select i.nome into v_instrumento from instrumentos i where i.id = v_m.instrumento_id;
  select p.nome into v_professor_nome from profiles p where p.id = v_m.professor_id;

  insert into aulas_desmarcadas (
    matricula_id, aluno_id, professor_id, instrumento_nome,
    horario_id, data, hora_inicio, hora_fim,
    origem, desmarcada_por, motivo, reposicao_estado
  )
  values (
    p_matricula_id, v_m.aluno_id, v_m.professor_id, v_instrumento,
    v_h.id, p_data, v_h.hora_inicio, v_h.hora_fim,
    case when v_pelo_professor then 'professor' else 'aluno' end,
    v_quem, nullif(btrim(coalesce(p_motivo, '')), ''),
    case when v_pelo_professor then 'por_repor' else 'sem_pedido' end
  )
  on conflict (matricula_id, data) do nothing
  returning id into v_id;

  if v_id is null then
    -- Já estava desmarcada. Devolve a que existe em vez de rebentar: dois
    -- toques no botão não são um erro.
    select id into v_id from aulas_desmarcadas
    where matricula_id = p_matricula_id and data = p_data;
    return v_id;
  end if;

  -- A aula fica no livro de presenças a dizer porque é que não houve aula.
  insert into presencas (matricula_id, data, estado, marcado_por, aluno_id, professor_id, instrumento_nome)
  values (
    p_matricula_id, p_data,
    case when v_pelo_professor then 'falta_professor' else 'falta_aviso' end,
    v_quem, v_m.aluno_id, v_m.professor_id, v_instrumento
  )
  on conflict do nothing;

  if v_pelo_professor then
    insert into notificacoes (user_id, aluno_id, tipo, mensagem)
    values (
      v_encarregado, v_m.aluno_id, 'aula_desmarcada',
      format(
        'A aula de %s de %s foi desmarcada pelo professor. Em breve será marcada uma reposição.',
        coalesce(v_instrumento, 'música'),
        to_char(p_data, 'DD/MM')
      )
    );
  else
    insert into notificacoes (user_id, tipo, mensagem)
    values (
      v_m.professor_id, 'aula_desmarcada',
      format(
        '%s desmarcou a aula de %s de %s.',
        v_aluno_nome, coalesce(v_instrumento, 'música'), to_char(p_data, 'DD/MM')
      )
    );
  end if;

  return v_id;
end;
$$;

grant execute on function public.desmarcar_aula(bigint, date, text) to authenticated;

-- ---------------------------------------------------------------------
-- Desmarcar um dia inteiro
-- ---------------------------------------------------------------------
--
-- Percorre as matrículas de música do professor cujo horário cai nesse
-- dia da semana e desmarca cada uma pelo caminho normal — assim cada
-- aluno recebe o seu aviso e cada aula fica por repor, sem lógica
-- duplicada. Devolve quantas foram.
create function public.desmarcar_dia(p_data date, p_motivo text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_m record;
  v_total integer := 0;
begin
  if v_quem is null then
    raise exception 'Sem sessão.';
  end if;

  for v_m in
    select m.id
    from matriculas m
    join horarios h on h.id = m.horario_final_id
    join instrumentos i on i.id = m.instrumento_id
    where m.professor_id = v_quem
      and m.estado = 'confirmado'
      and i.programa = 'musica'
      and h.dia_semana = dia_semana_pt(p_data)
      and (p_data + h.hora_inicio) > agora_na_escola()
      and not exists (
        select 1 from aulas_desmarcadas ad
        where ad.matricula_id = m.id and ad.data = p_data
      )
  loop
    perform desmarcar_aula(v_m.id, p_data, p_motivo);
    v_total := v_total + 1;
  end loop;

  return v_total;
end;
$$;

grant execute on function public.desmarcar_dia(date, text) to authenticated;

-- ---------------------------------------------------------------------
-- Pedir reposição
-- ---------------------------------------------------------------------
create function public.pedir_reposicao(
  p_aula_desmarcada_id bigint,
  p_horarios bigint[],
  p_mensagem text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ad record;
  v_encarregado uuid;
  v_aluno_nome text;
  v_quem uuid := auth.uid();
  v_pedido_id bigint;
  v_validos integer;
begin
  if v_quem is null then
    raise exception 'Sem sessão.';
  end if;

  select * into v_ad from aulas_desmarcadas where id = p_aula_desmarcada_id;
  if not found then
    raise exception 'Aula não encontrada.';
  end if;

  select a.encarregado_id, a.nome into v_encarregado, v_aluno_nome
  from alunos a where a.id = v_ad.aluno_id;

  if v_quem is distinct from v_encarregado then
    raise exception 'Sem permissão para pedir esta reposição.';
  end if;

  if v_ad.reposicao_estado <> 'sem_pedido' then
    raise exception 'Esta aula já tem um pedido de reposição.';
  end if;

  -- Sem vagas escolhidas não se cria pedido nenhum. O ecrã já avisa que o
  -- professor não tem horários; um pedido vazio só encheria a lista dele
  -- com trabalho que não pode fazer.
  select count(*) into v_validos
  from horarios_reposicao hr
  where hr.id = any(p_horarios)
    and hr.professor_id = v_ad.professor_id
    and hr.estado = 'disponivel'
    and hr.data >= current_date;

  if v_validos = 0 then
    raise exception 'Escolhe pelo menos um horário disponível.';
  end if;

  insert into pedidos_reposicao (
    aula_desmarcada_id, aluno_id, professor_id, mensagem, expira_em
  )
  values (
    p_aula_desmarcada_id, v_ad.aluno_id, v_ad.professor_id,
    nullif(btrim(coalesce(p_mensagem, '')), ''),
    (agora_na_escola()::date + 30)
  )
  returning id into v_pedido_id;

  insert into pedidos_reposicao_horarios (pedido_id, horario_reposicao_id)
  select v_pedido_id, hr.id
  from horarios_reposicao hr
  where hr.id = any(p_horarios)
    and hr.professor_id = v_ad.professor_id
    and hr.estado = 'disponivel'
    and hr.data >= current_date;

  update aulas_desmarcadas set reposicao_estado = 'pendente' where id = p_aula_desmarcada_id;

  insert into notificacoes (user_id, tipo, mensagem)
  values (
    v_ad.professor_id, 'reposicao_pedida',
    format(
      '%s pediu reposição da aula de %s de %s.',
      v_aluno_nome, coalesce(v_ad.instrumento_nome, 'música'), to_char(v_ad.data, 'DD/MM')
    )
  );

  return v_pedido_id;
end;
$$;

grant execute on function public.pedir_reposicao(bigint, bigint[], text) to authenticated;

-- ---------------------------------------------------------------------
-- Aceitar um pedido: ocupa a vaga e marca a reposição
-- ---------------------------------------------------------------------
create function public.aceitar_reposicao(
  p_pedido_id bigint,
  p_horario_reposicao_id bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p record;
  v_ad record;
  v_hr record;
  v_encarregado uuid;
  v_quem uuid := auth.uid();
  v_reposicao_id bigint;
  v_outro record;
begin
  if v_quem is null then
    raise exception 'Sem sessão.';
  end if;

  select * into v_p from pedidos_reposicao where id = p_pedido_id;
  if not found or v_p.professor_id <> v_quem then
    raise exception 'Pedido não encontrado.';
  end if;
  if v_p.estado <> 'pendente' then
    raise exception 'Este pedido já foi respondido.';
  end if;

  -- "for update" é o que torna isto transacional: dois professores (ou o
  -- mesmo em dois separadores) a aceitar a mesma vaga ao mesmo tempo, e
  -- só o primeiro passa daqui.
  select * into v_hr from horarios_reposicao
  where id = p_horario_reposicao_id and professor_id = v_quem
  for update;

  if not found then
    raise exception 'Horário de reposição não encontrado.';
  end if;
  if v_hr.estado <> 'disponivel' then
    raise exception 'Esse horário já está ocupado.';
  end if;

  select * into v_ad from aulas_desmarcadas where id = v_p.aula_desmarcada_id;
  select a.encarregado_id into v_encarregado from alunos a where a.id = v_p.aluno_id;

  update horarios_reposicao set estado = 'ocupado' where id = p_horario_reposicao_id;

  insert into reposicoes (
    aula_desmarcada_id, pedido_id, matricula_id, horario_reposicao_id,
    aluno_id, professor_id, instrumento_nome,
    data, hora_inicio, hora_fim, marcada_por
  )
  values (
    v_ad.id, p_pedido_id, v_ad.matricula_id, p_horario_reposicao_id,
    v_p.aluno_id, v_p.professor_id, v_ad.instrumento_nome,
    v_hr.data, v_hr.hora_inicio, v_hr.hora_fim, v_quem
  )
  returning id into v_reposicao_id;

  update pedidos_reposicao
  set estado = 'agendada', resolvido_em = now()
  where id = p_pedido_id;

  update aulas_desmarcadas set reposicao_estado = 'agendada' where id = v_ad.id;

  insert into notificacoes (user_id, aluno_id, tipo, mensagem)
  values (
    v_encarregado, v_p.aluno_id, 'reposicao_agendada',
    format(
      'Reposição marcada para %s, %s–%s.',
      to_char(v_hr.data, 'DD/MM'),
      to_char(v_hr.hora_inicio, 'HH24:MI'),
      to_char(v_hr.hora_fim, 'HH24:MI')
    )
  );

  -- Esta vaga estava escolhida noutros pedidos, e deixou de existir para
  -- eles. Quem ficou sem opções nenhumas tem de saber já — senão fica à
  -- espera 30 dias de uma resposta a um pedido que já não pode ser aceite.
  for v_outro in
    select p.id, p.aluno_id
    from pedidos_reposicao p
    join pedidos_reposicao_horarios ph on ph.pedido_id = p.id
    where ph.horario_reposicao_id = p_horario_reposicao_id
      and p.id <> p_pedido_id
      and p.estado = 'pendente'
  loop
    if not exists (
      select 1
      from pedidos_reposicao_horarios ph2
      join horarios_reposicao hr2 on hr2.id = ph2.horario_reposicao_id
      where ph2.pedido_id = v_outro.id and hr2.estado = 'disponivel'
    ) then
      insert into notificacoes (user_id, aluno_id, tipo, mensagem)
      select a.encarregado_id, v_outro.aluno_id, 'reposicao_sem_opcoes',
             'Os horários que escolheste para a reposição já foram ocupados. Fala com o professor para combinar outra data.'
      from alunos a where a.id = v_outro.aluno_id;
    end if;
  end loop;

  return v_reposicao_id;
end;
$$;

grant execute on function public.aceitar_reposicao(bigint, bigint) to authenticated;

-- ---------------------------------------------------------------------
-- "Não é possível"
-- ---------------------------------------------------------------------
create function public.recusar_reposicao(p_pedido_id bigint, p_resposta text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p record;
  v_encarregado uuid;
  v_quem uuid := auth.uid();
begin
  select * into v_p from pedidos_reposicao where id = p_pedido_id;
  if not found or v_p.professor_id <> v_quem then
    raise exception 'Pedido não encontrado.';
  end if;
  if v_p.estado <> 'pendente' then
    raise exception 'Este pedido já foi respondido.';
  end if;

  update pedidos_reposicao
  set estado = 'nao_possivel',
      resposta = nullif(btrim(coalesce(p_resposta, '')), ''),
      resolvido_em = now()
  where id = p_pedido_id;

  update aulas_desmarcadas set reposicao_estado = 'nao_possivel'
  where id = v_p.aula_desmarcada_id;

  select a.encarregado_id into v_encarregado from alunos a where a.id = v_p.aluno_id;

  insert into notificacoes (user_id, aluno_id, tipo, mensagem)
  values (
    v_encarregado, v_p.aluno_id, 'reposicao_nao_possivel',
    coalesce(
      nullif(btrim(coalesce(p_resposta, '')), ''),
      'O professor não conseguiu marcar a reposição desta aula.'
    )
  );
end;
$$;

grant execute on function public.recusar_reposicao(bigint, text) to authenticated;

-- ---------------------------------------------------------------------
-- Marcar uma reposição à mão
-- ---------------------------------------------------------------------
--
-- Sem pedido, sem vaga criada de antemão, com o pedido expirado ou com a
-- aula desmarcada pelo próprio professor — todos os caminhos passam por
-- aqui. Se houver pedido ou cancelamento por resolver, fecha-os, para a
-- mesma aula não ficar a pedir reposição duas vezes.
create function public.marcar_reposicao(
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
  v_instrumento text;
  v_quem uuid := auth.uid();
  v_id bigint;
  v_pedido_id bigint;
begin
  select * into v_m from matriculas where id = p_matricula_id;
  if not found or v_m.professor_id <> v_quem then
    raise exception 'Aluno não encontrado entre os teus.';
  end if;
  if p_hora_fim <= p_hora_inicio then
    raise exception 'A hora de fim tem de ser depois da de início.';
  end if;

  select i.nome into v_instrumento from instrumentos i where i.id = v_m.instrumento_id;
  select a.encarregado_id into v_encarregado from alunos a where a.id = v_m.aluno_id;

  insert into reposicoes (
    aula_desmarcada_id, matricula_id, aluno_id, professor_id, instrumento_nome,
    data, hora_inicio, hora_fim, marcada_por
  )
  values (
    p_aula_desmarcada_id, p_matricula_id, v_m.aluno_id, v_m.professor_id, v_instrumento,
    p_data, p_hora_inicio, p_hora_fim, v_quem
  )
  returning id into v_id;

  if p_aula_desmarcada_id is not null then
    update aulas_desmarcadas set reposicao_estado = 'agendada'
    where id = p_aula_desmarcada_id and professor_id = v_quem;

    select id into v_pedido_id from pedidos_reposicao
    where aula_desmarcada_id = p_aula_desmarcada_id and estado = 'pendente';

    if v_pedido_id is not null then
      update pedidos_reposicao
      set estado = 'agendada', resolvido_em = now()
      where id = v_pedido_id;
      update reposicoes set pedido_id = v_pedido_id where id = v_id;
    end if;
  end if;

  insert into notificacoes (user_id, aluno_id, tipo, mensagem)
  values (
    v_encarregado, v_m.aluno_id, 'reposicao_agendada',
    format(
      'Reposição marcada para %s, %s–%s.',
      to_char(p_data, 'DD/MM'),
      to_char(p_hora_inicio, 'HH24:MI'),
      to_char(p_hora_fim, 'HH24:MI')
    )
  );

  return v_id;
end;
$$;

grant execute on function public.marcar_reposicao(bigint, date, time, time, bigint) to authenticated;

-- ---------------------------------------------------------------------
-- O que o cron faz todos os dias
-- ---------------------------------------------------------------------
--
-- Lembretes ao professor aos 7, 21 e 28 dias, e expiração aos 30. O
-- `ultimo_lembrete` existe para o cron não repetir o mesmo lembrete todos
-- os dias a partir do sétimo.
create function public.tratar_pedidos_reposicao()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p record;
  v_dias integer;
  v_marco integer;
  v_encarregado uuid;
begin
  for v_p in
    select p.*, ad.instrumento_nome, ad.data as data_aula, a.nome as aluno_nome
    from pedidos_reposicao p
    join aulas_desmarcadas ad on ad.id = p.aula_desmarcada_id
    join alunos a on a.id = p.aluno_id
    where p.estado = 'pendente'
  loop
    v_dias := (agora_na_escola()::date - v_p.criado_em::date);

    if v_dias >= 30 then
      update pedidos_reposicao
      set estado = 'expirada', resolvido_em = now()
      where id = v_p.id;

      update aulas_desmarcadas set reposicao_estado = 'expirada'
      where id = v_p.aula_desmarcada_id;

      select a.encarregado_id into v_encarregado from alunos a where a.id = v_p.aluno_id;

      insert into notificacoes (user_id, aluno_id, tipo, mensagem)
      values (
        v_encarregado, v_p.aluno_id, 'reposicao_expirada',
        format(
          'O pedido de reposição da aula de %s ficou sem resposta durante 30 dias. Fala com o professor.',
          to_char(v_p.data_aula, 'DD/MM')
        )
      );

      insert into notificacoes (user_id, tipo, mensagem)
      values (
        v_p.professor_id, 'reposicao_expirada',
        format('O pedido de reposição de %s expirou.', v_p.aluno_nome)
      );
      continue;
    end if;

    v_marco := case
      when v_dias >= 28 then 28
      when v_dias >= 21 then 21
      when v_dias >= 7 then 7
      else 0
    end;

    if v_marco > v_p.ultimo_lembrete then
      insert into notificacoes (user_id, tipo, mensagem)
      values (
        v_p.professor_id, 'reposicao_lembrete',
        format(
          'O pedido de reposição de %s está à espera há %s dias. Faltam %s para expirar.',
          v_p.aluno_nome, v_dias, 30 - v_dias
        )
      );
      update pedidos_reposicao set ultimo_lembrete = v_marco where id = v_p.id;
    end if;
  end loop;
end;
$$;

commit;
