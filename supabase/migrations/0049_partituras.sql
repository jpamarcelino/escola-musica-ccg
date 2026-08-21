-- Partituras: o segundo tipo de material.
--
-- Ao contrário do vídeo, que é um link para o YouTube, a partitura é um
-- ficheiro nosso. Cabe: um PDF de partitura pesa entre 100 KB e 1 MB, e o
-- Storage tem 1 GB — dá para umas duas mil, e hoje há 2 MB usados.
--
-- O bucket é PRIVADO, ao contrário do das fotos de professores. Uma foto
-- de professor é pública por natureza (aparece no site); uma partitura é
-- de quem a recebeu. Ficheiro privado quer dizer que o endereço direto
-- não serve para nada — a app gera um link assinado, válido por uma hora,
-- de cada vez que alguém abre a página.

begin;

alter table materiais drop constraint materiais_tipo_check;
alter table materiais add constraint materiais_tipo_check
  check (tipo in ('video', 'partitura'));

-- Caminho dentro do bucket: "<professor_id>/<uuid>.pdf". O primeiro
-- segmento é o dono, e é isso que as policies do Storage verificam.
alter table materiais add column ficheiro text;
alter table materiais add column ficheiro_nome text;
alter table materiais add column ficheiro_bytes bigint;

-- O mesmo cuidado da restrição do youtube_id: em Postgres um CHECK que dê
-- NULL passa, por isso o `is not null` tem de estar escrito.
alter table materiais add constraint materiais_ficheiro_check
  check (tipo <> 'partitura' or (ficheiro is not null and ficheiro <> ''));

create unique index materiais_ficheiro_idx on materiais (ficheiro)
  where ficheiro is not null;

-- ---------------------------------------------------------------------
-- O bucket
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('partituras', 'partituras', false, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Quem pode ler um ficheiro deste bucket.
--
-- Vai por função `security definer` e não por subquery na policy: é a
-- regra deste projeto desde a recursão de 0019, e aqui há ainda outra
-- razão — `storage.objects` é de outro esquema, e uma policy que lhe
-- ande a juntar tabelas do `public` fica ilegível.
create or replace function public.posso_ver_partitura(p_caminho text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.materiais m
    where m.ficheiro = p_caminho
      and (
        -- Quem a enviou.
        m.professor_id = auth.uid()
        -- A secretaria.
        or public.eh_admin()
        -- A família de quem a recebeu.
        or exists (
          select 1 from public.materiais_alunos ma
          where ma.material_id = m.id and public.eh_meu_educando(ma.aluno_id)
        )
      )
  );
$$;

revoke execute on function public.posso_ver_partitura(text) from public, anon;
grant execute on function public.posso_ver_partitura(text) to authenticated;

create policy "Professor carrega partituras na sua pasta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'partituras'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Professor apaga as partituras que carregou"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'partituras'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Ve a partitura quem tem direito a ela"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'partituras'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.posso_ver_partitura(name)
    )
  );

-- ---------------------------------------------------------------------
-- Publicar
-- ---------------------------------------------------------------------

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

  -- O ficheiro tem de estar na pasta de quem publica. Sem isto, um
  -- professor podia publicar o caminho de uma partitura de outro — a
  -- policy do Storage impede-o de a CARREGAR lá, mas não de referir uma
  -- que já lá esteja.
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

  return v_id;
end;
$$;

revoke execute on function public.publicar_partitura(text, text, bigint, text, text, uuid[])
  from public, anon;
grant execute on function public.publicar_partitura(text, text, bigint, text, text, uuid[])
  to authenticated;

commit;
