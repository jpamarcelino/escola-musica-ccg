-- Quem é professor E secretaria tinha uma caixa de avisos só.
--
-- A tabela `notificacoes` sempre foi de CONTAS, não de papéis: as duas
-- páginas de avisos (/dashboard/avisos e /admin/avisos) fazem literalmente
-- a mesma consulta — `where user_id = auth.uid()` — e mostram a mesma
-- lista. Para quem acumula os dois papéis, isso significa ver pedidos de
-- disciplina da secretaria no meio dos avisos de professor, e vice-versa.
--
-- A `notas` já dizia a quem se destinava cada tipo, mas em texto corrido
-- ("Familia, professor e secretaria") — documentação para quem lê a
-- migração, inútil para filtrar. Esta coluna diz o mesmo de forma que o
-- código possa usar.
--
-- Porquê no tipo e não em cada notificação: uma coluna em `notificacoes`
-- teria de ser preenchida por todos os sítios que escrevem avisos — meia
-- dúzia de funções SQL e algumas ações do lado da app — e o dia em que um
-- deles se esquecesse, o aviso desaparecia de todas as caixas. Aqui, um
-- tipo por classificar aparece em todas: mostrar a mais é recuperável,
-- esconder não é.

begin;

alter table tipos_aviso add column if not exists papeis text[] not null default '{}';

alter table tipos_aviso drop constraint if exists tipos_aviso_papeis_check;
alter table tipos_aviso add constraint tipos_aviso_papeis_check
  check (papeis <@ array['familia', 'professor', 'secretaria']::text[]);

update tipos_aviso set papeis = case tipo
  when 'pedido_aceite'               then array['familia']
  when 'lembrete_aula'               then array['familia']
  when 'lembrete_pagamento'          then array['familia']
  when 'mudanca_horario'             then array['familia']
  when 'novo_material'               then array['familia']
  when 'matricula_cancelada'         then array['familia', 'professor', 'secretaria']
  when 'aula_desmarcada'             then array['professor']
  when 'reposicao_pedida'            then array['professor']
  when 'reposicao_agendada'          then array['familia', 'professor']
  when 'reposicao_nao_possivel'      then array['familia']
  when 'reposicao_sem_opcoes'        then array['familia']
  when 'reposicao_expirada'          then array['familia', 'professor']
  when 'reposicao_lembrete'          then array['professor']
  when 'proposta_horario'            then array['familia']
  when 'proposta_aceite'             then array['professor']
  when 'proposta_recusada'           then array['professor']
  when 'reposicao_proposta'          then array['familia']
  when 'reposicao_proposta_recusada' then array['professor']
  when 'disciplina_pedida'           then array['secretaria']
  when 'disciplina_aceite'           then array['professor']
  when 'disciplina_recusada'         then array['professor']
  -- Uma mensagem escrita à mão pela direção vai para alunos ou para
  -- professores (migração 0042) — nunca para a caixa da secretaria, que
  -- é de quem a escreveu.
  when 'mensagem_escola'             then array['familia', 'professor']
  when 'pedido_aula'                 then array['professor']
  else papeis
end;

commit;
