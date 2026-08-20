-- Mensagens da escola: a secretaria e os professores escrevem para as
-- pessoas, em vez de a app escrever sozinha.
--
-- Tudo o que existe em `notificacoes` até aqui nasce de um facto — uma
-- aula desmarcada, uma mensalidade paga, um horário aceite. Falta o
-- contrário: o presidente da direção querer desejar boas festas aos
-- alunos, ou um professor avisar os seus de que não há aula na próxima
-- semana.
--
-- Não é um sistema novo. É a mesma tabela `notificacoes`, os mesmos
-- Avisos, a mesma push da 0041 — uma linha por pessoa, escrita por um
-- humano em vez de por um gatilho. E é de sentido único, de propósito:
-- quem recebe lê, não responde. Uma caixa de conversação era outra
-- funcionalidade, com moderação, histórico e notificações de resposta.
--
-- Duas coisas novas na base:
--   1. `notificacoes.titulo` — quem assina. Até aqui o título da push
--      vinha do tipo de aviso e era igual para todos ("Mensalidade").
--      Numa mensagem escrita à mão, o título É a identidade de quem a
--      escreve: "Presidente da Direção Daniel Lucas".
--   2. `mensagens_escola` — o registo do que foi enviado, a quem e por
--      quem. Sem isto, uma mensagem que saiu para trezentas pessoas não
--      deixava rasto nenhum do lado de quem a mandou.

begin;

-- 1. O tipo novo.
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
      'mensagem_escola'
    )
  );

-- 2. Quem assina.
--
-- Nulo em todos os avisos automáticos, que continuam a ir buscar o
-- título ao tipo. Só as mensagens escritas à mão o preenchem.
alter table notificacoes add column if not exists titulo text;

insert into tipos_aviso (tipo, titulo, destino, push, notas) values
  ('mensagem_escola', 'Mensagem da escola', '/dashboard/avisos', true,
   'Escrita pela secretaria ou por um professor. O titulo vem da linha (a assinatura).')
on conflict (tipo) do nothing;

-- A push passa a preferir o título da linha, quando existe. O `nullif`
-- protege contra uma string vazia, que daria uma push sem título.
create or replace function public.push_destinos(
  p_segredo text,
  p_notificacao_id bigint
)
returns table (
  endpoint text,
  p256dh text,
  auth text,
  titulo text,
  corpo text,
  url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  select exists (
    select 1 from push_config c where c.id is true and c.segredo = p_segredo
  ) into v_ok;

  if not v_ok then
    raise exception 'Nao autorizado.';
  end if;

  return query
  select
    s.endpoint,
    s.p256dh,
    s.auth,
    coalesce(nullif(n.titulo, ''), t.titulo),
    n.mensagem,
    coalesce(nullif(t.destino, ''), '/dashboard/avisos')
  from notificacoes n
  join tipos_aviso t on t.tipo = n.tipo
  join push_subscricoes s on s.user_id = n.user_id
  where n.id = p_notificacao_id
    and t.push is true;
end;
$$;

-- 3. O registo do que foi enviado.
create table mensagens_escola (
  id bigint generated always as identity primary key,

  autor_id uuid not null references profiles(id) on delete cascade,

  -- Como a mensagem foi assinada. Nulo = sem nome: a escola fala, e não
  -- uma pessoa. Fica guardado mesmo assim, porque "sem nome" é para quem
  -- recebe — a secretaria tem de conseguir saber quem escreveu o quê.
  assinatura text,

  corpo text not null check (char_length(corpo) between 1 and 1000),

  publico text not null check (publico in ('alunos', 'professores')),
  filtro text not null check (filtro in ('todos', 'por_professor', 'por_escola', 'selecionados')),

  -- O alvo tal como foi escolhido, para o histórico dizer "aos alunos do
  -- professor X" e não só "a 12 pessoas".
  professores uuid[],
  programa text check (programa is null or programa in ('musica', 'danca', 'bebes')),
  alunos uuid[],

  destinatarios integer not null default 0,

  criado_em timestamptz not null default now()
);

alter table mensagens_escola enable row level security;

create index mensagens_escola_autor_idx on mensagens_escola (autor_id, criado_em desc);

-- A secretaria vê tudo o que saiu em nome da escola — incluindo o que
-- foi enviado sem nome, que é exatamente o caso em que ninguém mais
-- consegue saber de onde veio. Um professor vê as suas.
create policy "Administradores veem todas as mensagens"
  on mensagens_escola for select
  to authenticated
  using (eh_admin());

create policy "Autor ve as mensagens que escreveu"
  on mensagens_escola for select
  to authenticated
  using (auth.uid() = autor_id);

-- Sem policy de insert: escrever para trezentas pessoas passa pela
-- função abaixo, que é quem verifica o alvo. Um insert direto ficava com
-- `destinatarios` a mentir e sem notificação nenhuma criada.

-- 4. Quem recebe.
--
-- Uma função só, partilhada pelas duas metades do problema: os alunos
-- (onde o destinatário é a conta do encarregado, não o aluno — um
-- dependente não tem login) e os professores.
--
-- A restrição de quem pode mandar a quem está aqui dentro, no `p_admin`:
-- um professor só alcança quem tem matrícula confirmada consigo, seja
-- qual for o filtro que escolha. Não há caminho por onde um professor
-- chegue ao aluno de outro.
create or replace function public.destinatarios_mensagem(
  p_quem uuid,
  p_admin boolean,
  p_publico text,
  p_filtro text,
  p_professores uuid[],
  p_programa text,
  p_alunos uuid[]
)
returns table (user_id uuid)
language sql
security definer
set search_path = public
stable
as $$
  -- O encarregado de cada aluno com matrícula confirmada. `distinct`
  -- porque uma família com dois filhos, ou um aluno com duas
  -- disciplinas, é uma pessoa e uma mensagem.
  select distinct a.encarregado_id
  from matriculas m
  join alunos a on a.id = m.aluno_id
  join instrumentos i on i.id = m.instrumento_id
  where p_publico = 'alunos'
    and m.estado = 'confirmado'
    and (p_admin or m.professor_id = p_quem)
    and (
      p_filtro = 'todos'
      or (p_filtro = 'por_professor' and m.professor_id = any(coalesce(p_professores, '{}'::uuid[])))
      or (p_filtro = 'por_escola' and i.programa = p_programa)
      or (p_filtro = 'selecionados' and a.id = any(coalesce(p_alunos, '{}'::uuid[])))
    )

  union

  select pe.id
  from perfis_escola pe
  where p_publico = 'professores'
    and p_admin
    and pe.tipo = 'professor'
    and (
      p_filtro = 'todos'
      or (p_filtro = 'selecionados' and pe.id = any(coalesce(p_professores, '{}'::uuid[])))
    );
$$;

-- Não é para ser chamada de fora: devolve a lista de contas de quem
-- recebe, e o `p_admin` é um argumento — quem a chamasse diretamente
-- dizia de si próprio que era administrador. Só a função de envio, que é
-- `security definer` e calcula o `p_admin` sozinha, lhe chega.
revoke execute on function public.destinatarios_mensagem(uuid, boolean, text, text, uuid[], text, uuid[]) from public, anon, authenticated;

-- 5. Enviar.
create or replace function public.enviar_mensagem_escola(
  p_corpo text,
  p_publico text,
  p_filtro text,
  p_assinatura text default null,
  p_professores uuid[] default null,
  p_programa text default null,
  p_alunos uuid[] default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_admin boolean;
  v_professor boolean;
  v_corpo text := btrim(coalesce(p_corpo, ''));
  v_assinatura text := nullif(btrim(coalesce(p_assinatura, '')), '');
  v_titulo text;
  v_id bigint;
  v_quantos integer;
begin
  if v_quem is null then
    raise exception 'Sessão terminada.';
  end if;

  v_admin := eh_admin();
  v_professor := exists (
    select 1 from perfis_escola pe where pe.id = v_quem and pe.tipo = 'professor'
  );

  if not v_admin and not v_professor then
    raise exception 'Não tens permissão para enviar mensagens.';
  end if;

  if char_length(v_corpo) = 0 then
    raise exception 'Escreve a mensagem.';
  end if;

  if char_length(v_corpo) > 1000 then
    raise exception 'A mensagem não pode passar dos 1000 caracteres.';
  end if;

  if p_publico not in ('alunos', 'professores') then
    raise exception 'Destinatários inválidos.';
  end if;

  -- Um professor fala com os seus alunos. Não fala com a sala de
  -- professores nem escolhe por escola — não é a escola dele, é a aula
  -- dele.
  if not v_admin then
    if p_publico <> 'alunos' or p_filtro not in ('todos', 'selecionados') then
      raise exception 'Só podes escrever aos teus alunos.';
    end if;

    -- E assina sempre. Uma mensagem anónima de um professor para um
    -- aluno seu parecia vir da direção da escola, e não vem.
    if v_assinatura is null then
      raise exception 'A mensagem tem de ser assinada.';
    end if;
  end if;

  if p_filtro = 'por_escola' and coalesce(p_programa, '') not in ('musica', 'danca', 'bebes') then
    raise exception 'Escolhe a escola.';
  end if;

  if p_filtro = 'por_professor' and coalesce(array_length(p_professores, 1), 0) = 0 then
    raise exception 'Escolhe pelo menos um professor.';
  end if;

  if p_filtro = 'selecionados' then
    if p_publico = 'alunos' and coalesce(array_length(p_alunos, 1), 0) = 0 then
      raise exception 'Escolhe pelo menos um aluno.';
    end if;
    if p_publico = 'professores' and coalesce(array_length(p_professores, 1), 0) = 0 then
      raise exception 'Escolhe pelo menos um professor.';
    end if;
  end if;

  -- Sem assinatura, quem recebe vê "Mensagem da escola" — que é a
  -- verdade: a escola falou, e não se disse quem.
  v_titulo := coalesce(v_assinatura, 'Mensagem da escola');

  insert into mensagens_escola
    (autor_id, assinatura, corpo, publico, filtro, professores, programa, alunos)
  values
    (v_quem, v_assinatura, v_corpo, p_publico, p_filtro, p_professores, p_programa, p_alunos)
  returning id into v_id;

  -- Uma linha por pessoa. O gatilho da 0041 trata da push, uma a uma, e
  -- engole os seus próprios erros — se a push falhar, o aviso dentro da
  -- app fica na mesma.
  --
  -- Sem `aluno_id`: a mensagem é para a conta, não é sobre um aluno em
  -- particular. Uma família com dois filhos recebe-a uma vez.
  with destinos as (
    select d.user_id
    from destinatarios_mensagem(
      v_quem, v_admin, p_publico, p_filtro, p_professores, p_programa, p_alunos
    ) d
    -- Quem escreve não precisa de se avisar a si próprio.
    where d.user_id <> v_quem
  ),
  criadas as (
    insert into notificacoes (user_id, tipo, titulo, mensagem)
    select destinos.user_id, 'mensagem_escola', v_titulo, v_corpo
    from destinos
    returning 1
  )
  select count(*)::integer into v_quantos from criadas;

  update mensagens_escola set destinatarios = v_quantos where id = v_id;

  return v_quantos;
end;
$$;

grant execute on function public.enviar_mensagem_escola(text, text, text, text, uuid[], text, uuid[]) to authenticated;

commit;
