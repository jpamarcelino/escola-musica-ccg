-- Aceitação versionada dos Termos.
--
-- Uma coluna booleana no perfil não serve. "Aceitou" sem dizer O QUÊ e
-- QUANDO não prova nada: quando os Termos mudarem, a coluna continua a
-- dizer true e ninguém sabe que versão a pessoa leu. O que tem de ficar
-- registado é o par (pessoa, versão concreta), com data.
--
-- O TEXTO não vive aqui — vive em apps/web/src/lib/legal, no controlo de
-- versões. Esta tabela guarda a identidade da versão e o `hash_texto`,
-- que é o que permite provar, anos depois, que o texto publicado nessa
-- versão era exatamente aquele.
--
-- Não se guarda IP, user-agent nem fingerprint. Nenhum deles é necessário
-- para provar a aceitação — a conta autenticada já identifica a pessoa —
-- e recolhê-los "porque sim" contraria a minimização do artigo 5.º.

begin;

create table documentos_legais (
  id bigint generated always as identity primary key,

  tipo text not null check (tipo in ('privacidade', 'termos', 'cookies', 'informacao')),
  versao text not null check (versao ~ '^[0-9]+\.[0-9]+$'),

  publicado_em date not null,
  em_vigor_em date not null,

  -- SHA-256 do texto publicado, em hexadecimal. É a âncora entre esta
  -- linha e o ficheiro: se o texto for editado sem subir a versão, o
  -- hash deixa de bater certo e a divergência aparece.
  hash_texto text not null check (hash_texto ~ '^[0-9a-f]{64}$'),

  -- Material = muda direitos ou obrigações, e exige nova aceitação.
  -- Editorial = correção de escrita, e basta avisar.
  alteracao_material boolean not null default false,

  -- Resumo das alterações, mostrado a quem tem de voltar a aceitar. Nulo
  -- na primeira versão, que não altera nada.
  resumo_alteracoes text check (resumo_alteracoes is null or char_length(resumo_alteracoes) <= 2000),

  ativo boolean not null default false,

  criado_em timestamptz not null default now(),

  unique (tipo, versao)
);

-- Só pode haver uma versão em vigor de cada documento. Sem isto, duas
-- linhas ativas fariam a app escolher uma ao acaso, e metade dos
-- utilizadores aceitava uma versão e metade a outra.
create unique index documentos_legais_um_ativo_por_tipo
  on documentos_legais (tipo) where ativo;

create table aceitacoes_legais (
  id bigint generated always as identity primary key,

  user_id uuid not null references profiles(id) on delete cascade,
  documento_id bigint not null references documentos_legais(id) on delete restrict,

  -- 'aceite' = declarou expressamente que aceita (Termos).
  -- 'visto'  = foi-lhe apresentado e fechou o aviso (Privacidade). Não é
  --            consentimento, e o nome diz isso — para ninguém, daqui a
  --            dois anos, apresentar um 'visto' como se fosse um 'aceite'.
  accao text not null check (accao in ('aceite', 'visto')),

  origem text not null check (origem in ('web', 'mobile')),

  criado_em timestamptz not null default now(),

  -- Uma pessoa aceita uma versão uma vez. Carregar duas vezes no botão
  -- não cria duas provas.
  unique (user_id, documento_id, accao)
);

create index aceitacoes_legais_user_idx on aceitacoes_legais (user_id);
create index aceitacoes_legais_documento_idx on aceitacoes_legais (documento_id);

alter table documentos_legais enable row level security;
alter table aceitacoes_legais enable row level security;

-- ---------------------------------------------------------------------
-- Quem vê o quê
-- ---------------------------------------------------------------------

-- Metadados de texto publicado não são dados pessoais. Quem não tem conta
-- precisa de ler a versão em vigor; quem tem conta precisa também das
-- antigas, para a app poder dizer "aceitaste a 1.0, está em vigor a 2.0".
create policy "Qualquer pessoa ve o documento em vigor"
  on documentos_legais for select
  to anon
  using (ativo);

create policy "Quem tem conta ve o historico de versoes"
  on documentos_legais for select
  to authenticated
  using (true);

-- Cada um vê as suas aceitações, e mais nada.
--
-- Não há policy para administradores de propósito. Um administrador não
-- precisa de ler à vontade quem aceitou o quê para gerir a escola; e no
-- dia em que o CCG tiver de provar uma aceitação concreta — uma
-- reclamação, um litígio — faz-se uma função `security definer` para
-- ESSE caso, com o âmbito estreito que ele exigir. Abrir agora um acesso
-- irrestrito é recolher poder que ninguém pediu.
create policy "Cada um ve as suas aceitacoes"
  on aceitacoes_legais for select
  to authenticated
  using (user_id = auth.uid());

create policy "Cada um regista as suas aceitacoes"
  on aceitacoes_legais for insert
  to authenticated
  with check (user_id = auth.uid());

-- Não há update nem delete. Uma prova de aceitação que se possa apagar ou
-- reescrever não é prova. Sai com a conta, por cascade, e mais nada.

-- ---------------------------------------------------------------------
-- Registar uma aceitação
-- ---------------------------------------------------------------------

-- A versão NUNCA vem do cliente. O cliente diz "aceito os Termos" e diz
-- que versão julga estar a aceitar; a função confirma contra a versão em
-- vigor na base e recusa se não bater certo. Sem isto, um pedido forjado
-- podia registar aceitação de uma versão antiga — ou de uma que não
-- existe — e fabricar prova de uma coisa que não aconteceu.
create or replace function public.registar_aceitacao(
  p_tipo text,
  p_versao text,
  p_accao text,
  p_origem text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc record;
  v_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Sem sessão.';
  end if;

  select * into v_doc
  from public.documentos_legais
  where tipo = p_tipo and ativo;

  if v_doc is null then
    raise exception 'Não há versão em vigor de %.', p_tipo;
  end if;

  if v_doc.versao <> p_versao then
    raise exception 'A versão em vigor de % é a %, não a %.', p_tipo, v_doc.versao, p_versao;
  end if;

  insert into public.aceitacoes_legais (user_id, documento_id, accao, origem)
  values (auth.uid(), v_doc.id, p_accao, p_origem)
  on conflict (user_id, documento_id, accao) do update
    set accao = excluded.accao
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.registar_aceitacao(text, text, text, text) from public, anon;
grant execute on function public.registar_aceitacao(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- O que falta a quem entrou
-- ---------------------------------------------------------------------

-- Uma chamada só, para o layout não ter de fazer três consultas em cada
-- página. Diz se há Termos por aceitar (bloqueia) e se há Política por
-- ver (não bloqueia).
create or replace function public.estado_legal_da_conta()
returns table (
  termos_versao text,
  termos_por_aceitar boolean,
  termos_resumo text,
  privacidade_versao text,
  privacidade_por_ver boolean
)
language sql
security definer
stable
set search_path = ''
as $$
  with t as (select * from public.documentos_legais where tipo = 'termos' and ativo),
       p as (select * from public.documentos_legais where tipo = 'privacidade' and ativo)
  select
    t.versao,
    not exists (
      select 1 from public.aceitacoes_legais a
      where a.user_id = auth.uid() and a.documento_id = t.id and a.accao = 'aceite'
    ),
    t.resumo_alteracoes,
    p.versao,
    not exists (
      select 1 from public.aceitacoes_legais a
      where a.user_id = auth.uid() and a.documento_id = p.id and a.accao = 'visto'
    )
  from t, p;
$$;

revoke execute on function public.estado_legal_da_conta() from public, anon;
grant execute on function public.estado_legal_da_conta() to authenticated;

commit;
