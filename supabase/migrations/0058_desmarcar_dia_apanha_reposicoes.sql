-- "Desmarcar o dia" passa a apanhar também as reposições.
--
-- O problema não era só faltar o botão num dia que só tenha reposições.
-- Era pior do que isso: num dia com aulas normais E uma reposição, o
-- botão aparecia, dizia "2 aulas", desmarcava as duas — e a reposição
-- ficava lá. O professor lia "dia desmarcado" e alguém aparecia na
-- escola à hora da reposição.
--
-- A causa é a "desmarcar_dia" percorrer só a tabela "matriculas". Uma
-- reposição é uma linha avulsa em "reposicoes", sem matrícula por trás
-- naquela data — nunca foi apanhada.
--
-- O estado novo é 'cancelada' e não 'recusada': recusada é a família a
-- dizer que não pode, e misturar as duas apagava a diferença entre "não
-- deu jeito à família" e "o professor faltou". Todas as consultas da app
-- filtram por 'confirmada' ou 'proposta', por isso uma reposição
-- cancelada desaparece sozinha das listas — e a aula desmarcada que lhe
-- deu origem volta a poder receber uma reposição nova, que é o que tem
-- de acontecer quando é o professor a desmarcar.

begin;

-- Os dois "check" abaixo são estendidos a partir do que está na base de
-- dados, e não reescritos de uma lista à mão. Escrevi a lista à mão à
-- primeira tentativa, com os valores das migrações que conhecia, e a
-- migração rebentou: entretanto tinham sido acrescentados quatro tipos
-- de aviso que eu não tinha. Uma lista copiada envelhece em silêncio;
-- estender a que existe não.
do $migracao$
declare
  v_def text;
begin
  select pg_get_constraintdef(oid) into v_def
  from pg_constraint
  where conrelid = 'reposicoes'::regclass and conname = 'reposicoes_estado_check';

  if v_def is null then
    raise exception 'reposicoes_estado_check não existe.';
  end if;

  if position('cancelada' in v_def) = 0 then
    alter table reposicoes drop constraint reposicoes_estado_check;
    execute 'alter table reposicoes add constraint reposicoes_estado_check '
      || replace(v_def, ']))', ', ''cancelada''::text]))');
  end if;
end
$migracao$;

do $migracao$
declare
  v_def text;
begin
  select pg_get_constraintdef(oid) into v_def
  from pg_constraint
  where conrelid = 'notificacoes'::regclass and conname = 'notificacoes_tipo_check';

  if v_def is null then
    raise exception 'notificacoes_tipo_check não existe.';
  end if;

  if position('reposicao_cancelada' in v_def) = 0 then
    alter table notificacoes drop constraint notificacoes_tipo_check;
    execute 'alter table notificacoes add constraint notificacoes_tipo_check '
      || replace(v_def, ']))', ', ''reposicao_cancelada''::text]))');
  end if;
end
$migracao$;

insert into tipos_aviso (tipo, titulo, destino, push, notas, papeis) values
  ('reposicao_cancelada', 'Reposicao desmarcada', '/dashboard/agenda', true,
   'O professor desmarcou o dia e a reposicao caiu com ele. A aula desmarcada de origem volta a poder receber outra.',
   array['familia'])
on conflict (tipo) do nothing;

create or replace function public.desmarcar_dia(p_data date, p_motivo text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_m record;
  v_r record;
  v_encarregado uuid;
  v_aluno_nome text;
  v_total integer := 0;
begin
  if v_quem is null then
    raise exception 'Sem sessão.';
  end if;

  -- 1. As aulas da grelha semanal, como antes.
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

  -- 2. As reposições desse dia. Também as propostas ainda por responder:
  --    deixar uma proposta viva num dia em que o professor não vem era
  --    pedir à família que aceitasse uma aula que não vai acontecer.
  for v_r in
    select r.id, r.aluno_id, r.instrumento_nome, r.hora_inicio
    from reposicoes r
    where r.professor_id = v_quem
      and r.data = p_data
      and r.estado in ('proposta', 'confirmada')
      and (p_data + r.hora_inicio) > agora_na_escola()
  loop
    update reposicoes
    set estado = 'cancelada', respondido_em = now()
    where id = v_r.id;

    select a.encarregado_id, a.nome into v_encarregado, v_aluno_nome
    from alunos a where a.id = v_r.aluno_id;

    if v_encarregado is not null then
      insert into notificacoes (user_id, aluno_id, tipo, mensagem)
      values (
        v_encarregado, v_r.aluno_id, 'reposicao_cancelada',
        format(
          'A reposição%s de %s de %s às %s foi desmarcada pelo professor.%s',
          case when v_r.instrumento_nome is null then '' else ' de ' || v_r.instrumento_nome end,
          v_aluno_nome,
          to_char(p_data, 'DD/MM'),
          to_char(v_r.hora_inicio, 'HH24:MI'),
          case when p_motivo is null or btrim(p_motivo) = '' then ''
               else ' Motivo: ' || btrim(p_motivo) end
        )
      );
    end if;

    v_total := v_total + 1;
  end loop;

  return v_total;
end;
$$;

revoke execute on function public.desmarcar_dia(date, text) from public, anon;
grant execute on function public.desmarcar_dia(date, text) to authenticated;

commit;
