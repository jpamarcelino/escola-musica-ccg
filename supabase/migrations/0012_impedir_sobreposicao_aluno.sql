-- Um aluno não pode ficar com duas aulas confirmadas que se sobrepõem no
-- tempo — mesmo que sejam com professores/disciplinas diferentes, cada um
-- só confirma a sua própria matrícula sem ver as do aluno com outros
-- professores. A app já valida isto em confirmarHorario; esta proteção
-- garante que fica assim mesmo que algo confirme uma matrícula por fora
-- dessa função.
create or replace function public.impedir_sobreposicao_aluno()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_horario record;
  v_conflito bigint;
begin
  if new.estado <> 'confirmado' or new.horario_final_id is null then
    return new;
  end if;

  -- Só valida quando estes campos estão mesmo a mudar — uma matrícula já
  -- confirmada que fique com um conflito antigo (de antes desta proteção
  -- existir) não pode ficar "presa" em qualquer outra edição futura que
  -- nada tenha a ver com o horário.
  if tg_op = 'UPDATE'
     and new.estado = old.estado
     and new.horario_final_id is not distinct from old.horario_final_id then
    return new;
  end if;

  select dia_semana, hora_inicio, hora_fim into v_horario
  from public.horarios where id = new.horario_final_id;

  select m.id into v_conflito
  from public.matriculas m
  join public.horarios h on h.id = m.horario_final_id
  where m.aluno_id = new.aluno_id
    and m.id <> new.id
    and m.estado = 'confirmado'
    and h.dia_semana = v_horario.dia_semana
    and h.hora_inicio < v_horario.hora_fim
    and h.hora_fim > v_horario.hora_inicio
  limit 1;

  if v_conflito is not null then
    raise exception 'Este aluno já tem uma aula confirmada que se sobrepõe a este horário.';
  end if;

  return new;
end;
$$;

create trigger matriculas_impedir_sobreposicao_aluno
  before insert or update on matriculas
  for each row execute function public.impedir_sobreposicao_aluno();
