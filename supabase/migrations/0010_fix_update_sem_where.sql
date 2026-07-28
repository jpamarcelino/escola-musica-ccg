-- Bug real: "recalcular_salas()" tinha um "update horarios set sala_id =
-- null" sem WHERE. A proteção "Require WHERE clause" da base de dados
-- bloqueia isso — e como esta função corre dentro do trigger que dispara
-- sempre que um horário é criado/editado/apagado, TODA a transação
-- falhava. Era por isto que os professores não conseguiam criar horários.
create or replace function public.recalcular_salas()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sala_danca bigint;
  p record;
  h record;
  s record;
  cand bigint;
  ocupada boolean;
begin
  select id into v_sala_danca from public.salas where piso is null and numero is null;

  update public.horarios set sala_id = null where true;

  -- Dança: toda a gente no Salão de Dança, sem verificação de conflitos.
  update public.horarios hor
  set sala_id = v_sala_danca
  from public.profiles pr
  where hor.professor_id = pr.id and pr.programa = 'danca';

  -- Professores com sala própria: recebem-na sempre, sem competir por ela.
  for p in
    select pr.id as professor_id, sa.id as sala_id
    from public.profiles pr
    join public.salas sa on sa.dono_id = pr.id
  loop
    update public.horarios set sala_id = p.sala_id where professor_id = p.professor_id;
  end loop;

  -- Pool flexível: por ordem de prioridade, cada horário tenta a sua lista
  -- de salas candidatas, pela ordem dada, e fica com a primeira livre.
  for p in
    select * from public.profiles
    where sala_candidatos is not null
    order by sala_prioridade nulls last, id
  loop
    for h in
      select * from public.horarios where professor_id = p.id order by dia_semana, hora_inicio, id
    loop
      foreach cand in array p.sala_candidatos
      loop
        select * into s from public.salas where id = cand;

        if s.dono_id is not null and s.dono_id <> p.id and h.dia_semana = any(s.dias_exclusivos) then
          continue;
        end if;

        select exists (
          select 1 from public.horarios h2
          where h2.id <> h.id
            and h2.sala_id = cand
            and h2.dia_semana = h.dia_semana
            and h2.hora_inicio < h.hora_fim
            and h2.hora_fim > h.hora_inicio
        ) into ocupada;

        if not ocupada then
          update public.horarios set sala_id = cand where id = h.id;
          exit;
        end if;
      end loop;
    end loop;
  end loop;
end;
$$;
