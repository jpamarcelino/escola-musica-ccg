-- Duas correções ao material de estudo: o aluno não via nada, e não era
-- avisado de nada.
--
-- 1. RECURSÃO. As duas policies de 0048 chamavam-se uma à outra:
--    `materiais` perguntava a `materiais_alunos` quem tinha recebido, e
--    `materiais_alunos` perguntava a `materiais` de quem era. O Postgres
--    responde 42P17 (infinite recursion) — e o cliente Supabase devolve
--    isso como erro na consulta, que a página trata como "sem linhas".
--    Daí o caderno vazio: não faltavam dados, faltava poder lê-los.
--
--    É exatamente a armadilha da migração 0019, e a regra que ficou dessa
--    vez é a que eu não segui: uma policy nunca consulta outra tabela em
--    subquery direta; passa por uma função `security definer`, que corre
--    sem RLS por dentro e por isso não reentra.
--
-- 2. AVISO. Publicar material não avisava ninguém. O tipo `novo_material`
--    existia na tabela de tipos desde 0041 e nunca tinha sido usado por
--    nada — o material aparecia no caderno e ficava à espera de ser
--    descoberto por acaso.

begin;

-- ---------------------------------------------------------------------
-- 1. As funções que quebram o ciclo
-- ---------------------------------------------------------------------

create or replace function public.material_e_meu(p_material_id bigint)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.materiais m
    where m.id = p_material_id and m.professor_id = auth.uid()
  );
$$;

create or replace function public.material_do_meu_educando(p_material_id bigint)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.materiais_alunos ma
    where ma.material_id = p_material_id
      and public.eh_meu_educando(ma.aluno_id)
  );
$$;

revoke execute on function public.material_e_meu(bigint) from public, anon;
revoke execute on function public.material_do_meu_educando(bigint) from public, anon;
grant execute on function public.material_e_meu(bigint) to authenticated;
grant execute on function public.material_do_meu_educando(bigint) to authenticated;

drop policy if exists "Familia ve o material dos seus educandos" on materiais;
create policy "Familia ve o material dos seus educandos"
  on materiais for select
  to authenticated
  using (public.material_do_meu_educando(id));

drop policy if exists "Ve as ligacoes do material que ja pode ver" on materiais_alunos;
create policy "Ve as ligacoes do material que ja pode ver"
  on materiais_alunos for select
  to authenticated
  using (
    public.eh_meu_educando(aluno_id)
    or public.eh_admin()
    or public.material_e_meu(material_id)
  );

-- ---------------------------------------------------------------------
-- 2. O aviso
-- ---------------------------------------------------------------------

update tipos_aviso
   set titulo = 'Novo material',
       destino = '/dashboard/materiais',
       push = true,
       papeis = array['familia'],
       notas = 'Familia — video ou partitura deixados pelo professor'
 where tipo = 'novo_material';

-- Avisa as famílias dos alunos de um material acabado de publicar.
--
-- Uma linha por aluno, e não por conta: uma família com dois filhos a
-- receber a mesma partitura tem duas coisas para ir ver, em dois
-- cadernos diferentes. O `aluno_id` no aviso é o que deixa a página de
-- avisos dizer de quem se trata.
create or replace function public.avisar_material_novo(p_material_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo text;
  v_titulo text;
  v_professor text;
begin
  select m.tipo, m.titulo, p.nome
    into v_tipo, v_titulo, v_professor
  from public.materiais m
  join public.profiles p on p.id = m.professor_id
  where m.id = p_material_id;

  if v_tipo is null then
    return;
  end if;

  insert into public.notificacoes (user_id, aluno_id, tipo, mensagem)
  select a.encarregado_id, a.id, 'novo_material',
         coalesce(v_professor, 'O professor') || ' deixou '
           || case when v_tipo = 'partitura' then 'uma partitura' else 'um vídeo' end
           || ' no caderno de ' || a.nome || ': ' || v_titulo || '.'
  from public.materiais_alunos ma
  join public.alunos a on a.id = ma.aluno_id
  where ma.material_id = p_material_id;
end;
$$;

revoke execute on function public.avisar_material_novo(bigint) from public, anon;
grant execute on function public.avisar_material_novo(bigint) to authenticated;

-- As duas funções de publicar passam a avisar. Fica dentro delas, e não a
-- cargo de quem chama, porque o aviso é a única forma de a família saber
-- que há material novo — perdê-lo por um erro de rede a meio deixava o
-- vídeo no caderno à espera de ser descoberto por acaso. Assim, ou entram
-- os dois, ou não entra nenhum.

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
  select v_id, d from (select distinct unnest(p_alunos) as d) s;

  perform public.avisar_material_novo(v_id);

  return v_id;
end;
$$;

create or replace function public.publicar_partitura(
  p_ficheiro text,
  p_ficheiro_nome text,
  p_ficheiro_bytes bigint,
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

  if p_ficheiro is null or split_part(p_ficheiro, '/', 1) <> auth.uid()::text then
    raise exception 'Ficheiro inválido.';
  end if;

  if p_alunos is null or cardinality(p_alunos) = 0 then
    raise exception 'Escolhe pelo menos um aluno.';
  end if;

  select count(distinct m.aluno_id) into v_quantos
  from public.matriculas m
  where m.professor_id = auth.uid()
    and m.estado = 'confirmado'
    and m.aluno_id = any(p_alunos);

  if v_quantos <> cardinality(array(select distinct unnest(p_alunos))) then
    raise exception 'Só podes enviar material aos teus alunos com aulas a decorrer.';
  end if;

  insert into public.materiais
    (professor_id, tipo, titulo, descricao, ficheiro, ficheiro_nome, ficheiro_bytes)
  values
    (auth.uid(), 'partitura', p_titulo, nullif(btrim(p_descricao), ''),
     p_ficheiro, p_ficheiro_nome, p_ficheiro_bytes)
  returning id into v_id;

  insert into public.materiais_alunos (material_id, aluno_id)
  select v_id, d from (select distinct unnest(p_alunos) as d) s;

  perform public.avisar_material_novo(v_id);

  return v_id;
end;
$$;

commit;
