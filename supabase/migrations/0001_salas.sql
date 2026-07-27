-- Atribuição automática de salas aos horários
--
-- Regras (confirmadas com o diretor em 2026-07-27):
--   - Dança: sempre no Salão de Dança, sem conflitos a verificar.
--   - João Marcelino: Sala 1, Piso 3 — sempre, todos os dias.
--   - Helena Rodrigues: Sala 2, Piso 2 — sempre, todos os dias.
--   - Maria Martins: Sala 3, Piso 3 — sempre para ela; mas só fica
--     bloqueada a outros professores à Segunda e Terça. Nos restantes dias,
--     fora das horas em que a Maria lá está, fica disponível para o "pool".
--   - João Monteiro: prioridade na Sala 5, Piso 3.
--   - Paulo Pereira: Sala 4, Piso 3.
--   - Mariana Lisboa: tenta 4, depois 5, depois 3 (fora de Seg/Ter), depois
--     o recurso final (Sala 2, Piso 3).
--   - Joaquim Condesso: tenta 3 (fora de Seg/Ter), depois 4, depois 5,
--     depois o recurso final (Sala 2, Piso 3).
--   - Prioridade em caso de conflito (quem "ganha" a sala):
--     Marcelino > Helena > Maria > Monteiro > Paulo > Mariana > Joaquim.
--   - Reatribuição é automática: um horário novo de maior prioridade pode
--     "empurrar" um professor de menor prioridade já atribuído para outra
--     sala livre da sua lista.
--
-- Nota: "Sala 2" existe em dois pisos diferentes — a do Piso 2 (Helena) e a
-- do Piso 3 (recurso final, sem dono) são salas distintas, distinguidas por
-- "piso" + "numero", não pelo nome.

-- 1. Salas físicas
create table salas (
  id bigint generated always as identity primary key,
  nome text not null unique,
  piso int,
  numero int,
  -- Professor "dono" desta sala (recebe-a sempre, sem competir por ela).
  -- Nulo para as salas do "pool" flexível (4, 5, e o recurso final).
  dono_id uuid references profiles(id) on delete set null,
  -- Dias em que a sala fica bloqueada a todos exceto o dono, mesmo que o
  -- dono não a esteja a usar nessa hora. Vazio = nunca bloqueada a mais
  -- ninguém para além da sobreposição normal de horário.
  dias_exclusivos text[] not null default '{}'
    check (dias_exclusivos <@ array['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']),
  unique (piso, numero)
);

alter table salas enable row level security;

create policy "Utilizadores autenticados veem salas"
  on salas for select
  to authenticated
  using (true);

-- Colunas novas em profiles: prioridade e lista ordenada de salas
-- candidatas, só usadas pelos professores do "pool" flexível (os com sala
-- própria em salas.dono_id não precisam disto). Têm de existir antes do
-- bloco abaixo, que já as preenche.
alter table profiles add column sala_prioridade int;
alter table profiles add column sala_candidatos bigint[];

do $$
declare
  v_dias_todos constant text[] := array['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
  v_marcelino uuid;
  v_helena uuid;
  v_maria uuid;
  v_monteiro uuid;
  v_paulo uuid;
  v_mariana uuid;
  v_joaquim uuid;
  v_sala4 bigint;
  v_sala5 bigint;
  v_sala3 bigint;
  v_sala2p3 bigint;
begin
  select id into v_marcelino from public.profiles where nome = 'João Marcelino' and tipo = 'professor';
  select id into v_helena from public.profiles where nome = 'Helena Rodrigues' and tipo = 'professor';
  select id into v_maria from public.profiles where nome = 'Maria Martins' and tipo = 'professor';
  select id into v_monteiro from public.profiles where nome = 'João Monteiro' and tipo = 'professor';
  select id into v_paulo from public.profiles where nome = 'Paulo Pereira' and tipo = 'professor';
  select id into v_mariana from public.profiles where nome = 'Mariana Lisboa' and tipo = 'professor';
  select id into v_joaquim from public.profiles where nome = 'Joaquim Condesso' and tipo = 'professor';

  if v_marcelino is null or v_helena is null or v_maria is null or v_monteiro is null
     or v_paulo is null or v_mariana is null or v_joaquim is null then
    raise exception 'Não encontrei todos os professores esperados por nome — confirma os nomes em profiles antes de correr esta migração.';
  end if;

  insert into public.salas (nome, piso, numero, dono_id, dias_exclusivos) values
    ('Salão de Dança', null, null, null, '{}'),
    ('Sala 1 — Piso 3 (João Marcelino)', 3, 1, v_marcelino, v_dias_todos),
    ('Sala 2 — Piso 2 (Helena)', 2, 2, v_helena, v_dias_todos),
    ('Sala 3 — Piso 3 (Maria, Seg/Ter reservada)', 3, 3, v_maria, array['Segunda','Terça']),
    ('Sala 4 — Piso 3', 3, 4, null, '{}'),
    ('Sala 5 — Piso 3', 3, 5, null, '{}'),
    ('Sala 2 — Piso 3 (recurso final)', 3, 2, null, '{}');

  select id into v_sala3 from public.salas where piso = 3 and numero = 3;
  select id into v_sala4 from public.salas where piso = 3 and numero = 4;
  select id into v_sala5 from public.salas where piso = 3 and numero = 5;
  select id into v_sala2p3 from public.salas where piso = 3 and numero = 2;

  update public.profiles set sala_prioridade = 4, sala_candidatos = array[v_sala5] where id = v_monteiro;
  update public.profiles set sala_prioridade = 5, sala_candidatos = array[v_sala4] where id = v_paulo;
  update public.profiles set sala_prioridade = 6, sala_candidatos = array[v_sala4, v_sala5, v_sala3, v_sala2p3] where id = v_mariana;
  update public.profiles set sala_prioridade = 7, sala_candidatos = array[v_sala3, v_sala4, v_sala5, v_sala2p3] where id = v_joaquim;
end $$;

-- 3. Sala atribuída a cada horário (calculada automaticamente, nunca
-- escrita diretamente pela app).
alter table horarios add column sala_id bigint references salas(id);

-- 4. Função que recalcula, do zero, a sala de todos os horários — por
-- ordem de prioridade dos professores. Recalcular tudo em vez de ajustar
-- incrementalmente é mais simples e evita bugs subtis de estado.
create or replace function public.recalcular_salas()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sala_danca bigint;
  p record;
  h record;
  s record;
  cand bigint;
  ocupada boolean;
begin
  select id into v_sala_danca from public.salas where piso is null and numero is null;

  update public.horarios set sala_id = null;

  -- Dança: toda a gente no Salão de Dança, sem verificação de conflitos.
  -- Alias "hor" (não "h") para não colidir com a variável "h" da função.
  update public.horarios hor
  set sala_id = v_sala_danca
  from public.profiles pr
  where hor.professor_id = pr.id and pr.programa = 'danca';

  -- Professores com sala própria: recebem-na sempre, sem competir por ela.
  -- Alias "sa" (não "s") para não colidir com a variável "s" da função.
  for p in
    select pr.id as professor_id, sa.id as sala_id
    from public.profiles pr
    join public.salas sa on sa.dono_id = pr.id
  loop
    update public.horarios set sala_id = p.sala_id where professor_id = p.professor_id;
  end loop;

  -- Pool flexível: por ordem de prioridade, cada horário tenta a sua lista
  -- de salas candidatas, pela ordem dada, e fica com a primeira livre.
  for p in
    select * from public.profiles
    where sala_candidatos is not null
    order by sala_prioridade nulls last, id
  loop
    for h in
      select * from public.horarios where professor_id = p.id order by dia_semana, hora_inicio, id
    loop
      foreach cand in array p.sala_candidatos
      loop
        select * into s from public.salas where id = cand;

        -- Bloqueada por exclusividade de outro dono nesse dia (ex: sala 3
        -- da Maria à Segunda/Terça) — nem chega a verificar sobreposição.
        if s.dono_id is not null and s.dono_id <> p.id and h.dia_semana = any(s.dias_exclusivos) then
          continue;
        end if;

        select exists (
          select 1 from public.horarios h2
          where h2.id <> h.id
            and h2.sala_id = cand
            and h2.dia_semana = h.dia_semana
            and h2.hora_inicio < h.hora_fim
            and h2.hora_fim > h.hora_inicio
        ) into ocupada;

        if not ocupada then
          update public.horarios set sala_id = cand where id = h.id;
          exit;
        end if;
      end loop;
      -- Se nenhuma candidata estava livre, sala_id fica null — conflito
      -- sem sala disponível, a resolver manualmente.
    end loop;
  end loop;
end;
$$;

-- 5. Trigger: qualquer criação, edição ou remoção de horário recalcula tudo.
-- A guarda por variável de transação evita recursão infinita (o próprio
-- recálculo faz UPDATE em horarios, o que dispararia o trigger outra vez).
create or replace function public.trg_recalcular_salas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('app.a_recalcular_salas', true) = 'true' then
    return null;
  end if;
  perform set_config('app.a_recalcular_salas', 'true', true);
  perform public.recalcular_salas();
  perform set_config('app.a_recalcular_salas', 'false', true);
  return null;
end;
$$;

create trigger horarios_recalcular_salas
  after insert or update or delete on horarios
  for each statement
  execute function public.trg_recalcular_salas();

-- 6. Aplica já às salas todos os horários existentes.
select public.recalcular_salas();
