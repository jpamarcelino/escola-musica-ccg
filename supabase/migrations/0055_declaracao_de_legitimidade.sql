-- A declaração de legitimidade, registada em vez de apenas mostrada.
--
-- Até aqui o pop-up de criação de aluno (modal-conta-pedido.tsx) mostrava
-- três caixas — legitimidade, maioridade e Termos — que a ação nunca lia.
-- Não eram `required` no markup, ninguém as verificava no servidor e nada
-- ficava guardado: dava para criar o perfil com as três por marcar. Duas
-- delas eram além disso repetição — quem chega a este passo já está
-- autenticado, e aceitou os Termos e declarou ser maior de idade no
-- registo, com a aceitação registada em `aceitacoes` (migração 0053).
--
-- Fica só a que é própria deste passo: criar um perfil para OUTRA pessoa.
-- E fica registada, pelo mesmo argumento do comentário da 0052 sobre o
-- booleano no perfil — uma caixa marcada que não deixa rasto não prova
-- nada. O que interessa é o par (perfil, momento).
--
-- Não se guarda quem declarou: é sempre `encarregado_id`, já na linha.

begin;

alter table alunos
  add column declaracao_legitimidade_em timestamptz;

comment on column alunos.declaracao_legitimidade_em is
  'Momento em que o encarregado declarou ter legitimidade para gerir este perfil (TEXTOS_LEGAIS.declaracaoPerfilAluno). Nulo nos perfis do próprio titular, onde a declaração não se aplica, e nas linhas anteriores a esta migração.';

-- `not valid`: vale para as linhas novas, não para as antigas. As linhas
-- criadas antes desta migração nasceram sem a declaração ser pedida a
-- sério, e não se inventa uma data para elas — ficam a null, e o `not
-- valid` diz exatamente isso em vez de o esconder.
--
-- A app é o único caminho para esta tabela desde a 0025 (o trigger que a
-- sincronizava com as contas foi lá removido), por isso a restrição não
-- apanha ninguém pelas costas.
alter table alunos
  add constraint alunos_dependente_tem_declaracao
  check (propria_conta_id is not null or declaracao_legitimidade_em is not null)
  not valid;

commit;
