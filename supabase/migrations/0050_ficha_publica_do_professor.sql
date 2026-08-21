-- A ficha pública do professor: foto em grande e uma biografia curta,
-- alcançável por um "i" nos cartões de escolha de professor.
--
-- Quem escolhe um professor está a escolher com quem vai ter aulas todas
-- as semanas durante um ano, e até aqui via um nome, uma miniatura de 46
-- píxeis e, com sorte, "Piano jazz/rock". Isto dá-lhe onde ler.
--
-- A foto e a biografia passam a ser da ESCOLA, não do professor: ambas
-- aparecem a quem ainda não é aluno e representam a casa. Quem as muda é
-- a secretaria. O professor deixa de poder carregar a sua própria foto —
-- podia até agora.

begin;

alter table perfis_escola add column bio text
  check (bio is null or char_length(bio) <= 1200);

-- ---------------------------------------------------------------------
-- A foto deixa de ser do professor
-- ---------------------------------------------------------------------

-- Estas duas foram criadas com acentos no schema.sql, mas em produção
-- ficaram sem eles ("Professor carrega a propria foto"). Um `drop policy
-- if exists` com o nome errado não dá erro nenhum — limita-se a não fazer
-- nada, e a policy sobrevive em silêncio. Daí as duas grafias.
drop policy if exists "Professor carrega a própria foto" on storage.objects;
drop policy if exists "Professor substitui a própria foto" on storage.objects;
drop policy if exists "Professor carrega a propria foto" on storage.objects;
drop policy if exists "Professor substitui a propria foto" on storage.objects;

create policy "Secretaria gere as fotos dos professores"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'fotos-professores' and public.eh_admin());

create policy "Secretaria substitui as fotos dos professores"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'fotos-professores' and public.eh_admin());

create policy "Secretaria apaga as fotos dos professores"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'fotos-professores' and public.eh_admin());

-- ---------------------------------------------------------------------
-- Editar a ficha (só a secretaria)
-- ---------------------------------------------------------------------

create or replace function public.definir_ficha_publica(
  p_professor uuid,
  p_bio text,
  p_foto_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só a secretaria altera a ficha de um professor.';
  end if;

  if not exists (
    select 1 from public.perfis_escola
    where id = p_professor and tipo = 'professor'
  ) then
    raise exception 'Professor não encontrado.';
  end if;

  update public.perfis_escola
     set bio = nullif(btrim(p_bio), '')
   where id = p_professor;

  -- Nulo quer dizer "não mexer na foto": a biografia grava-se sozinha, e
  -- passar aqui um nulo por engano não devia apagar o retrato.
  if p_foto_url is not null then
    update public.profiles set foto_url = p_foto_url where id = p_professor;
  end if;
end;
$$;

revoke execute on function public.definir_ficha_publica(uuid, text, text) from public, anon;
grant execute on function public.definir_ficha_publica(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Ler a ficha (qualquer pessoa, mesmo sem conta)
-- ---------------------------------------------------------------------

-- O wizard de pedir aula é público (0022), por isso a ficha também tem de
-- o ser — senão o "i" levava a uma página de login a meio da exploração.
--
-- Devolve o que já se via no cartão mais a biografia. Nada de email nem
-- telefone: quem quiser falar com o professor fala com a secretaria.
create or replace function public.professor_publico(p_professor uuid)
returns table (
  professor_id uuid,
  nome text,
  foto_url text,
  bio text,
  programa text,
  disciplinas text[]
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    p.id,
    p.nome,
    p.foto_url,
    pe.bio,
    pe.programa::text,
    coalesce(
      (
        select array_agg(
          i.nome || case when nullif(btrim(coalesce(pi.especialidade, '')), '') is null
                         then '' else ' (' || pi.especialidade || ')' end
          order by i.nome
        )
        from public.professor_instrumentos pi
        join public.instrumentos i on i.id = pi.instrumento_id
        where pi.professor_id = p.id
      ),
      array[]::text[]
    )
  from public.profiles p
  join public.perfis_escola pe on pe.id = p.id
  where p.id = p_professor and pe.tipo = 'professor';
$$;

grant execute on function public.professor_publico(uuid) to anon, authenticated;

-- A lista de escolha passa a trazer a biografia, para o "i" só aparecer
-- em quem tem alguma coisa para mostrar.
drop function if exists public.professores_publicos(bigint);
create or replace function public.professores_publicos(instrumento_id_param bigint)
returns table (
  professor_id uuid,
  nome text,
  foto_url text,
  especialidade text,
  tem_ficha boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.nome, p.foto_url, pi.especialidade,
         nullif(btrim(coalesce(pe.bio, '')), '') is not null as tem_ficha
  from professor_instrumentos pi
  join profiles p on p.id = pi.professor_id
  join perfis_escola pe on pe.id = pi.professor_id
  where pi.instrumento_id = instrumento_id_param
    and pe.tipo = 'professor';
$$;

grant execute on function public.professores_publicos(bigint) to anon, authenticated;

commit;
