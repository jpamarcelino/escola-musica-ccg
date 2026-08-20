-- Saber, antes de criar a conta, se o email ou o telemóvel já estão em uso.
--
-- O email já era recusado — mas pelo Supabase, depois de o formulário ser
-- submetido, com uma mensagem em inglês ("User already registered"). O
-- telemóvel não era recusado por ninguém: duas contas com o mesmo número
-- é a secretaria a ligar para a pessoa errada.
--
-- Em `security definer` porque quem se regista ainda não tem sessão, e a
-- tabela `profiles` não é legível por anónimos — nem deve passar a ser.
-- Estas funções respondem sim ou não a uma pergunta concreta e não
-- devolvem uma única linha.
--
-- Isto diz a um desconhecido se um email tem conta na escola. É a mesma
-- informação que qualquer formulário de registo dá ao recusar o email, e
-- a alternativa — aceitar em silêncio e mandar um email a dizer "já
-- tinhas conta" — troca essa fuga por uma pessoa presa a olhar para um
-- ecrã que não explica o que correu mal.

begin;

create or replace function public.email_ja_registado(p_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where lower(email) = lower(btrim(p_email))
  );
$$;

-- Compara só os algarismos: "+351 912 345 678" e "912345678" são o mesmo
-- telemóvel, e guardá-los como diferentes era deixar entrar o duplicado
-- pela porta da pontuação.
--
-- Os últimos nove algarismos, e não todos, para o indicativo não fazer a
-- diferença — em Portugal o número tem nove.
create or replace function public.telefone_ja_registado(p_telefone text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where right(regexp_replace(coalesce(telefone, ''), '[^0-9]', '', 'g'), 9)
        = right(regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g'), 9)
      and length(regexp_replace(coalesce(telefone, ''), '[^0-9]', '', 'g')) >= 9
  );
$$;

grant execute on function public.email_ja_registado(text) to anon, authenticated;
grant execute on function public.telefone_ja_registado(text) to anon, authenticated;

commit;
