-- "Super admin" — um nível acima de admin normal. Só quem tem esta flag
-- pode dar ou tirar admin a outras contas. Admins normais continuam com
-- acesso total ao resto (mensalidades, alunos, professores).
alter table profiles add column super_admin boolean not null default false;

update profiles set super_admin = true where email = 'jpamarcelino202@gmail.com';

-- Substitui a guarda anterior (que exigia só "admin") por "super_admin".
create or replace function public.impedir_auto_promocao_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.admin is distinct from old.admin then
    if not exists (select 1 from public.profiles where id = auth.uid() and super_admin) then
      raise exception 'Só um super admin pode alterar este campo.';
    end if;
  end if;
  return new;
end;
$$;

-- A policy de update em profiles também passa a exigir super_admin, não
-- só admin — mantém a base de dados consistente com a app mesmo que
-- alguém tente contornar a UI e chamar a API diretamente.
drop policy "Administradores atualizam professores (para gerir admins)" on profiles;

create policy "Super admins atualizam professores (para gerir admins)"
  on profiles for update
  to authenticated
  using (
    tipo = 'professor'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.super_admin)
  )
  with check (
    tipo = 'professor'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.super_admin)
  );
