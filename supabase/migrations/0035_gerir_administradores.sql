-- Dar e tirar acesso de administração, uma pessoa de cada vez.
--
-- Até aqui isto era uma lista de caixas com todos os professores da
-- escola e um botão "Guardar administradores" no fim: para promover uma
-- pessoa, percorriam-se dezoito nomes; e cada gravação reescrevia a
-- coluna `admin` de toda a gente, o que faz de um clique distraído uma
-- despromoção em massa.
--
-- Passa a ser uma operação sobre uma pessoa só, com nome e id. E deixa
-- de estar limitada a professores: quem trata da secretaria pode não dar
-- aulas nenhumas, e a policy de RLS de 0021 só deixava mexer em linhas
-- de tipo 'professor' ou 'admin' — a Dona Lena, com uma Conta CCG
-- normal, não podia ser promovida de lado nenhum.
--
-- Em `security definer` porque a autorização não é "quem é dono da
-- linha" (nenhuma policy de RLS exprime isto bem): é "quem chama tem de
-- ser super administrador", mais duas regras que não se escrevem numa
-- policy — ninguém se despromove a si próprio, e um super administrador
-- não se despromove daqui.

begin;

create or replace function public.definir_administrador(
  p_user_id uuid,
  p_admin boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_alvo record;
begin
  if v_quem is null then
    raise exception 'Sem sessão.';
  end if;

  if not eh_super_admin() then
    raise exception 'Só um super administrador pode gerir administradores.';
  end if;

  -- A regra que existia na lista antiga ("não te consegues desmarcar a
  -- ti próprio") vive agora aqui, onde não depende de o ecrã se lembrar
  -- dela. Sem isto, um super administrador podia fechar-se fora da sua
  -- própria escola com um clique.
  if p_user_id = v_quem then
    raise exception 'Não podes alterar o teu próprio acesso.';
  end if;

  select pe.id, pe.super_admin into v_alvo
  from perfis_escola pe
  where pe.id = p_user_id;

  if not found then
    raise exception 'Pessoa não encontrada.';
  end if;

  -- Um super administrador é administrador por definição. Tirar-lhe a
  -- marca aqui deixava a app a dizer uma coisa e a base de dados a
  -- fazer outra.
  if v_alvo.super_admin and p_admin is false then
    raise exception 'Um super administrador não pode ser removido da administração.';
  end if;

  update perfis_escola set admin = p_admin where id = p_user_id;
end;
$$;

grant execute on function public.definir_administrador(uuid, boolean) to authenticated;

commit;
