-- Consolida a lista final de tipos de notificacao numa constraint declarativa.
--
-- As migracoes 0058 e 0059 preservavam os valores existentes atraves de SQL
-- dinamico. Isso funciona no Postgres, mas impede o gerador de tipos de ler o
-- estado final do esquema sem executar as migracoes.

begin;

alter table notificacoes drop constraint if exists notificacoes_tipo_check;
alter table notificacoes add constraint notificacoes_tipo_check
  check (
    tipo in (
      'pedido_aceite',
      'lembrete_aula',
      'lembrete_pagamento',
      'mudanca_horario',
      'novo_material',
      'matricula_cancelada',
      'aula_desmarcada',
      'reposicao_pedida',
      'reposicao_agendada',
      'reposicao_nao_possivel',
      'reposicao_sem_opcoes',
      'reposicao_expirada',
      'reposicao_lembrete',
      'proposta_horario',
      'proposta_aceite',
      'proposta_recusada',
      'reposicao_proposta',
      'reposicao_proposta_recusada',
      'disciplina_pedida',
      'disciplina_aceite',
      'disciplina_recusada',
      'mensagem_escola',
      'pedido_aula',
      'reposicao_cancelada',
      'turma_bebes_alterada'
    )
  );

commit;
