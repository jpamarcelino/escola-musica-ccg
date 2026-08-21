-- A versão 1.0 dos quatro documentos, e a aceitação registada no registo.
--
-- Os hashes vêm de apps/web/src/lib/legal/hash.test.ts, que os fixa. Se
-- alguém editar o texto sem subir a versão, o teste falha; se editar e
-- subir a versão sem publicar aqui uma linha nova, a app mostra uma
-- versão que a base não conhece. As duas pontas têm de andar juntas.
--
-- `em_vigor_em` fica a 2026-08-21, a data de elaboração. A Direção ainda
-- não fixou data de entrada em vigor — quando fixar, faz-se um update, e
-- é por isso que a coluna existe em vez de a data estar no texto.

begin;

insert into documentos_legais
  (tipo, versao, publicado_em, em_vigor_em, hash_texto, alteracao_material, ativo)
values
  ('privacidade', '1.0', date '2026-08-21', date '2026-08-21',
   '57ffd4c385a8027ac0306911a22b429f59fcc1a4c49f6de91f31282057f6b272', false, true),
  ('termos', '1.0', date '2026-08-21', date '2026-08-21',
   'f27120157014f25c9cda13995562feff2fd395a14e286f7acf8e1dfbc8ad5e11', false, true),
  ('cookies', '1.0', date '2026-08-21', date '2026-08-21',
   'a7cabd78f558c28877c8d38e09db1f6040acf1b13f2cab7e2358b23504574195', false, true),
  ('informacao', '1.0', date '2026-08-21', date '2026-08-21',
   'b66252edd295c12ee062798a4a414776636d6525c0a609b18f5308a7d07f56da', false, true);

-- ---------------------------------------------------------------------
-- A aceitação, registada no momento em que a conta nasce
-- ---------------------------------------------------------------------
--
-- Porquê no trigger e não numa ação da app: com confirmação de email
-- ativa, o signUp não devolve sessão. A pessoa aceita os Termos, sai do
-- formulário, e só volta horas depois pelo link do email — e nesse
-- intervalo não há `auth.uid()` para chamar `registar_aceitacao`. A prova
-- ficava por registar, ou registada mais tarde com a data errada.
--
-- A versão vem dos metadados, mas NÃO se confia nela: compara-se com a
-- versão em vigor na base. Os metadados são escritos pelo servidor (a
-- ação lê a versão da base antes do signUp), e esta segunda verificação
-- fecha a porta a um signUp feito diretamente contra a API do Supabase
-- com uma versão inventada.
--
-- O resto da função é igual à da 0034.
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
  v_versao_pedida text := new.raw_user_meta_data ->> 'termos_versao';
  v_termos record;
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
    nullif(new.raw_user_meta_data ->> 'nif', '')
  );

  insert into public.perfis_escola (id, tipo, programa, admin)
  values (new.id, v_tipo, v_programa, v_admin);

  -- A aceitação dos Termos.
  --
  -- Ausente: não se regista nada, e a pessoa apanha o ecrã de aceitação
  -- no primeiro login. É o caminho das contas criadas fora do formulário
  -- (consola do Supabase, scripts de administração) — recusá-las aqui
  -- partia a criação de contas pela secretaria sem ganho nenhum.
  --
  -- Presente mas diferente da versão em vigor: RECUSA-SE o registo. Uma
  -- versão que não é a que está publicada só pode vir de um pedido
  -- forjado, e registar isso fabricava prova falsa.
  if v_versao_pedida is not null then
    select * into v_termos
    from public.documentos_legais
    where tipo = 'termos' and ativo;

    if v_termos is null or v_termos.versao <> v_versao_pedida then
      raise exception 'Versão dos Termos inválida.';
    end if;

    insert into public.aceitacoes_legais (user_id, documento_id, accao, origem)
    values (new.id, v_termos.id, 'aceite', 'web');
  end if;

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
