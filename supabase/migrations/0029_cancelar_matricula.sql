-- Cancelar uma matrícula deixa de a apagar.
--
-- Até aqui, cancelar era um DELETE — do lado da família e do lado do
-- professor. A linha desaparecia e com ela tudo o que dizia: que houve
-- uma inscrição, quando terminou, e quem a terminou.
--
-- Isso torna impossíveis três coisas que a escola precisa:
--
--   * distinguir, no diretório da secretaria, um aluno que cancelou de um
--     que nunca se inscreveu — hoje ambos aparecem "Sem matrícula";
--   * saber quando é que alguém saiu, para o relatório do ano;
--   * dizer ao professor e à secretaria que aconteceu, porque quando a
--     ação corre já não há linha nenhuma de onde tirar os nomes.
--
-- Passa a ser um estado. A linha fica, com a data e com quem cancelou, e
-- o índice único que impede duas matrículas na mesma disciplina só conta
-- as ativas — quem cancela pode voltar a inscrever-se no mesmo
-- instrumento sem tropeçar no seu próprio passado.
--
-- Um PEDIDO por responder ('a_escolher') continua a ser apagado: nunca
-- chegou a ser uma matrícula, não tem presenças nem mensalidades atrás de
-- si, e guardá-lo enchia o diretório de intenções que não se
-- concretizaram.

begin;

alter table matriculas drop constraint if exists matriculas_estado_check;
alter table matriculas add constraint matriculas_estado_check
  check (estado in ('a_escolher', 'confirmado', 'cancelado'));

alter table matriculas
  add column cancelada_em timestamptz,
  -- Quem carregou no botão: o encarregado ou o professor. Fica a null se
  -- essa conta for apagada — a data do cancelamento continua a valer
  -- mesmo quando já não se sabe de quem partiu.
  add column cancelada_por uuid references profiles(id) on delete set null;

alter table notificacoes drop constraint if exists notificacoes_tipo_check;
alter table notificacoes add constraint notificacoes_tipo_check
  check (
    tipo in (
      'pedido_aceite',
      'lembrete_aula',
      'lembrete_pagamento',
      'mudanca_horario',
      'novo_material',
      'matricula_cancelada'
    )
  );

-- As duas políticas que permitiam apagar uma matrícula CONFIRMADA
-- diretamente. Deixam de existir: a partir de agora esse caminho passa
-- obrigatoriamente pela função abaixo, que é quem garante que o histórico
-- fica, que o horário é libertado e que os avisos saem. Uma regra desta
-- importância não pode depender de quem chama se lembrar dela.
drop policy if exists "Aluno cancela a sua matrícula confirmada" on matriculas;

drop policy if exists "Professor cancela matrículas dos seus alunos" on matriculas;
create policy "Professor recusa pedidos por responder"
  on matriculas for delete
  to authenticated
  using (auth.uid() = professor_id and estado = 'a_escolher');

-- O cancelamento, de uma vez só.
--
-- Em função `security definer`, e não repartido por políticas de RLS,
-- porque são quatro efeitos que têm de acontecer juntos ou nenhum: marcar
-- a matrícula, bloquear o horário, avisar o outro lado e avisar a
-- secretaria. Metade disto (escrever avisos para administradores que não
-- são nossos alunos, mexer no horário de um professor) nem sequer é
-- possível com as permissões de quem cancela.
--
-- Devolve o que fez, para quem chama poder dizer a coisa certa:
--   'cancelada' — era uma matrícula confirmada, ficou em 'cancelado'
--   'apagada'   — era um pedido por responder, foi apagado
create function public.cancelar_matricula(p_matricula_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matricula record;
  v_encarregado_id uuid;
  v_aluno_nome text;
  v_instrumento text;
  v_professor_nome text;
  v_quem_cancela uuid := auth.uid();
  v_pelo_professor boolean;
  -- Quem já recebeu aviso por ser o outro lado da matrícula. Guardado
  -- para não levar um segundo aviso por também ser administrador.
  v_ja_avisado uuid;
  v_mensagem text;
  v_admin record;
begin
  if v_quem_cancela is null then
    raise exception 'Sem sessão.';
  end if;

  select m.* into v_matricula from matriculas m where m.id = p_matricula_id;
  if not found then
    raise exception 'Matrícula não encontrada.';
  end if;

  select a.encarregado_id, a.nome into v_encarregado_id, v_aluno_nome
  from alunos a where a.id = v_matricula.aluno_id;

  -- Só quem gere o aluno ou o professor da matrícula. A verificação vive
  -- aqui dentro porque `security definer` desliga a RLS: sem isto,
  -- qualquer sessão podia cancelar a matrícula de qualquer pessoa
  -- passando o número da linha.
  v_pelo_professor := v_quem_cancela = v_matricula.professor_id;
  if not v_pelo_professor and v_quem_cancela is distinct from v_encarregado_id then
    raise exception 'Sem permissão para cancelar esta matrícula.';
  end if;

  if v_matricula.estado = 'a_escolher' then
    delete from matriculas where id = p_matricula_id;
    return 'apagada';
  end if;

  if v_matricula.estado <> 'confirmado' then
    -- Já estava cancelada. Não é erro — dois cliques seguidos no mesmo
    -- botão não devem rebentar nem mandar um segundo aviso.
    return 'cancelada';
  end if;

  select i.nome into v_instrumento from instrumentos i where i.id = v_matricula.instrumento_id;
  select p.nome into v_professor_nome from profiles p where p.id = v_matricula.professor_id;

  update matriculas
  set estado = 'cancelado',
      cancelada_em = now(),
      cancelada_por = v_quem_cancela
  where id = p_matricula_id;

  -- O horário volta a estar livre, mas fica bloqueado: livre porque já
  -- não tem lá ninguém, bloqueado porque a vaga é do professor e não da
  -- app — quem decide se aceita outro aluno naquela hora é ele, à mão.
  --
  -- Só se mais ninguém lá estiver. Em dança vários alunos partilham o
  -- mesmo horário, e a saída de um não pode fechar a aula aos outros.
  if v_matricula.horario_final_id is not null then
    if not exists (
      select 1 from matriculas outra
      where outra.horario_final_id = v_matricula.horario_final_id
        and outra.estado = 'confirmado'
        and outra.id <> p_matricula_id
    ) then
      update horarios set estado = 'bloqueado' where id = v_matricula.horario_final_id;
    end if;
  end if;

  v_mensagem := format(
    'A matrícula de %s em %s foi cancelada.',
    v_aluno_nome,
    coalesce(v_instrumento, 'aulas')
  );

  -- O outro lado da matrícula fica a saber. Quem cancelou não recebe
  -- aviso do que acabou de fazer.
  if v_pelo_professor then
    v_ja_avisado := v_encarregado_id;
    insert into notificacoes (user_id, aluno_id, tipo, mensagem)
    values (v_encarregado_id, v_matricula.aluno_id, 'matricula_cancelada', v_mensagem);
  else
    v_ja_avisado := v_matricula.professor_id;
    insert into notificacoes (user_id, tipo, mensagem)
    values (v_matricula.professor_id, 'matricula_cancelada', v_mensagem);
  end if;

  -- E a secretaria, sempre. É ela que trata das mensalidades e do
  -- diretório, e um aluno que sai sem ninguém dar por isso continua a
  -- aparecer nas listas do mês seguinte.
  --
  -- Uma linha por administrador, porque `notificacoes` é por pessoa. Com
  -- meia dúzia de administradores é barato; se um dia forem dezenas,
  -- troca-se por uma caixa de entrada partilhada.
  for v_admin in
    select pe.id from perfis_escola pe where pe.admin is true
  loop
    if v_admin.id <> v_quem_cancela and v_admin.id <> v_ja_avisado then
      insert into notificacoes (user_id, tipo, mensagem)
      values (
        v_admin.id,
        'matricula_cancelada',
        -- Para a secretaria interessa mais quem terminou do que o nome
        -- primeiro: é o que decide se há alguém a contactar.
        format(
          'Matrícula cancelada %s: %s, em %s com %s.',
          case when v_pelo_professor then 'pelo professor' else 'pela família' end,
          v_aluno_nome,
          coalesce(v_instrumento, 'aulas'),
          coalesce(v_professor_nome, 'professor por atribuir')
        )
      );
    end if;
  end loop;

  return 'cancelada';
end;
$$;

grant execute on function public.cancelar_matricula(bigint) to authenticated;

-- O diretório da secretaria vai passar a separar "com matrícula" de "sem
-- matrícula", e a consulta que o alimenta filtra por estado.
create index matriculas_estado_idx on matriculas (estado);

commit;
