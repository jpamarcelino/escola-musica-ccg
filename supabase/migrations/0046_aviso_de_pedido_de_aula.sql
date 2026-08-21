-- O professor não sabia que tinha um pedido à espera.
--
-- Até aqui, um pedido de aula não gerava aviso nenhum: a matrícula ficava
-- em 'a_escolher' e só era vista por quem se lembrasse de abrir a página
-- de Pedidos. Isso passou a doer mais desde que "Pedidos" saiu da barra
-- de baixo do professor — o separador servia de lembrete permanente e
-- deixou de estar lá.
--
-- Este aviso é o que ocupa esse lugar, e melhor: chega ao telemóvel por
-- push, em vez de esperar que alguém repare num separador.

begin;

alter table notificacoes drop constraint if exists notificacoes_tipo_check;
alter table notificacoes add constraint notificacoes_tipo_check
  check (
    tipo in (
      'pedido_aceite', 'lembrete_aula', 'lembrete_pagamento', 'mudanca_horario',
      'novo_material', 'matricula_cancelada', 'aula_desmarcada',
      'reposicao_pedida', 'reposicao_agendada', 'reposicao_nao_possivel',
      'reposicao_sem_opcoes', 'reposicao_expirada', 'reposicao_lembrete',
      'proposta_horario', 'proposta_aceite', 'proposta_recusada',
      'reposicao_proposta', 'reposicao_proposta_recusada',
      'disciplina_pedida', 'disciplina_aceite', 'disciplina_recusada',
      'mensagem_escola', 'pedido_aula'
    )
  );

insert into tipos_aviso (tipo, titulo, destino, push, notas) values
  ('pedido_aula', 'Novo pedido de aula', '/dashboard/pedidos', true, 'Professor')
on conflict (tipo) do update
  set titulo = excluded.titulo,
      destino = excluded.destino,
      push = excluded.push,
      notas = excluded.notas;

-- Quem faz o pedido é a família, e a família não pode escrever na caixa de
-- avisos de um professor — a policy de insert em notificacoes só deixa o
-- sentido contrário (professor → encarregado, ver 0025). Em vez de abrir
-- essa policy, que passaria a permitir que qualquer conta escrevesse a
-- qualquer professor, o aviso sai por aqui: a função confirma que quem
-- chama é mesmo o encarregado do aluno da matrícula, e mais nada.
create or replace function public.avisar_professor_de_pedido(p_matricula_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_professor_id uuid;
  v_aluno_nome text;
  v_disciplina text;
begin
  select m.professor_id, a.nome, i.nome
    into v_professor_id, v_aluno_nome, v_disciplina
  from public.matriculas m
  join public.alunos a on a.id = m.aluno_id
  join public.instrumentos i on i.id = m.instrumento_id
  where m.id = p_matricula_id
    and m.estado = 'a_escolher'
    and a.encarregado_id = auth.uid();

  -- Sem correspondência: ou a matrícula não existe, ou já não está por
  -- responder, ou não é de quem chamou. Sai em silêncio — não é erro do
  -- ponto de vista de quem pediu a aula, e o pedido em si já está feito.
  if v_professor_id is null then
    return;
  end if;

  insert into public.notificacoes (user_id, tipo, mensagem)
  values (
    v_professor_id,
    'pedido_aula',
    v_aluno_nome || ' pediu uma aula de ' || v_disciplina || '. Está à espera de resposta.'
  );
end;
$$;

revoke execute on function public.avisar_professor_de_pedido(bigint) from public, anon;
grant execute on function public.avisar_professor_de_pedido(bigint) to authenticated;

commit;
