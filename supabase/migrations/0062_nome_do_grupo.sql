-- Um nome para as aulas de grupo.
--
-- Numa aula individual, o nome do aluno É a aula: "Piano · Maria" diz
-- tudo. Numa turma de Dança ou de Bebés são dez nomes seguidos num
-- cartão de telemóvel — que não cabem, não se leem, e não são o que o
-- professor procura quando olha para a agenda. Ele procura QUAL turma.
--
-- Fica em `horarios` e não numa tabela nova porque é exatamente isso: um
-- atributo daquela hora semanal. E fica nulo por omissão — a esmagadora
-- maioria dos horários é individual e não tem nome nenhum a dar.
--
-- Sem policy nova: "Professor gere os seus próprios horários" já é ALL
-- sobre as linhas dele, e este campo é uma delas.

begin;

alter table horarios
  add column if not exists nome text;

comment on column horarios.nome is
  'Nome da turma, escrito pelo professor. Só faz sentido em aulas de grupo; nulo nas individuais, onde o nome do aluno já identifica a aula.';

-- Vazio não é um nome: sem isto, apagar o campo no formulário gravava
-- uma cadeia vazia e a agenda passava a mostrar um título em branco em
-- vez de voltar ao comportamento antigo.
alter table horarios
  drop constraint if exists horarios_nome_nao_vazio;
alter table horarios
  add constraint horarios_nome_nao_vazio
  check (nome is null or (btrim(nome) <> '' and length(nome) <= 60));

commit;
