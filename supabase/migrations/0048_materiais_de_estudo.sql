-- Material de estudo: o professor deixa um vídeo, o aluno encontra-o no
-- caderno.
--
-- O vídeo NÃO fica aqui. Fica no YouTube, não listado, na conta do
-- professor; a base de dados guarda apenas o identificador de 11
-- caracteres. Guardar vídeo era o caminho mais curto para esgotar o
-- alojamento — o plano gratuito da Supabase dá 1 GB, e meia dúzia de
-- aulas gravadas passam disso.
--
-- Guarda-se o id e não o URL inteiro porque o mesmo vídeo tem meia dúzia
-- de endereços (youtu.be, /watch?v=, /shorts/, com e sem parâmetros de
-- tempo e de campanha). Normalizar à entrada evita ter o mesmo vídeo
-- gravado de quatro maneiras e não conseguir compará-los.
--
-- `tipo` já cá está a pensar nas partituras, que vêm a seguir e não vão
-- ser links do YouTube. Por agora só aceita 'video'.

begin;

create table materiais (
  id bigint generated always as identity primary key,

  professor_id uuid not null references profiles(id) on delete cascade,

  tipo text not null check (tipo in ('video')),

  -- Os ids do YouTube são sempre 11 caracteres de [A-Za-z0-9_-].
  --
  -- O `is not null` explícito não é redundante: em Postgres, um CHECK que
  -- dê NULL PASSA. Sem ele, `youtube_id ~ regex` com youtube_id nulo dava
  -- NULL, o `or` dava NULL, e um vídeo sem id entrava sem se queixar —
  -- para ir dar um cartão partido no caderno do aluno.
  youtube_id text check (
    tipo <> 'video'
    or (youtube_id is not null and youtube_id ~ '^[A-Za-z0-9_-]{11}$')
  ),

  titulo text not null check (char_length(titulo) between 1 and 160),
  descricao text check (descricao is null or char_length(descricao) <= 600),

  criado_em timestamptz not null default now()
);

-- A quem foi enviado. Uma linha por aluno: o professor manda a um ou dois
-- de cada vez, e é assim que o caderno de cada um sabe o que lhe pertence.
create table materiais_alunos (
  material_id bigint not null references materiais(id) on delete cascade,
  aluno_id uuid not null references alunos(id) on delete cascade,
  primary key (material_id, aluno_id)
);

create index materiais_alunos_aluno_idx on materiais_alunos (aluno_id);
create index materiais_professor_idx on materiais (professor_id);

alter table materiais enable row level security;
alter table materiais_alunos enable row level security;

-- ---------------------------------------------------------------------
-- Quem vê o quê
-- ---------------------------------------------------------------------

create policy "Professor ve o material que enviou"
  on materiais for select
  to authenticated
  using (professor_id = auth.uid());

create policy "Professor apaga o material que enviou"
  on materiais for delete
  to authenticated
  using (professor_id = auth.uid());

-- A família vê o material dos seus educandos. `eh_meu_educando` é a
-- função de 0044 — a regra deste projeto desde a recursão de 0019: uma
-- policy nunca consulta outra tabela em subquery direta.
create policy "Familia ve o material dos seus educandos"
  on materiais for select
  to authenticated
  using (
    exists (
      select 1 from public.materiais_alunos ma
      where ma.material_id = materiais.id
        and public.eh_meu_educando(ma.aluno_id)
    )
  );

create policy "Secretaria ve todo o material"
  on materiais for select
  to authenticated
  using (public.eh_admin());

create policy "Ve as ligacoes do material que ja pode ver"
  on materiais_alunos for select
  to authenticated
  using (
    public.eh_meu_educando(aluno_id)
    or public.eh_admin()
    or exists (
      select 1 from public.materiais m
      where m.id = materiais_alunos.material_id and m.professor_id = auth.uid()
    )
  );

-- Não há policy de INSERT em nenhuma das duas. Publicar passa
-- obrigatoriamente pela função abaixo, que é quem garante que um
-- professor só consegue mandar material aos SEUS alunos. Uma policy
-- equivalente teria de repetir essa verificação em dois sítios.

-- ---------------------------------------------------------------------
-- Publicar
-- ---------------------------------------------------------------------

create or replace function public.publicar_material(
  p_youtube_id text,
  p_titulo text,
  p_descricao text,
  p_alunos uuid[]
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_quantos int;
begin
  if not exists (
    select 1 from public.perfis_escola
    where id = auth.uid() and tipo = 'professor'
  ) then
    raise exception 'Só professores publicam material.';
  end if;

  if p_alunos is null or cardinality(p_alunos) = 0 then
    raise exception 'Escolhe pelo menos um aluno.';
  end if;

  -- Dos alunos pedidos, quantos são mesmo deste professor e têm aulas a
  -- decorrer. Se algum não for, não se publica nada: publicar só para
  -- alguns deixaria o professor convencido de que enviou a todos.
  select count(distinct m.aluno_id) into v_quantos
  from public.matriculas m
  where m.professor_id = auth.uid()
    and m.estado = 'confirmado'
    and m.aluno_id = any(p_alunos);

  if v_quantos <> cardinality(array(select distinct unnest(p_alunos))) then
    raise exception 'Só podes enviar material aos teus alunos com aulas a decorrer.';
  end if;

  insert into public.materiais (professor_id, tipo, youtube_id, titulo, descricao)
  values (auth.uid(), 'video', p_youtube_id, p_titulo, nullif(btrim(p_descricao), ''))
  returning id into v_id;

  insert into public.materiais_alunos (material_id, aluno_id)
  select v_id, distinct_aluno
  from (select distinct unnest(p_alunos) as distinct_aluno) s;

  return v_id;
end;
$$;

revoke execute on function public.publicar_material(text, text, text, uuid[])
  from public, anon;
grant execute on function public.publicar_material(text, text, text, uuid[])
  to authenticated;

commit;
