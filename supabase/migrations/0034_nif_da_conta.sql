-- O NIF de quem paga.
--
-- A escola emite faturas, e uma fatura sem contribuinte não serve a quem
-- a recebe: sem NIF não há dedução de despesas de educação no IRS. Até
-- aqui pedia-se por fora — num papel na secretaria, no melhor dos casos
-- — e a app não sabia dele.
--
-- Fica em `profiles`, ou seja na Conta CCG, e não em `alunos`: quem
-- paga é o titular da conta, é a ele que a fatura sai, e é ele que está
-- à frente do ecrã no momento do registo. Um NIF por aluno seria outra
-- coisa (e é uma pergunta legítima para famílias que declaram as
-- despesas de cada filho com o NIF dele) — mas essa mudança pede um
-- campo por perfil de aluno, e não foi o que se pediu.
--
-- Anulável, ao contrário do formulário de registo, que passa a exigi-lo:
-- as contas que já existem não têm NIF nenhum, e uma coluna NOT NULL
-- obrigava a inventar um valor para todas elas. O painel da secretaria
-- mostra quem está em falta.

begin;

alter table profiles add column nif text;

-- Nove algarismos, sem espaços nem pontuação: a normalização é feita
-- antes de gravar. O dígito de controlo é verificado na app (validarNIF)
-- — aqui fica a forma, que é o que impede lixo na coluna.
alter table profiles add constraint profiles_nif_formato
  check (nif is null or nif ~ '^[0-9]{9}$');

-- O registo passa a trazer o NIF nos metadados, como já traz o nome e o
-- telefone. O resto da função é igual à da 0025.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text := new.raw_user_meta_data ->> 'convite_codigo';
  v_convite record;
  v_tem_convite boolean := false;
  v_tipo text := 'conta';
  v_programa text := null;
  v_admin boolean := false;
begin
  if v_codigo is not null then
    select * into v_convite from public.convites
      where codigo = v_codigo and usado_em is null
      for update;

    v_tem_convite := found;

    if v_tem_convite then
      if v_convite.tipo = 'professor' then
        v_tipo := 'professor';
        v_programa := v_convite.programa;
      elsif v_convite.tipo = 'admin' then
        v_tipo := 'admin';
        v_admin := true;
      end if;
    end if;
  end if;

  insert into public.profiles (id, nome, email, telefone, nif)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.email,
    new.raw_user_meta_data ->> 'telefone',
    -- nullif para o caso de vir string vazia dos metadados: '' não passa
    -- na constraint, e um registo não pode falhar por causa disso.
    nullif(new.raw_user_meta_data ->> 'nif', '')
  );

  insert into public.perfis_escola (id, tipo, programa, admin)
  values (new.id, v_tipo, v_programa, v_admin);

  if v_tem_convite then
    update public.convites set usado_por = new.id, usado_em = now() where id = v_convite.id;
  end if;

  if v_tem_convite then
    if v_convite.tipo = 'migracao_aluno' then
      update public.alunos
        set encarregado_id = new.id, propria_conta_id = new.id
        where id = v_convite.aluno_id;
    end if;
  end if;

  return new;
end;
$$;

commit;
