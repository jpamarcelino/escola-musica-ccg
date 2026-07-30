-- Permite explorar a escola (disciplinas, professores, horários) sem
-- conta — só se cria/entra numa Conta CCG no momento de enviar o pedido.
-- Só nome e foto de professor ficam públicos (sem email/telefone), por
-- isso a listagem de professores passa por uma função security definer
-- em vez de abrir profiles/professor_instrumentos a "anon" diretamente.

create policy "Visitantes veem instrumentos"
  on instrumentos for select
  to anon
  using (true);

create policy "Visitantes veem horários"
  on horarios for select
  to anon
  using (true);

create or replace function public.professores_publicos(instrumento_id_param bigint)
returns table (
  professor_id uuid,
  nome text,
  foto_url text,
  especialidade text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.nome, p.foto_url, pi.especialidade
  from professor_instrumentos pi
  join profiles p on p.id = pi.professor_id
  join perfis_escola pe on pe.id = pi.professor_id
  where pi.instrumento_id = instrumento_id_param
    and pe.tipo = 'professor';
$$;

grant execute on function public.professores_publicos(bigint) to anon, authenticated;
