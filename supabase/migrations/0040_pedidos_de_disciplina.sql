-- O professor pede para ensinar; a secretaria decide.
--
-- Até aqui, um professor entrava na Conta e marcava as caixas das
-- disciplinas que quisesse — a app só verificava que pertenciam à escola
-- dele. Quem ensina guitarra podia acrescentar canto num clique, e a
-- secretaria só dava por isso quando aparecesse um aluno de canto na
-- lista dele.
--
-- Passa a haver um pedido. O professor escolhe, a secretaria aceita ou
-- recusa, e só a aceitação escreve em `professor_instrumentos`.
--
-- Tirar uma disciplina também deixa de ser dele: pode ter alunos
-- inscritos nela, e uma matrícula não pode ficar órfã da disciplina por
-- alguém ter desmarcado uma caixa. Fica com a secretaria.

begin;

create table pedidos_instrumento (
  id bigint generated always as identity primary key,

  professor_id uuid not null references profiles(id) on delete cascade,
  instrumento_id bigint not null references instrumentos(id) on delete cascade,

  mensagem text check (mensagem is null or char_length(mensagem) <= 500),
  resposta text check (resposta is null or char_length(resposta) <= 500),

  estado text not null default 'pendente'
    check (estado in ('pendente', 'aceite', 'recusado')),

  criado_em timestamptz not null default now(),
  respondido_em timestamptz,
  respondido_por uuid references profiles(id) on delete set null
);

alter table pedidos_instrumento enable row level security;

-- Um pedido pendente de cada vez por disciplina. Sem isto, carregar duas
-- vezes no botão punha a mesma pergunta duas vezes na mesa da
-- secretaria.
create unique index pedidos_instrumento_um_pendente
  on pedidos_instrumento (professor_id, instrumento_id)
  where estado = 'pendente';

create index pedidos_instrumento_pendentes_idx
  on pedidos_instrumento (estado, criado_em);

create policy "Professor ve os seus pedidos"
  on pedidos_instrumento for select
  to authenticated
  using (auth.uid() = professor_id);

create policy "Professor faz os seus pedidos"
  on pedidos_instrumento for insert
  to authenticated
  with check (auth.uid() = professor_id and estado = 'pendente');

create policy "Administradores veem os pedidos de disciplina"
  on pedidos_instrumento for select
  to authenticated
  using (eh_admin());

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
      'disciplina_pedida', 'disciplina_aceite', 'disciplina_recusada'
    )
  );

-- O pedido, com as verificações que uma policy não sabe fazer: a
-- disciplina tem de ser da escola do professor, e não pode já ser dele.
create or replace function public.pedir_instrumento(
  p_instrumento_id bigint,
  p_mensagem text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_programa text;
  v_nome text;
  v_professor_nome text;
  v_id bigint;
  v_admin record;
begin
  if v_quem is null then
    raise exception 'Sem sessao.';
  end if;

  select pe.programa into v_programa
  from perfis_escola pe
  where pe.id = v_quem and pe.tipo = 'professor';

  if v_programa is null then
    raise exception 'So professores podem pedir disciplinas.';
  end if;

  select i.nome into v_nome
  from instrumentos i
  where i.id = p_instrumento_id and i.programa = v_programa;

  if v_nome is null then
    raise exception 'Essa disciplina nao e da tua escola.';
  end if;

  if exists (
    select 1 from professor_instrumentos pi
    where pi.professor_id = v_quem and pi.instrumento_id = p_instrumento_id
  ) then
    raise exception 'Ja ensinas essa disciplina.';
  end if;

  insert into pedidos_instrumento (professor_id, instrumento_id, mensagem)
  values (v_quem, p_instrumento_id, nullif(btrim(coalesce(p_mensagem, '')), ''))
  returning id into v_id;

  select p.nome into v_professor_nome from profiles p where p.id = v_quem;

  -- Uma linha por administrador, como no cancelamento de matrícula
  -- (0029): `notificacoes` é por pessoa, e a secretaria são poucas.
  for v_admin in select pe.id from perfis_escola pe where pe.admin is true
  loop
    insert into notificacoes (user_id, tipo, mensagem)
    values (
      v_admin.id, 'disciplina_pedida',
      format('%s pediu para ensinar %s.', coalesce(v_professor_nome, 'Um professor'), v_nome)
    );
  end loop;

  return v_id;
end;
$$;

grant execute on function public.pedir_instrumento(bigint, text) to authenticated;

-- A resposta da secretaria. Aceitar é o único caminho que escreve em
-- `professor_instrumentos` — a tabela deixou de ser escrita pelo
-- professor.
create or replace function public.responder_pedido_instrumento(
  p_pedido_id bigint,
  p_aceitar boolean,
  p_resposta text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_p record;
  v_nome text;
begin
  if not eh_admin() then
    raise exception 'So a secretaria responde a pedidos de disciplina.';
  end if;

  select * into v_p from pedidos_instrumento where id = p_pedido_id;
  if not found then
    raise exception 'Pedido nao encontrado.';
  end if;
  if v_p.estado <> 'pendente' then
    raise exception 'Este pedido ja foi respondido.';
  end if;

  select i.nome into v_nome from instrumentos i where i.id = v_p.instrumento_id;

  update pedidos_instrumento
  set estado = case when p_aceitar then 'aceite' else 'recusado' end,
      resposta = nullif(btrim(coalesce(p_resposta, '')), ''),
      respondido_em = now(),
      respondido_por = v_quem
  where id = p_pedido_id;

  if p_aceitar then
    insert into professor_instrumentos (professor_id, instrumento_id)
    values (v_p.professor_id, v_p.instrumento_id)
    on conflict do nothing;
  end if;

  insert into notificacoes (user_id, tipo, mensagem)
  values (
    v_p.professor_id,
    case when p_aceitar then 'disciplina_aceite' else 'disciplina_recusada' end,
    case
      when p_aceitar then format('Passaste a poder dar aulas de %s.', v_nome)
      else format(
        'O pedido para ensinar %s nao foi aceite.%s', v_nome,
        case when nullif(btrim(coalesce(p_resposta, '')), '') is null then ''
             else ' ' || btrim(p_resposta) end
      )
    end
  );
end;
$$;

grant execute on function public.responder_pedido_instrumento(bigint, boolean, text) to authenticated;

-- A tabela das disciplinas de cada professor deixa de aceitar escrita
-- dele. Fica com a secretaria (que já lá podia mexer) e com a função
-- acima, que corre em `security definer`.
drop policy if exists "Professor gere os seus próprios instrumentos" on professor_instrumentos;

-- Administradores continuam a poder mexer — é a eles que a decisão
-- passa, incluindo tirar uma disciplina a quem deixou de a dar.
create policy "Administradores gerem as disciplinas dos professores"
  on professor_instrumentos for all
  to authenticated
  using (eh_admin())
  with check (eh_admin());

commit;
