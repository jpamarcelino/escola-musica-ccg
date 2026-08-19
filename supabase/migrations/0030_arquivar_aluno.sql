-- Eliminar um perfil de aluno, sem eliminar nada.
--
-- Uma conta CCG precisa de poder tirar um aluno da sua lista: um filho
-- que saiu da escola, um perfil criado por engano, alguém que passou a
-- gerir a própria conta. Até aqui não havia como — e não podia haver um
-- DELETE, porque atrás de um perfil de aluno estão presenças,
-- mensalidades e o Programa de Recomendação, tudo com o mesmo id lá
-- dentro. Apagar a linha deixava o histórico da escola com buracos.
--
-- Por isso o aluno é ARQUIVADO, e não apagado. Sai da conta da família —
-- deixa de aparecer, deixa de contar, deixa de poder ter aulas — e fica
-- no diretório da secretaria como antigo aluno, com tudo o que fez.
--
-- Quem garante o "sai da conta" é a própria política de RLS, e não os
-- filtros das páginas: com dezenas de consultas do lado da família,
-- bastava esquecer uma para o aluno arquivado reaparecer numa lista. A
-- política fecha-o à entrada e nenhuma consulta o pode ver por engano.

begin;

alter table alunos
  add column arquivado_em timestamptz,
  add column arquivado_por uuid references profiles(id) on delete set null;

-- Só as linhas ativas contam para o filtro parcial das consultas mais
-- comuns da família ("os meus alunos").
create index alunos_ativos_idx
  on alunos (encarregado_id)
  where arquivado_em is null;

drop policy if exists "Encarregado vê e gere os seus alunos" on alunos;
create policy "Encarregado vê e gere os seus alunos"
  on alunos for all
  to authenticated
  using (auth.uid() = encarregado_id and arquivado_em is null)
  with check (auth.uid() = encarregado_id and arquivado_em is null);

-- A secretaria continua a ver tudo (política de 0021), e o professor
-- continua a ver os alunos das suas matrículas (0019) — é o que mantém
-- os nomes legíveis no histórico de presenças e de mensalidades depois
-- de alguém sair.

-- Arquivar arrasta o cancelamento das aulas atrás de si.
--
-- É a única forma honesta de o fazer: um aluno arquivado com uma
-- matrícula ainda confirmada continuaria a ocupar o horário do professor
-- e a gerar mensalidades, e ninguém teria como lá chegar para a
-- cancelar. Reutiliza `cancelar_matricula` (0029) em vez de repetir a
-- lógica — assim o professor e a secretaria recebem exatamente os mesmos
-- avisos que receberiam de um cancelamento normal, e o horário é
-- libertado da mesma maneira.
create function public.arquivar_aluno(p_aluno_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aluno record;
  v_quem uuid := auth.uid();
  v_matricula record;
  v_admin record;
begin
  if v_quem is null then
    raise exception 'Sem sessão.';
  end if;

  select a.* into v_aluno from alunos a where a.id = p_aluno_id;
  if not found then
    raise exception 'Aluno não encontrado.';
  end if;

  -- A verificação vive aqui porque `security definer` desliga a RLS.
  if v_aluno.encarregado_id is distinct from v_quem then
    raise exception 'Sem permissão para arquivar este aluno.';
  end if;

  if v_aluno.arquivado_em is not null then
    -- Já estava arquivado. Dois cliques seguidos não devem rebentar nem
    -- mandar um segundo aviso à secretaria.
    return;
  end if;

  for v_matricula in
    select m.id from matriculas m
    where m.aluno_id = p_aluno_id and m.estado in ('a_escolher', 'confirmado')
  loop
    perform public.cancelar_matricula(v_matricula.id);
  end loop;

  update alunos
  set arquivado_em = now(),
      arquivado_por = v_quem
  where id = p_aluno_id;

  -- A secretaria fica a saber que passou a haver mais um antigo aluno.
  -- Os avisos de cancelamento já saíram acima, um por disciplina; este
  -- diz a coisa que aqueles não dizem — que a pessoa saiu da escola.
  for v_admin in
    select pe.id from perfis_escola pe where pe.admin is true
  loop
    if v_admin.id <> v_quem then
      insert into notificacoes (user_id, tipo, mensagem)
      values (
        v_admin.id,
        'matricula_cancelada',
        format('%s passou a antigo aluno — o perfil saiu da conta que o geria.', v_aluno.nome)
      );
    end if;
  end loop;
end;
$$;

grant execute on function public.arquivar_aluno(uuid) to authenticated;

commit;
