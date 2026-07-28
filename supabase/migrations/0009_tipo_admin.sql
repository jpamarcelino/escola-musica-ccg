-- Novo tipo de conta "admin" — para pessoal da direção/secretaria que não
-- dá aulas. Ao contrário de professor/aluno, uma conta admin já nasce com
-- admin = true (a validação fica no código de convite, tal como já
-- acontece com o código de professor) — não precisa que outro admin a
-- promova depois.
alter table profiles drop constraint profiles_tipo_check;
alter table profiles add constraint profiles_tipo_check
  check (tipo in ('aluno', 'professor', 'admin'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, email, tipo, programa, data_nascimento, telefone, admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'tipo', 'aluno'),
    new.raw_user_meta_data ->> 'programa',
    case
      when new.raw_user_meta_data ->> 'data_nascimento' ~ '^\d{4}-\d{2}-\d{2}$'
        then (new.raw_user_meta_data ->> 'data_nascimento')::date
      else null
    end,
    new.raw_user_meta_data ->> 'telefone',
    coalesce(new.raw_user_meta_data ->> 'tipo', 'aluno') = 'admin'
  );
  return new;
end;
$$;

-- Os super admins passam a poder gerir também as contas admin (para as
-- poderem revogar mais tarde), não só professores.
drop policy "Super admins atualizam professores (para gerir admins)" on profiles;

create policy "Super admins atualizam professores e admins"
  on profiles for update
  to authenticated
  using (
    tipo in ('professor', 'admin')
    and exists (select 1 from profiles p where p.id = auth.uid() and p.super_admin)
  )
  with check (
    tipo in ('professor', 'admin')
    and exists (select 1 from profiles p where p.id = auth.uid() and p.super_admin)
  );
