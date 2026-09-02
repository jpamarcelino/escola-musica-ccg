-- A Escola de Música para Bebés passa a existir a sério.
--
-- Até aqui os Bebés eram duas disciplinas soltas em `instrumentos` e mais
-- nada: nenhum professor lhes podia ser atribuído (o `check` do
-- `perfis_escola.programa` só aceita 'musica' e 'danca'), e o pedido de
-- disciplina exige que a disciplina seja da escola do professor. Ou seja,
-- a escola aparecia no assistente público e não tinha como funcionar.
--
-- A modelação escolhida, e o porquê:
--
-- Um professor de Bebés é um professor de Música (ou de Dança) com uma
-- ATRIBUIÇÃO a mais, e não uma pessoa de outra escola. Por isso o
-- `programa` dele não muda — continua a criar os horários dele, a ter a
-- agenda dele e a página dele como sempre. O que muda é passar a estar
-- atribuído a uma turma.
--
-- E as turmas espelham-se em `horarios` normais, um por professor
-- atribuído, com `estado = 'bloqueado'`. É a decisão que faz a agenda, as
-- presenças e as mensalidades continuarem a funcionar sem saberem que os
-- Bebés existem: para elas é uma matrícula num horário, como todas as
-- outras. 'bloqueado' porque a hora é da escola e não se pede
-- individualmente — quem inscreve é a secretaria.

begin;

-- ---------------------------------------------------------------------
-- 1. O nome da segunda turma, e os ícones trocados
-- ---------------------------------------------------------------------
--
-- "Pré-escolar (3 aos 5 anos)" e não "4 aos 5": mudar a faixa abria um
-- buraco entre os 3 e os 4 anos, em que ninguém era elegível para turma
-- nenhuma. O `parseFaixaEtaria` procura "X aos Y" em qualquer posição da
-- string, por isso o nome com parênteses continua a filtrar a idade
-- corretamente — há um teste no @ccg/core que o fixa.
update instrumentos set nome = 'Pré-escolar (3 aos 5 anos)'
where programa = 'bebes' and nome = '3 aos 5 anos';

-- Os dois ícones estavam trocados desde a 0023: a turma dos 0 aos 3
-- apontava para a imagem dos 3 aos 5 e vice-versa.
update instrumentos set imagem_url = '/instrumentos/bebes-0-3.png'
where programa = 'bebes' and nome like '0 aos 3%';
update instrumentos set imagem_url = '/instrumentos/bebes-3-5.png'
where programa = 'bebes' and nome like 'Pré-escolar%';

-- ---------------------------------------------------------------------
-- 2. As turmas
-- ---------------------------------------------------------------------
create table if not exists turmas_bebes (
  id bigint generated always as identity primary key,

  -- Uma turma por disciplina de Bebés. É `unique` de propósito: a escola
  -- tem duas turmas e não N — se um dia tiver mais, é uma disciplina
  -- nova, não uma segunda linha para a mesma.
  instrumento_id bigint not null unique references instrumentos(id) on delete cascade,

  dia_semana text not null check (
    dia_semana in ('Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo')
  ),
  hora_inicio time not null,
  hora_fim time not null,

  -- Ao décimo inscrito a turma fecha. O número vive aqui e não no código
  -- para a secretaria o poder mudar sem um deploy.
  capacidade int not null default 10 check (capacidade > 0),

  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references profiles(id) on delete set null,

  constraint turmas_bebes_horas check (hora_fim > hora_inicio)
);

create table if not exists turmas_bebes_professores (
  turma_id bigint not null references turmas_bebes(id) on delete cascade,
  professor_id uuid not null references profiles(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (turma_id, professor_id)
);

alter table turmas_bebes enable row level security;
alter table turmas_bebes_professores enable row level security;

-- Toda a gente com sessão lê: é o horário da escola, como o calendário.
-- Escrever é da secretaria, e só dela — é o pedido explícito.
create policy "Toda a gente le as turmas de bebes"
  on turmas_bebes for select to authenticated using (true);

create policy "Secretaria gere as turmas de bebes"
  on turmas_bebes for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

create policy "Toda a gente le quem da as turmas de bebes"
  on turmas_bebes_professores for select to authenticated using (true);

create policy "Secretaria atribui professores as turmas de bebes"
  on turmas_bebes_professores for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- ---------------------------------------------------------------------
-- 3. As duas turmas, com o horário que a escola definiu
-- ---------------------------------------------------------------------
insert into turmas_bebes (instrumento_id, dia_semana, hora_inicio, hora_fim)
select i.id, 'Sábado', '10:00'::time, '10:50'::time
from instrumentos i where i.programa = 'bebes' and i.nome like '0 aos 3%'
on conflict (instrumento_id) do nothing;

insert into turmas_bebes (instrumento_id, dia_semana, hora_inicio, hora_fim)
select i.id, 'Sábado', '11:00'::time, '11:50'::time
from instrumentos i where i.programa = 'bebes' and i.nome like 'Pré-escolar%'
on conflict (instrumento_id) do nothing;

-- ---------------------------------------------------------------------
-- 4. O espelho em `horarios`
-- ---------------------------------------------------------------------
--
-- Mantém, para cada par (turma, professor), um horário bloqueado com a
-- hora da turma. É o que faz a hora aparecer na agenda do professor e as
-- matrículas de Bebés serem matrículas normais.
--
-- Só apaga horários que não tenham matrícula confirmada: mudar a hora de
-- uma turma não pode desfazer as aulas que já lá estão. Nesse caso o
-- horário antigo fica, e é a `mudar_horario_turma_bebes` que trata de
-- mover as matrículas.
create or replace function public.sincronizar_horarios_bebes()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_par record;
begin
  for v_par in
    select tp.professor_id, t.dia_semana, t.hora_inicio, t.hora_fim
    from turmas_bebes t
    join turmas_bebes_professores tp on tp.turma_id = t.id
  loop
    insert into horarios (professor_id, dia_semana, hora_inicio, hora_fim, estado)
    values (v_par.professor_id, v_par.dia_semana, v_par.hora_inicio, v_par.hora_fim, 'bloqueado')
    on conflict (professor_id, dia_semana, hora_inicio, hora_fim)
    do update set estado = 'bloqueado';
  end loop;
end;
$$;

create or replace function public.turmas_bebes_apos_mudanca()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform sincronizar_horarios_bebes();
  return null;
end;
$$;

drop trigger if exists turmas_bebes_sincroniza on turmas_bebes;
create trigger turmas_bebes_sincroniza
  after insert or update on turmas_bebes
  for each statement execute function turmas_bebes_apos_mudanca();

drop trigger if exists turmas_bebes_professores_sincroniza on turmas_bebes_professores;
create trigger turmas_bebes_professores_sincroniza
  after insert or update on turmas_bebes_professores
  for each statement execute function turmas_bebes_apos_mudanca();

-- ---------------------------------------------------------------------
-- 5. O aviso de mudança de horário
-- ---------------------------------------------------------------------
--
-- Estendido a partir do que está na base de dados e não reescrito de uma
-- lista à mão — ver a nota na 0058.
do $migracao$
declare
  v_def text;
begin
  select pg_get_constraintdef(oid) into v_def
  from pg_constraint
  where conrelid = 'notificacoes'::regclass and conname = 'notificacoes_tipo_check';

  if v_def is not null and position('turma_bebes_alterada' in v_def) = 0 then
    alter table notificacoes drop constraint notificacoes_tipo_check;
    execute 'alter table notificacoes add constraint notificacoes_tipo_check '
      || replace(v_def, ']))', ', ''turma_bebes_alterada''::text]))');
  end if;
end
$migracao$;

insert into tipos_aviso (tipo, titulo, destino, push, notas, papeis) values
  ('turma_bebes_alterada', 'Horario da turma mudou', '/dashboard/agenda', true,
   'A secretaria mudou o dia ou a hora de uma turma de Musica para Bebes. Vai a familia e ao professor.',
   array['familia', 'professor'])
on conflict (tipo) do nothing;

commit;
