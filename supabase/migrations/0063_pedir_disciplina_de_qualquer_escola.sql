-- Um professor pode pedir qualquer disciplina, não só as da sua escola.
--
-- Até aqui `pedir_instrumento` exigia que a disciplina fosse do mesmo
-- programa do professor, e a lista no ecrã estava filtrada da mesma
-- maneira. Duas portas fechadas para a mesma coisa: quem dá Piano não
-- conseguia pedir Ballet, nem sequer via o nome na lista.
--
-- A premissa estava errada. `perfis_escola.programa` diz de que escola
-- veio o professor, não o que ele é capaz de ensinar — e o CCG é uma
-- casa só, onde a mesma pessoa dá Guitarra à quarta e Dança Moderna ao
-- sábado. Quem decide continua a ser a secretaria: isto é um PEDIDO, e
-- aceitar já era um ato dela.
--
-- Bebés fica de fora. Ali não se ensina uma disciplina, dá-se uma turma
-- da escola, e o professor é atribuído em /admin/bebes — pedir não é o
-- caminho, e deixar pedir só criava um pedido que a secretaria não
-- saberia o que fazer com ele.

begin;

create or replace function public.pedir_instrumento(
  p_instrumento_id bigint,
  p_mensagem text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_programa text;
  v_nome text;
  v_professor_nome text;
  v_id bigint;
  v_admin record;
begin
  if v_quem is null then
    raise exception 'Sem sessao.';
  end if;

  -- Continua a ler-se o programa, mas já não para comparar: serve só
  -- para confirmar que quem chama é mesmo professor.
  select pe.programa into v_programa
  from perfis_escola pe
  where pe.id = v_quem and pe.tipo = 'professor';

  if v_programa is null then
    raise exception 'So professores podem pedir disciplinas.';
  end if;

  select i.nome into v_nome
  from instrumentos i
  where i.id = p_instrumento_id and i.programa <> 'bebes';

  if v_nome is null then
    raise exception 'Essa disciplina nao existe ou nao se pede por aqui.';
  end if;

  if exists (
    select 1 from professor_instrumentos pi
    where pi.professor_id = v_quem and pi.instrumento_id = p_instrumento_id
  ) then
    raise exception 'Ja ensinas essa disciplina.';
  end if;

  insert into pedidos_instrumento (professor_id, instrumento_id, mensagem)
  values (v_quem, p_instrumento_id, nullif(btrim(coalesce(p_mensagem, '')), ''))
  returning id into v_id;

  select p.nome into v_professor_nome from profiles p where p.id = v_quem;

  -- Uma linha por administrador, como no cancelamento de matrícula
  -- (0029): `notificacoes` é por pessoa, e a secretaria são poucas.
  for v_admin in select pe.id from perfis_escola pe where pe.admin is true
  loop
    insert into notificacoes (user_id, tipo, mensagem)
    values (
      v_admin.id, 'disciplina_pedida',
      format('%s pediu para ensinar %s.', coalesce(v_professor_nome, 'Um professor'), v_nome)
    );
  end loop;

  return v_id;
end;
$$;

commit;
