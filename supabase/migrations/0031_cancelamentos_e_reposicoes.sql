-- Cancelar aulas e repô-las.
--
-- O PROBLEMA DE PARTIDA, que decide tudo o que vem a seguir: nesta app
-- uma aula não é uma linha. O que existe é `horarios` — uma vaga semanal
-- ("Segunda, 17:10–18:00" de um professor) — e `matriculas.horario_final_id`,
-- que diz qual delas o aluno ocupa. "A próxima aula" é uma conta feita em
-- código a partir do dia da semana, de cada vez que a página abre. Não há
-- nenhuma linha que represente a aula de 24 de setembro às 17:10.
--
-- Desmarcar uma aula não pode, por isso, apagar nada. Tem de INVENTAR a
-- ocorrência, e é isso que `aulas_desmarcadas` faz: uma exceção à grelha
-- semanal, com data. As agendas passam a subtrair estas exceções à grelha
-- e a somar-lhes as reposições, que são aulas avulsas fora da grelha.
--
-- Aplica-se só a MÚSICA. Dança e Música para Bebés não têm reposições, e
-- as funções recusam-se a trabalhar sobre elas.

begin;

-- ---------------------------------------------------------------------
-- Presenças: falta a aula porque foi desmarcada
-- ---------------------------------------------------------------------
--
-- Uma aula desmarcada não desaparece do livro de presenças — fica lá a
-- dizer porque é que não houve aula. Quem desmarca decide o estado: o
-- aluno que avisa fica com falta com aviso; se foi o professor a
-- desmarcar, a falta é dele e não do aluno, e tem estado próprio para as
-- contas de assiduidade não a somarem às do aluno.
alter table presencas drop constraint if exists presencas_estado_check;
alter table presencas add constraint presencas_estado_check
  check (estado in ('presente', 'falta_aviso', 'falta_sem_aviso', 'falta_professor'));

-- ---------------------------------------------------------------------
-- 1. A aula que deixou de existir
-- ---------------------------------------------------------------------
create table aulas_desmarcadas (
  id bigint generated always as identity primary key,

  matricula_id bigint not null references matriculas(id) on delete cascade,
  -- Copiados da matrícula, como em `mensalidades` e `presencas`: o registo
  -- tem de continuar legível depois de a matrícula ou as contas
  -- desaparecerem.
  aluno_id uuid not null,
  professor_id uuid not null,
  instrumento_nome text,

  -- A vaga semanal de onde esta aula foi tirada. Fica a null se o horário
  -- for apagado — a data e as horas abaixo é que mandam.
  horario_id bigint references horarios(id) on delete set null,
  data date not null,
  hora_inicio time not null,
  hora_fim time not null,

  origem text not null check (origem in ('aluno', 'professor')),
  desmarcada_por uuid references profiles(id) on delete set null,
  motivo text check (motivo is null or char_length(motivo) <= 500),

  -- Onde está a reposição desta aula:
  --   sem_pedido    — o aluno desmarcou e não quis pedir
  --   por_repor     — o professor desmarcou; fica a ele marcar (Art. do
  --                   enunciado: "cancelada pelo professor — reposição
  --                   pendente")
  --   pendente      — há um pedido do aluno à espera de resposta
  --   agendada      — está marcada
  --   nao_possivel  — o professor respondeu que não consegue
  --   expirada      — passaram 30 dias sem resposta
  reposicao_estado text not null default 'sem_pedido' check (
    reposicao_estado in ('sem_pedido', 'por_repor', 'pendente', 'agendada', 'nao_possivel', 'expirada')
  ),

  criado_em timestamptz not null default now(),

  -- Uma aula por matrícula e por dia. É isto que impede desmarcar duas
  -- vezes a mesma aula, e o que dá sentido a "cada aula só pode originar
  -- um pedido".
  unique (matricula_id, data)
);

alter table aulas_desmarcadas enable row level security;

create policy "Conta CCG vê as aulas desmarcadas dos seus alunos"
  on aulas_desmarcadas for select
  to authenticated
  using (
    exists (select 1 from alunos a where a.id = aluno_id and a.encarregado_id = auth.uid())
  );

create policy "Professor vê as aulas desmarcadas das suas matrículas"
  on aulas_desmarcadas for select
  to authenticated
  using (auth.uid() = professor_id);

create policy "Administradores veem todas as aulas desmarcadas"
  on aulas_desmarcadas for select
  to authenticated
  using (eh_admin());

-- Escrever é sempre pelas funções abaixo: elas é que garantem o prazo, os
-- avisos, a presença e o estado da reposição, tudo junto.

create index aulas_desmarcadas_professor_idx on aulas_desmarcadas (professor_id, data);
create index aulas_desmarcadas_aluno_idx on aulas_desmarcadas (aluno_id, data);
create index aulas_desmarcadas_por_repor_idx
  on aulas_desmarcadas (professor_id)
  where reposicao_estado = 'por_repor';

-- ---------------------------------------------------------------------
-- 2. Horários de reposição: vagas pontuais, fora da grelha semanal
-- ---------------------------------------------------------------------
create table horarios_reposicao (
  id bigint generated always as identity primary key,
  professor_id uuid not null references profiles(id) on delete cascade,
  data date not null,
  hora_inicio time not null,
  hora_fim time not null,
  -- Nesta fase, uma vaga leva um aluno. "ocupado" é escrito pela função
  -- que aceita um pedido, nunca à mão.
  estado text not null default 'disponivel' check (estado in ('disponivel', 'ocupado')),
  criado_em timestamptz not null default now(),

  constraint horarios_reposicao_horas check (hora_fim > hora_inicio),
  unique (professor_id, data, hora_inicio)
);

alter table horarios_reposicao enable row level security;

create policy "Professor gere os seus horários de reposição"
  on horarios_reposicao for all
  to authenticated
  using (auth.uid() = professor_id)
  with check (auth.uid() = professor_id);

-- O aluno precisa de os ver para escolher — mas só os do SEU professor.
-- Sem esta restrição, a lista de vagas de toda a escola ficava legível a
-- qualquer conta com sessão.
create policy "Conta CCG vê as vagas do professor dos seus alunos"
  on horarios_reposicao for select
  to authenticated
  using (
    exists (
      select 1 from matriculas m
      join alunos a on a.id = m.aluno_id
      where m.professor_id = horarios_reposicao.professor_id
        and a.encarregado_id = auth.uid()
        and m.estado = 'confirmado'
    )
  );

create policy "Administradores veem os horários de reposição"
  on horarios_reposicao for select
  to authenticated
  using (eh_admin());

create index horarios_reposicao_disponiveis_idx
  on horarios_reposicao (professor_id, data)
  where estado = 'disponivel';

-- ---------------------------------------------------------------------
-- 3. Pedido de reposição
-- ---------------------------------------------------------------------
create table pedidos_reposicao (
  id bigint generated always as identity primary key,

  -- Um pedido por aula desmarcada, imposto pela base de dados e não pelo
  -- ecrã: dois toques no botão de enviar deixavam dois pedidos iguais na
  -- lista do professor.
  aula_desmarcada_id bigint not null unique references aulas_desmarcadas(id) on delete cascade,

  aluno_id uuid not null,
  professor_id uuid not null,
  mensagem text check (mensagem is null or char_length(mensagem) <= 500),

  estado text not null default 'pendente'
    check (estado in ('pendente', 'agendada', 'nao_possivel', 'expirada')),
  -- O que o professor escreveu ao dizer que não era possível.
  resposta text check (resposta is null or char_length(resposta) <= 500),

  -- 30 dias para MARCAR a reposição. A aula em si pode acontecer depois:
  -- o prazo é da resposta, não da aula.
  expira_em date not null,
  -- Qual foi o último lembrete enviado ao professor (7, 21, 28). Guardado
  -- para o cron diário não repetir o mesmo lembrete todos os dias.
  ultimo_lembrete integer not null default 0,

  criado_em timestamptz not null default now(),
  resolvido_em timestamptz
);

alter table pedidos_reposicao enable row level security;

create policy "Conta CCG vê os pedidos dos seus alunos"
  on pedidos_reposicao for select
  to authenticated
  using (
    exists (select 1 from alunos a where a.id = aluno_id and a.encarregado_id = auth.uid())
  );

create policy "Professor vê os pedidos que lhe são dirigidos"
  on pedidos_reposicao for select
  to authenticated
  using (auth.uid() = professor_id);

create policy "Administradores veem os pedidos de reposição"
  on pedidos_reposicao for select
  to authenticated
  using (eh_admin());

create index pedidos_reposicao_pendentes_idx
  on pedidos_reposicao (professor_id, expira_em)
  where estado = 'pendente';

-- As vagas que o aluno escolheu. Escolher NÃO reserva — a vaga só fica
-- ocupada quando o professor aceita. Daí ser uma tabela de ligação e não
-- um campo em `pedidos_reposicao`.
create table pedidos_reposicao_horarios (
  pedido_id bigint not null references pedidos_reposicao(id) on delete cascade,
  horario_reposicao_id bigint not null references horarios_reposicao(id) on delete cascade,
  primary key (pedido_id, horario_reposicao_id)
);

alter table pedidos_reposicao_horarios enable row level security;

create policy "Vê as opções dos pedidos que pode ver"
  on pedidos_reposicao_horarios for select
  to authenticated
  using (
    exists (
      select 1 from pedidos_reposicao p
      where p.id = pedido_id
        and (
          p.professor_id = auth.uid()
          or exists (select 1 from alunos a where a.id = p.aluno_id and a.encarregado_id = auth.uid())
          or eh_admin()
        )
    )
  );

-- ---------------------------------------------------------------------
-- 4. A reposição marcada
-- ---------------------------------------------------------------------
create table reposicoes (
  id bigint generated always as identity primary key,

  -- Todas as ligações são anuláveis de propósito: uma reposição marcada à
  -- mão pode não ter aula desmarcada nem pedido por trás (o professor
  -- pode simplesmente dar uma aula extra), e o registo tem de sobreviver
  -- a qualquer uma delas desaparecer.
  aula_desmarcada_id bigint references aulas_desmarcadas(id) on delete set null,
  pedido_id bigint references pedidos_reposicao(id) on delete set null,
  matricula_id bigint references matriculas(id) on delete set null,
  horario_reposicao_id bigint references horarios_reposicao(id) on delete set null,

  aluno_id uuid not null,
  professor_id uuid not null,
  instrumento_nome text,

  data date not null,
  hora_inicio time not null,
  hora_fim time not null,
  sala_id bigint references salas(id) on delete set null,

  marcada_por uuid references profiles(id) on delete set null,
  criado_em timestamptz not null default now(),

  constraint reposicoes_horas check (hora_fim > hora_inicio)
);

alter table reposicoes enable row level security;

create policy "Conta CCG vê as reposições dos seus alunos"
  on reposicoes for select
  to authenticated
  using (
    exists (select 1 from alunos a where a.id = aluno_id and a.encarregado_id = auth.uid())
  );

create policy "Professor vê e gere as suas reposições"
  on reposicoes for all
  to authenticated
  using (auth.uid() = professor_id)
  with check (auth.uid() = professor_id);

create policy "Administradores veem as reposições"
  on reposicoes for select
  to authenticated
  using (eh_admin());

create index reposicoes_professor_idx on reposicoes (professor_id, data);
create index reposicoes_aluno_idx on reposicoes (aluno_id, data);

-- ---------------------------------------------------------------------
-- 5. Presenças de uma reposição
-- ---------------------------------------------------------------------
--
-- Uma reposição acontece num dia que não é o da grelha semanal do aluno,
-- e podem existir duas aulas do mesmo aluno no mesmo dia (a normal e uma
-- reposição). O único índice de `presencas` era (matricula_id, data), que
-- proibia exatamente isso.
alter table presencas add column reposicao_id bigint references reposicoes(id) on delete cascade;

alter table presencas drop constraint if exists presencas_matricula_id_data_key;

create unique index presencas_aula_normal_unica
  on presencas (matricula_id, data)
  where reposicao_id is null;

create unique index presencas_reposicao_unica
  on presencas (reposicao_id)
  where reposicao_id is not null;

-- ---------------------------------------------------------------------
-- 6. Avisos
-- ---------------------------------------------------------------------
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
      'reposicao_lembrete'
    )
  );

commit;
