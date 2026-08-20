-- Push notifications, penduradas no sistema de avisos que já existe.
--
-- Não há sistema novo: continua a haver uma linha em `notificacoes` por
-- aviso, para qualquer papel. O que passa a existir é (1) uma tabela que
-- diz, por tipo de aviso, se ele também sai para o telemóvel e para onde
-- leva, (2) as subscrições dos dispositivos de cada conta, e (3) um
-- gatilho que avisa o servidor quando nasce um aviso.
--
-- O gatilho está na TABELA e não no código da app por uma razão de
-- facto: dos 23 sítios que criam avisos, 22 são funções Postgres
-- (confirmar_horario, cancelar_matricula, as sete das reposições, as
-- três das propostas, as das disciplinas, o cron das mensalidades...).
-- Um envio feito do lado do Next.js apanhava um.
--
-- E é `pg_net` e não um trabalho periódico porque o plano do Vercel só
-- permite um agendamento por dia: uma push que chega 24 horas depois não
-- é uma push.

begin;

create extension if not exists pg_net with schema extensions;

-- 1. O que cada tipo de aviso faz.
--
-- É esta tabela que responde à pergunta "este tipo novo deve dar push?".
-- Acrescentar um tipo é acrescentar uma linha aqui: sem ela, o aviso
-- continua a aparecer dentro da app e não sai para o telemóvel — que é o
-- lado seguro de falhar.
create table tipos_aviso (
  tipo text primary key,

  -- O título da push. A `notificacoes` só guarda `mensagem`, e uma push
  -- sem título mostra o nome da app e mais nada.
  titulo text not null,

  -- Para onde leva o toque na push. Nulo = a área de Avisos.
  destino text,

  push boolean not null default false,

  notas text
);

alter table tipos_aviso enable row level security;

-- Toda a gente com sessão pode ler: é a tabela que dá o título e o
-- destino de cada aviso, e as páginas de avisos vão querê-la. Mexer nela
-- é da administração.
create policy "Toda a gente le os tipos de aviso"
  on tipos_aviso for select
  to authenticated
  using (true);

create policy "Administradores mudam os tipos de aviso"
  on tipos_aviso for all
  to authenticated
  using (eh_admin())
  with check (eh_admin());

-- Os 21 tipos que existem hoje, todos com push: são todos coisas que
-- alguém está à espera de saber, e nenhum é frequente ao ponto de virar
-- ruído (o mais repetido, `lembrete_pagamento`, sai uma vez por mês).
--
-- Para desligar um: `update tipos_aviso set push = false where tipo =
-- '...'`. Sem tocar em código.
insert into tipos_aviso (tipo, titulo, destino, push, notas) values
  ('pedido_aceite',              'Aula confirmada',         '/dashboard/agenda',              true, 'Familia'),
  ('lembrete_aula',              'Lembrete de aula',        '/dashboard/agenda',              true, 'Familia'),
  ('lembrete_pagamento',         'Mensalidade',             '/dashboard/avisos',              true, 'Familia'),
  ('mudanca_horario',            'Mudanca de horario',      '/dashboard/agenda',              true, 'Familia'),
  ('novo_material',              'Novo material',           '/dashboard/avisos',              true, 'Familia'),
  ('matricula_cancelada',        'Matricula cancelada',     '/dashboard/avisos',              true, 'Familia, professor e secretaria'),
  ('aula_desmarcada',            'Aula desmarcada',         '/dashboard/agenda',              true, 'Professor'),
  ('reposicao_pedida',           'Pedido de reposicao',     '/dashboard/reposicoes/pedidos',  true, 'Professor'),
  ('reposicao_agendada',         'Reposicao marcada',       '/dashboard/agenda',              true, 'Familia e professor'),
  ('reposicao_nao_possivel',     'Reposicao sem data',      '/dashboard/avisos',              true, 'Familia'),
  ('reposicao_sem_opcoes',       'Reposicao sem vagas',     '/dashboard/avisos',              true, 'Familia'),
  ('reposicao_expirada',         'Pedido expirado',         '/dashboard/avisos',              true, 'Familia e professor'),
  ('reposicao_lembrete',         'Reposicao por responder', '/dashboard/reposicoes/pedidos',  true, 'Professor'),
  ('proposta_horario',           'Mudanca de horario',      '/dashboard/agenda',              true, 'Familia, precisa de resposta'),
  ('proposta_aceite',            'Horario aceite',          '/dashboard/meus-alunos',         true, 'Professor'),
  ('proposta_recusada',          'Horario recusado',        '/dashboard/meus-alunos',         true, 'Professor'),
  ('reposicao_proposta',         'Reposicao proposta',      '/dashboard/agenda',              true, 'Familia, precisa de resposta'),
  ('reposicao_proposta_recusada','Reposicao recusada',      '/dashboard/reposicoes/pedidos',  true, 'Professor'),
  ('disciplina_pedida',          'Pedido de disciplina',    '/admin/professores/disciplinas', true, 'Secretaria'),
  ('disciplina_aceite',          'Disciplina aceite',       '/dashboard/conta',               true, 'Professor'),
  ('disciplina_recusada',        'Disciplina recusada',     '/dashboard/conta',               true, 'Professor');

-- 2. Os dispositivos de cada conta.
--
-- Uma conta pode ter vários: o telemóvel, o computador da secretaria, o
-- tablet. O `endpoint` é único no mundo — é ele que identifica o
-- dispositivo do lado do browser — e é por isso a chave natural.
create table push_subscricoes (
  id bigint generated always as identity primary key,

  user_id uuid not null references profiles(id) on delete cascade,

  endpoint text not null unique,
  p256dh text not null,
  auth text not null,

  -- Para a pessoa reconhecer o aparelho na lista, e para se perceber que
  -- browser falha quando falha.
  descricao text,

  criado_em timestamptz not null default now(),
  usado_em timestamptz
);

alter table push_subscricoes enable row level security;

create index push_subscricoes_user_idx on push_subscricoes (user_id);

-- Cada conta gere os seus dispositivos e não vê os de mais ninguém. Nem
-- a administração: uma subscrição é uma chave de escrita para o telemóvel
-- de uma pessoa, não é dado de gestão.
create policy "Cada conta gere as suas subscricoes"
  on push_subscricoes for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Para onde o gatilho avisa.
--
-- Numa tabela e não escrito dentro da função porque o endereço muda
-- entre localhost, pré-visualização e produção — e porque o segredo não
-- deve ficar no corpo de uma função que qualquer pessoa com acesso ao
-- esquema consegue ler.
--
-- Sem policies nenhumas, de propósito: com RLS ligada e sem policy, nem
-- `authenticated` nem `anon` leem uma linha. Só a service role (que a
-- ignora) e as funções `security definer` daqui.
create table push_config (
  id boolean primary key default true check (id),
  url text not null,
  segredo text not null,
  atualizado_em timestamptz not null default now()
);

alter table push_config enable row level security;

-- 4. O gatilho.
--
-- Manda só o id. O servidor volta a ler a linha com a service role — o
-- corpo do aviso não anda em trânsito nem fica nos registos do pg_net.
--
-- Tudo dentro de um bloco que engole os seus próprios erros: a push é um
-- extra, e um extra não pode fazer falhar a transação que estava a criar
-- o aviso. Sem pg_net, sem configuração, ou com a rota em baixo, o aviso
-- nasce na mesma.
create or replace function public.avisar_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_push boolean;
  v_cfg record;
begin
  begin
    select t.push into v_push from tipos_aviso t where t.tipo = new.tipo;

    if coalesce(v_push, false) is not true then
      return new;
    end if;

    select * into v_cfg from push_config where id is true;

    if not found or coalesce(v_cfg.url, '') = '' then
      return new;
    end if;

    perform net.http_post(
      url := v_cfg.url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-push-segredo', v_cfg.segredo
      ),
      body := jsonb_build_object('notificacaoId', new.id)
    );
  exception when others then
    -- De propósito: o aviso dentro da app vale mais do que a push.
    null;
  end;

  return new;
end;
$$;

drop trigger if exists notificacoes_enviam_push on notificacoes;
create trigger notificacoes_enviam_push
  after insert on notificacoes
  for each row
  execute function public.avisar_push();

-- 5. O que o servidor precisa para enviar, e como devolve o que correu
-- mal.
--
-- Estas três funções existem para a chave de service role NÃO entrar na
-- app. É a regra deste projeto desde o início: o Next.js fala com a base
-- de dados como qualquer utilizador, e o que precisa de mais poder do
-- que isso mora numa função `security definer` — como o cron das
-- mensalidades já fazia.
--
-- Quem chama prova quem é com o mesmo segredo que o gatilho envia. Sem
-- ele, a função não devolve linha nenhuma.

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
    t.titulo,
    n.mensagem,
    -- O destino do tipo, e a área de Avisos quando o tipo não define
    -- nenhum. Uma push que não leva a lado nenhum obriga a pessoa a
    -- procurar o que lhe disseram.
    coalesce(nullif(t.destino, ''), '/dashboard/avisos')
  from notificacoes n
  join tipos_aviso t on t.tipo = n.tipo
  join push_subscricoes s on s.user_id = n.user_id
  where n.id = p_notificacao_id
    and t.push is true;
end;
$$;

-- Um endpoint que o serviço de push recusa (404/410) é um telemóvel que
-- desinstalou a app ou limpou os dados. Fica a ocupar espaço e a fazer
-- falhar todos os envios seguintes.
create or replace function public.push_remover_subscricao(
  p_segredo text,
  p_endpoint text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from push_config c where c.id is true and c.segredo = p_segredo
  ) then
    raise exception 'Nao autorizado.';
  end if;

  delete from push_subscricoes where endpoint = p_endpoint;
end;
$$;

create or replace function public.push_registar_uso(
  p_segredo text,
  p_endpoint text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from push_config c where c.id is true and c.segredo = p_segredo
  ) then
    raise exception 'Nao autorizado.';
  end if;

  update push_subscricoes set usado_em = now() where endpoint = p_endpoint;
end;
$$;

-- `anon` porque o pedido do gatilho chega ao servidor sem sessão de
-- utilizador nenhuma — quem se autentica é o segredo, tal como no
-- endpoint do cron.
grant execute on function public.push_destinos(text, bigint) to anon, authenticated;
grant execute on function public.push_remover_subscricao(text, text) to anon, authenticated;
grant execute on function public.push_registar_uso(text, text) to anon, authenticated;

commit;
