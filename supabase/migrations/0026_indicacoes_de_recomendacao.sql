-- Indicações de recomendação feitas por quem pede a aula.
--
-- O Programa de Recomendação (0024) só existia pela mão da secretaria:
-- alguém contava presencialmente que tinha sido recomendado, e um
-- administrador registava. Quem pede a aula pela app não tinha por onde
-- o dizer, e a recomendação perdia-se no caminho.
--
-- Isto NÃO é uma recomendação. É uma afirmação por confirmar, escrita à
-- mão por quem chega: "foi a Maria que me falou deste professor". O nome
-- pode estar mal escrito, pode ser de alguém que não é aluno, pode ser
-- inventado. Por isso vive numa tabela à parte, e não em `recomendacoes`
-- com um estado a mais — misturar as duas faria com que uma consulta
-- distraída ao Programa contasse benefícios que ninguém verificou.
--
-- O caminho é: o aluno indica → a secretaria confere quem é o
-- recomendador de verdade → regista a recomendação (Art. 11.º) → esta
-- linha fica ligada a ela e sai da lista de trabalho.

begin;

create table indicacoes_recomendacao (
  id bigint generated always as identity primary key,

  -- O pedido de aula que a trouxe. Se o pedido for cancelado, a
  -- indicação deixa de fazer sentido e vai com ele.
  matricula_id bigint not null references matriculas(id) on delete cascade,

  -- Quem chega. `alunos(id)` sem chave estrangeira viva, pela mesma razão
  -- de recomendacoes.novo_aluno_id (0024): é um identificador histórico.
  -- O nome fica copiado para o registo se manter legível mesmo depois de
  -- o aluno mudar de nome ou sair.
  novo_aluno_id uuid not null,
  novo_aluno_nome text not null,

  -- O professor pedido. Só professores aderentes ao Programa é que
  -- chegam a mostrar a pergunta (Art. 5.º), mas guarda-se aqui para a
  -- secretaria não ter de a ir buscar à matrícula.
  professor_id uuid not null,

  -- O que a pessoa escreveu, tal como escreveu. Texto livre de propósito:
  -- quem chega não conhece a lista de alunos da escola, e obrigá-la a
  -- escolher de um menu revelaria quem lá anda — o oposto do Art. 25.º.
  recomendador_nome_indicado text not null,
  -- A modalidade que a pessoa associa a quem a recomendou ("a Maria anda
  -- no piano"). Ajuda a secretaria a desfazer nomes repetidos.
  modalidade_indicada text,

  -- "por_confirmar" = à espera da secretaria; "confirmada" = virou uma
  -- recomendação a sério, e `recomendacao_id` diz qual; "recusada" = não
  -- se encontrou o recomendador, ou não cumpria as regras do Programa.
  estado text not null default 'por_confirmar'
    check (estado in ('por_confirmar', 'confirmada', 'recusada')),
  recomendacao_id bigint references recomendacoes(id) on delete set null,
  motivo_recusa text,

  criado_em timestamptz not null default now(),
  tratada_em timestamptz,
  tratada_por uuid references profiles(id) on delete set null,

  -- Uma indicação por pedido de aula. Sem isto, um duplo clique no botão
  -- de enviar deixava duas linhas iguais na lista da secretaria.
  constraint indicacoes_uma_por_matricula unique (matricula_id)
);

alter table indicacoes_recomendacao enable row level security;

-- Quem gere o aluno pode criar a indicação, e só para um aluno seu. A
-- verificação passa pela matrícula para garantir que a linha pertence
-- mesmo ao pedido que acabou de ser feito.
create policy "Conta CCG indica quem a recomendou"
  on indicacoes_recomendacao for insert
  to authenticated
  with check (
    exists (
      select 1
      from matriculas m
      join alunos a on a.id = m.aluno_id
      where m.id = matricula_id
        and a.id = novo_aluno_id
        and a.encarregado_id = auth.uid()
    )
  );

-- E pode ver o que escreveu — é a sua própria declaração.
create policy "Conta CCG vê as suas indicações"
  on indicacoes_recomendacao for select
  to authenticated
  using (
    exists (
      select 1 from alunos a
      where a.id = novo_aluno_id and a.encarregado_id = auth.uid()
    )
  );

-- A secretaria trata delas. Os professores continuam de fora, como em
-- `recomendacoes`: saber quem recomendou quem é gestão interna (Art. 25.º),
-- e um professor que o soubesse conheceria a origem do seu próprio
-- benefício suportado.
create policy "Administradores gerem indicações"
  on indicacoes_recomendacao for all
  to authenticated
  using (eh_admin())
  with check (eh_admin());

-- A lista de trabalho da secretaria é sempre "as que faltam tratar", por
-- ordem de chegada. Índice parcial porque as tratadas não voltam lá.
create index indicacoes_por_confirmar_idx
  on indicacoes_recomendacao (criado_em)
  where estado = 'por_confirmar';

create index indicacoes_professor_idx on indicacoes_recomendacao (professor_id);

-- O wizard público (/pedir-aula) precisa de saber se o professor escolhido
-- adere ao Programa, para decidir se mostra a pergunta — e nessa altura
-- ainda não há sessão nenhuma. `perfis_escola` só é legível a quem entrou,
-- por isso a resposta passa pela mesma função `security definer` que já
-- serve o passo de escolher professor.
--
-- Expor a adesão a quem não tem conta não abre nada: a própria pergunta
-- no ecrã já diz que aquele professor participa. O que continua fechado é
-- quem recomendou quem (Art. 25.º), que vive noutras tabelas.
--
-- Drop antes de create porque acrescentar uma coluna muda o tipo de
-- retorno, e o Postgres não deixa `create or replace` fazer isso.
drop function if exists public.professores_publicos(bigint);

create function public.professores_publicos(instrumento_id_param bigint)
returns table (
  professor_id uuid,
  nome text,
  foto_url text,
  especialidade text,
  adere_recomendacao boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.nome, p.foto_url, pi.especialidade, pe.adere_recomendacao
  from professor_instrumentos pi
  join profiles p on p.id = pi.professor_id
  join perfis_escola pe on pe.id = pi.professor_id
  where pi.instrumento_id = instrumento_id_param
    and pe.tipo = 'professor';
$$;

grant execute on function public.professores_publicos(bigint) to anon, authenticated;

commit;
