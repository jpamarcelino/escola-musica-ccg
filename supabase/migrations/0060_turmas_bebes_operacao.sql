-- A operação da Escola de Bebés: mudar a hora, aceitar e recusar pedidos.
--
-- A 0059 criou as turmas e o espelho em `horarios`. Faltava o essencial:
-- o espelho ligava turma a horário só pela coincidência de dia e hora, e
-- por isso mudar a hora da turma criava um horário novo e deixava o
-- antigo para trás — com as matrículas todas lá dentro. Aqui a ligação
-- passa a ser explícita (`horarios.turma_bebes_id`), o que permite mover
-- a hora no próprio horário e as matrículas irem atrás sem se lhes tocar.

begin;

alter table horarios add column if not exists turma_bebes_id bigint
  references turmas_bebes(id) on delete set null;

create unique index if not exists horarios_turma_bebes_idx
  on horarios (turma_bebes_id, professor_id) where turma_bebes_id is not null;

-- ---------------------------------------------------------------------
-- O espelho, agora ligado pela turma
-- ---------------------------------------------------------------------
create or replace function public.sincronizar_horarios_bebes()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_par record;
begin
  -- Cria o que falta e corrige a hora do que já existe. O `estado` é
  -- sempre 'bloqueado': a hora é da escola e não se pede individualmente.
  for v_par in
    select t.id as turma_id, tp.professor_id, t.dia_semana, t.hora_inicio, t.hora_fim
    from turmas_bebes t
    join turmas_bebes_professores tp on tp.turma_id = t.id
  loop
    if exists (
      select 1 from horarios h
      where h.turma_bebes_id = v_par.turma_id and h.professor_id = v_par.professor_id
    ) then
      update horarios
      set dia_semana = v_par.dia_semana,
          hora_inicio = v_par.hora_inicio,
          hora_fim = v_par.hora_fim,
          estado = 'bloqueado'
      where turma_bebes_id = v_par.turma_id and professor_id = v_par.professor_id;
    else
      insert into horarios (professor_id, dia_semana, hora_inicio, hora_fim, estado, turma_bebes_id)
      values (v_par.professor_id, v_par.dia_semana, v_par.hora_inicio, v_par.hora_fim,
              'bloqueado', v_par.turma_id)
      on conflict (professor_id, dia_semana, hora_inicio, hora_fim)
      do update set estado = 'bloqueado', turma_bebes_id = v_par.turma_id;
    end if;
  end loop;

  -- Professor tirado da turma: o horário espelhado só desaparece se não
  -- tiver ninguém inscrito. Com alunos lá dentro fica, para a secretaria
  -- decidir o que fazer — apagar levava as matrículas com ele.
  delete from horarios h
  where h.turma_bebes_id is not null
    and not exists (
      select 1 from turmas_bebes_professores tp
      where tp.turma_id = h.turma_bebes_id and tp.professor_id = h.professor_id
    )
    and not exists (
      select 1 from matriculas m
      where m.horario_final_id = h.id and m.estado = 'confirmado'
    );
end;
$$;

drop trigger if exists turmas_bebes_professores_sincroniza on turmas_bebes_professores;
create trigger turmas_bebes_professores_sincroniza
  after insert or update or delete on turmas_bebes_professores
  for each statement execute function turmas_bebes_apos_mudanca();

select sincronizar_horarios_bebes();

-- ---------------------------------------------------------------------
-- Quantos estão inscritos
-- ---------------------------------------------------------------------
create or replace function public.ocupacao_turma_bebes(p_turma_id bigint)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct m.aluno_id)::int
  from matriculas m
  join horarios h on h.id = m.horario_final_id
  where h.turma_bebes_id = p_turma_id and m.estado = 'confirmado';
$$;

-- ---------------------------------------------------------------------
-- Mudar o dia/hora de uma turma
-- ---------------------------------------------------------------------
--
-- Só a secretaria. Avisa os professores atribuídos e as famílias dos
-- alunos inscritos — as duas pontas de quem tem de estar lá.
create or replace function public.mudar_horario_turma_bebes(
  p_turma_id bigint,
  p_dia_semana text,
  p_hora_inicio time,
  p_hora_fim time
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_t record;
  v_nome text;
  v_pessoa record;
  v_antes text;
  v_depois text;
begin
  if v_quem is null or not eh_admin() then
    raise exception 'Só a secretaria pode mudar o horário de uma turma.';
  end if;

  select * into v_t from turmas_bebes where id = p_turma_id;
  if not found then
    raise exception 'Turma não encontrada.';
  end if;

  if p_hora_fim <= p_hora_inicio then
    raise exception 'A hora de fim tem de ser depois da de início.';
  end if;

  if v_t.dia_semana = p_dia_semana
     and v_t.hora_inicio = p_hora_inicio
     and v_t.hora_fim = p_hora_fim then
    return;
  end if;

  select i.nome into v_nome from instrumentos i where i.id = v_t.instrumento_id;

  v_antes := format('%s, %s–%s', v_t.dia_semana,
    to_char(v_t.hora_inicio, 'HH24:MI'), to_char(v_t.hora_fim, 'HH24:MI'));
  v_depois := format('%s, %s–%s', p_dia_semana,
    to_char(p_hora_inicio, 'HH24:MI'), to_char(p_hora_fim, 'HH24:MI'));

  update turmas_bebes
  set dia_semana = p_dia_semana,
      hora_inicio = p_hora_inicio,
      hora_fim = p_hora_fim,
      atualizado_em = now(),
      atualizado_por = v_quem
  where id = p_turma_id;

  -- O trigger da 0059 já corre a sincronização, mas correr aqui outra vez
  -- não custa nada e deixa a função a valer por si.
  perform sincronizar_horarios_bebes();

  -- Professores da turma.
  for v_pessoa in
    select tp.professor_id as id from turmas_bebes_professores tp where tp.turma_id = p_turma_id
  loop
    insert into notificacoes (user_id, tipo, mensagem)
    values (v_pessoa.id, 'turma_bebes_alterada',
      format('A turma de %s mudou de %s para %s.', v_nome, v_antes, v_depois));
  end loop;

  -- Famílias dos inscritos. `distinct` porque a turma pode ter mais do que
  -- um professor, e a família não quer dois avisos da mesma mudança.
  for v_pessoa in
    select distinct a.encarregado_id as id, m.aluno_id
    from matriculas m
    join horarios h on h.id = m.horario_final_id
    join alunos a on a.id = m.aluno_id
    where h.turma_bebes_id = p_turma_id and m.estado = 'confirmado'
      and a.encarregado_id is not null
  loop
    insert into notificacoes (user_id, aluno_id, tipo, mensagem)
    values (v_pessoa.id, v_pessoa.aluno_id, 'turma_bebes_alterada',
      format('A turma de %s mudou de %s para %s.', v_nome, v_antes, v_depois));
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Aceitar e recusar um pedido de Bebés
-- ---------------------------------------------------------------------
create or replace function public.aceitar_pedido_bebes(
  p_matricula_id bigint,
  p_professor_id uuid,
  p_valor_mensal numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_m record;
  v_turma record;
  v_horario_id bigint;
  v_encarregado uuid;
  v_aluno_nome text;
  v_nome text;
begin
  if v_quem is null or not eh_admin() then
    raise exception 'Só a secretaria aceita inscrições de Bebés.';
  end if;

  select * into v_m from matriculas where id = p_matricula_id;
  if not found or v_m.estado <> 'a_escolher' then
    raise exception 'Esse pedido já não está por responder.';
  end if;

  select t.* into v_turma from turmas_bebes t where t.instrumento_id = v_m.instrumento_id;
  if not found then
    raise exception 'Esse pedido não é de uma turma de Bebés.';
  end if;

  if not exists (
    select 1 from turmas_bebes_professores tp
    where tp.turma_id = v_turma.id and tp.professor_id = p_professor_id
  ) then
    raise exception 'Esse professor não dá esta turma.';
  end if;

  -- A capacidade é verificada aqui, e não só no ecrã: dois pedidos
  -- aceites ao mesmo tempo pela mesma pessoa em dois separadores
  -- passariam por uma verificação feita só no cliente.
  if ocupacao_turma_bebes(v_turma.id) >= v_turma.capacidade then
    raise exception 'A turma está cheia (% inscritos).', v_turma.capacidade;
  end if;

  select h.id into v_horario_id from horarios h
  where h.turma_bebes_id = v_turma.id and h.professor_id = p_professor_id;
  if v_horario_id is null then
    raise exception 'A turma ainda não tem horário para esse professor.';
  end if;

  update matriculas
  set estado = 'confirmado',
      professor_id = p_professor_id,
      horario_final_id = v_horario_id,
      valor_mensal = coalesce(p_valor_mensal, valor_mensal)
  where id = p_matricula_id;

  select a.encarregado_id, a.nome into v_encarregado, v_aluno_nome
  from alunos a where a.id = v_m.aluno_id;
  select i.nome into v_nome from instrumentos i where i.id = v_m.instrumento_id;

  if v_encarregado is not null then
    insert into notificacoes (user_id, aluno_id, tipo, mensagem)
    values (v_encarregado, v_m.aluno_id, 'pedido_aceite',
      format('%s ficou inscrito em %s: %s, %s–%s.', v_aluno_nome, v_nome,
        v_turma.dia_semana, to_char(v_turma.hora_inicio, 'HH24:MI'),
        to_char(v_turma.hora_fim, 'HH24:MI')));
  end if;
end;
$$;

create or replace function public.recusar_pedido_bebes(
  p_matricula_id bigint,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_m record;
  v_encarregado uuid;
  v_aluno_nome text;
  v_nome text;
begin
  if v_quem is null or not eh_admin() then
    raise exception 'Só a secretaria responde a inscrições de Bebés.';
  end if;

  select * into v_m from matriculas where id = p_matricula_id;
  if not found or v_m.estado <> 'a_escolher' then
    raise exception 'Esse pedido já não está por responder.';
  end if;

  select a.encarregado_id, a.nome into v_encarregado, v_aluno_nome
  from alunos a where a.id = v_m.aluno_id;
  select i.nome into v_nome from instrumentos i where i.id = v_m.instrumento_id;

  delete from matriculas where id = p_matricula_id;

  if v_encarregado is not null then
    insert into notificacoes (user_id, aluno_id, tipo, mensagem)
    values (v_encarregado, v_m.aluno_id, 'reposicao_nao_possivel',
      format('O pedido de inscrição de %s em %s não foi aceite.%s', v_aluno_nome, v_nome,
        case when p_motivo is null or btrim(p_motivo) = '' then ''
             else ' ' || btrim(p_motivo) end));
  end if;
end;
$$;

revoke execute on function public.mudar_horario_turma_bebes(bigint, text, time, time) from public, anon;
revoke execute on function public.aceitar_pedido_bebes(bigint, uuid, numeric) from public, anon;
revoke execute on function public.recusar_pedido_bebes(bigint, text) from public, anon;
revoke execute on function public.sincronizar_horarios_bebes() from public, anon;
grant execute on function public.mudar_horario_turma_bebes(bigint, text, time, time) to authenticated;
grant execute on function public.aceitar_pedido_bebes(bigint, uuid, numeric) to authenticated;
grant execute on function public.recusar_pedido_bebes(bigint, text) to authenticated;
grant execute on function public.ocupacao_turma_bebes(bigint) to authenticated;

commit;
