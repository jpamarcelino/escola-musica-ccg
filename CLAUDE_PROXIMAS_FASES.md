# Handoff para as proximas fases

Este e o ponto de entrada para continuar o trabalho no projeto. Em caso de
conflito, este ficheiro prevalece sobre `REDESIGN_PLAN_V2.md` e sobre notas
antigas de `DESIGN_PINTEREST_HANDOFF.md`. O inventario detalhado e mantido em
`PAGINAS_POR_REDENHAR.md`.

## Contexto essencial

- Repositorio: `jpamarcelino/escola-musica-ccg`
- Branch de trabalho e publicacao: `design-pinterest`
- Pasta local: `/Users/jpamarcelino/Projetos/escola-musica-ccg-design-pinterest`
- Aplicacao Next.js: `apps/web`
- Producao: `https://escola-musica-ccg-jpamarcelino202-5591s-projects.vercel.app`
- Ultimo commit deste handoff: verificar com `git log -1 --oneline`
- Nunca trabalhar na `main` nem na `design-novo` para esta continuacao.

Antes de editar:

```bash
git switch design-pinterest
git pull --ff-only origin design-pinterest
git status --short --branch
```

Existem alteracoes de outros agentes, nomeadamente Claude. Nao reverter nem
reescrever trabalho existente. Ler o estado atual e continuar a partir dele.

## Objetivo do produto

Terminar uma PWA responsiva para as Escolas CCG, coerente em:

- familia/aluno;
- professor;
- secretaria/admin;
- super administracao;
- paginas publicas;
- mobile e desktop;
- modo claro e escuro.

A referencia visual principal e a Home atual. O produto deve sentir-se como
uma app iOS cuidada, com a clareza e familiaridade de uma app social, sem
copiar o Instagram. Preservar toda a logica, permissoes, dados reais e fluxos.

## Linguagem visual final

### Claro

- fundo cinzento muito claro;
- superficies brancas, contornos finos e sombras discretas;
- tipografia de sistema/Geist, nunca a serif editorial antiga;
- azul CCG para acao, foco e pequenos destaques;
- icones Lucide em caixas pastel funcionais;
- cartoes com hierarquia clara, sem cartoes dentro de cartoes;
- no desktop, navegacao lateral e coluna de conteudo ampla mas controlada;
  nao esticar interfaces mobile pela largura inteira.

### Escuro

- fundo `#131619`;
- superficie `#1D2227`;
- superficie elevada `#252B31`;
- linha `#343C44`;
- texto principal `#F7F8FA`;
- texto secundario `#B3BAC2`;
- azul CCG, ciano, verde, ambar, coral e violeta em icones/estados;
- fades azuis muito subtis apenas em elementos prioritarios;
- nunca grandes blocos brancos dentro do modo escuro;
- nunca texto escuro ou cinzento quase invisivel sobre cartoes escuros.

Evitar gradientes agressivos, preto absoluto dominante, glassmorphism,
bordas pretas grossas, decoracao gratuita, cards gigantes vazios e texto de
ajuda excessivo. O cartao da proxima aula usa um fade azul muito subtil, nao
um preenchimento azul ou preto.

## Regras de UI que nao podem voltar a falhar

1. Nada pode sobrepor, sair do contentor ou ficar cortado a 360, 390, 430,
   1024 e 1440 px.
2. Inputs, selects, datas, horas e botoes precisam de altura estavel, texto
   verticalmente centrado e `min-width: 0` dentro de flex/grid.
3. Uma grelha larga deve ter scroll dentro do proprio contentor; nunca criar
   overflow horizontal na pagina.
4. A navegacao inferior nao pode tapar conteudo; a lateral desktop nao pode
   sobrepor a pagina.
5. Back deve respeitar a origem. Usar contexto/query segura ou historico com
   fallback deterministico. Nunca criar loops entre duas paginas.
6. Em dark mode, testar contraste de todos os textos, placeholders, disabled,
   badges, tabelas, cards, modais, estados vazios e loading.
7. Nao usar fundos brancos residuais no modo escuro nem retangulos de cor
   causados por `background` aplicado ao texto.
8. Nao inventar numeros, alunos, aulas ou indicadores para preencher UI.
9. Confirmacoes destrutivas e promocao a admin exigem dialogo de confirmacao.
10. Uma pagina so esta concluida depois de testar estados reais e navegacao.

## Estado atual

O inventario atualizado esta em `PAGINAS_POR_REDENHAR.md`. Nao duplicar aqui
todas as rotas, porque esse ficheiro e a fonte de verdade.

Resumo:

- familia/aluno: segunda auditoria visual concluida nas 11 rotas principais,
  a 390 e 1440 px, claro e escuro;
- professor: todas as rotas visiveis receberam implementacao mobile,
  desktop e dark; varias continuam por validar com aulas, alunos, presencas,
  pedidos e mensalidades reais;
- secretaria: Home, conta, Musica para Bebes, alunos, professores,
  mensalidades, recomendacoes, mensagens, avisos e super administracao foram
  redesenhados; consultar o inventario para as variantes validadas;
- publicas: claro mobile esta largamente concluido; desktop/dark foram
  implementados recentemente, mas os fluxos de codigo de email e recuperacao
  ainda exigem links/codigos reais.

Validacao tecnica na ultima ronda:

- 311 testes passaram;
- typecheck passou;
- lint passou sem avisos;
- build de producao passou com 63 rotas.

Commits imediatamente anteriores a este documento:

- `7daea0b` - estados gerados de notificacoes;
- `a6e83b4` - auditoria dos fluxos familiares e regresso contextual.

## Proximas fases, por ordem

### Fase 1 - fechar validacoes com dados reais

Prioridade maxima. Nao redesenhar novamente paginas que ja estao boas.

1. Professor: Home e agenda com aulas reais.
2. Professor: horarios e edicao de horario ocupado/livre.
3. Professor: pedidos pendentes e proposta de outro horario.
4. Professor: chamada, por confirmar e historico individual com presencas.
5. Professor: alunos, ficha, mudanca de horario e desmatricula.
6. Professor: reposicoes com vagas reais e popup de remocao.
7. Professor: mensagens, materiais e mensalidades com dados preenchidos.
8. Musica para Bebes: turmas, lotacao, professores e pedidos reais.
9. Admin: mensagens e restantes listas com conteudo longo/estados reais.
10. Auth: confirmar email e redefinir password com codigo/link real.

Corrigir apenas problemas observados. Depois de cada fluxo, atualizar a linha
correspondente em `PAGINAS_POR_REDENHAR.md`.

### Fase 2 - E2E e regressao visual

Comecada. Playwright instalado em `apps/web`, com dois projetos (390 e
1440 px) e alvo configuravel:

```bash
pnpm --filter web test:e2e                          # producao
E2E_URL=http://localhost:3000 pnpm --filter web test:e2e
```

- `e2e/publico.spec.ts` — **60 testes a passar**. Cobre as 9 rotas
  publicas nos dois temas, overflow a 360/390/430/1440, erros de consola,
  o interruptor de tema (incluindo persistir ao recarregar e nao existir
  fora da home), o beco da idade no assistente, o reencaminhamento da
  password e o 404. Corre sem credenciais nenhumas.
- `e2e/autenticado.spec.ts` — esqueleto dos tres papeis, **saltado**
  enquanto nao houver credenciais no ambiente (`E2E_PROF_EMAIL`,
  `E2E_PROF_PASSWORD`, e o mesmo para `FAMILIA` e `ADMIN`). Saltar em vez
  de falhar e deliberado: uma suite vermelha por falta de configuracao
  ensina a ignorar o vermelho. Guardar as credenciais em `.env.e2e.local`
  (ja ignorado pelo git) ou exportar na shell — nunca no repositorio.

Duas licoes ja aprendidas nesta suite, para nao se repetirem:

- `addInitScript` volta a correr a cada navegacao, incluindo `reload()`.
  Usado para fixar o tema, reescrevia a escolha que o teste acabara de
  fazer. Onde se testa a persistencia, finge-se o `colorScheme` do sistema
  e deixa-se a app decidir.
- assercoes de consola contra producao tem de excluir o ruido de rede, ou
  falham sozinhas de vez em quando.

A verificacao do `next` do `/auth/confirm` NAO esta nos E2E: sem um token
valido a rota nunca chega a usa-lo. A funcao foi extraida para
`src/lib/auth/destino-seguro.ts` e tem testes unitarios proprios.

Falta ainda:

- login por papel e logout;
- familia: Hoje -> Alunos -> ficha -> voltar;
- familia: Agenda -> aluno -> horario/reposicao;
- professor: Hoje -> Presencas -> confirmar -> chamada;
- professor: aluno -> enviar material -> voltar;
- admin: alunos/professores -> dossier -> voltar;
- admin: pagamentos e recomendacoes;
- super admin: abrir utilizador e confirmar promocao;
- alternar claro/escuro e recarregar;
- navegacao mobile inferior e desktop lateral.

Adicionar capturas em 390 e 1440 px e verificar overflow, texto cortado,
fundos claros no dark e botoes fora do contentor. Nao depender apenas de
snapshots: validar destinos e estados funcionais.

### Fase 3 - acessibilidade e robustez

- foco visivel em teclado;
- nomes acessiveis para botoes apenas com icone;
- contraste WCAG em claro/escuro;
- dialogos com foco preso, Escape e restauracao de foco;
- alvos de toque com pelo menos 44 px;
- `prefers-reduced-motion`;
- mensagens de erro e sucesso anunciadas;
- campos com labels reais e erros associados;
- longos nomes, emails, telefones e valores sem quebrar layout.

Usar `web-design-guidelines` para a auditoria, mas manter a linguagem visual
ja aprovada. Nao transformar a app num design generico.

### Fase 4 - consolidacao do CSS

So depois da validacao visual:

- remover regras antigas realmente sem uso;
- consolidar tokens de claro/escuro e superficies repetidas;
- reduzir seletores globais demasiado abrangentes;
- preservar classes por papel quando o comportamento for diferente;
- procurar estilos inline que vencem o tema;
- nao fazer uma reescrita total nem alterar regras de negocio.

### Fase 5 - release final

1. Executar suite completa.
2. Rever `git diff` e garantir que nao ha segredos.
3. Confirmar migracoes Supabase pendentes.
4. Fazer commit pequeno e descritivo.
5. Push para `origin/design-pinterest`.
6. Publicar manualmente na Vercel.
7. Abrir producao em mobile e desktop, claro e escuro.
8. Fazer smoke test dos tres papeis.
9. Atualizar este ficheiro e `PAGINAS_POR_REDENHAR.md`.

## Contas de teste

- Aluno/familia: `contaaluno@ccg.pt`
- Professor: `contaprof@ccg.pt`
- Admin: `contaadmin@ccg.pt`
- Password das tres: pedir ao proprietario ou usar a credencial de teste ja
  fornecida fora do repositorio. Nao guardar passwords nem chaves neste ficheiro.

## Comandos

```bash
pnpm --filter web dev
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
```

Se a porta 3000 estiver ocupada por um processo antigo com erro, identificar o
processo e arrancar numa porta livre. Dizer sempre ao utilizador o URL exato.

Deploy de producao:

```bash
npx vercel --prod --yes
```

O deploy nao e automatico. Confirmar o estado com `npx vercel inspect` e abrir
o dominio de producao antes de afirmar que terminou. O deployment iniciado em
4 de setembro de 2026 ficou inicialmente em `UNKNOWN/Building`; confirmar no
painel/CLI se concluiu e nao criar deploys repetidos sem necessidade.

As migracoes Supabase nao sao aplicadas pelo deploy Vercel. A migracao
`supabase/migrations/0064_fixar_tipos_de_notificacao.sql` esta versionada, mas
deve ser confirmada/aplicada separadamente com acesso autorizado ao projeto.

## Disciplina de trabalho

- Ler primeiro, editar depois.
- Trabalhar por fluxo completo, nao por screenshots isolados.
- Fazer QA visual antes de dizer "feito".
- Nunca apagar alteracoes de outro agente.
- Nunca expor chaves Supabase ou tokens Vercel.
- Nao publicar sem ordem do utilizador, exceto quando ele pedir explicitamente
  commit/deploy.
- No fim de cada ronda, relatar: paginas tocadas, viewports/temas testados,
  testes executados, commit, deploy e itens ainda pendentes.

## Prompt curto para iniciar no Claude

> Continua o redesign na branch `design-pinterest`. Le primeiro
> `CLAUDE_PROXIMAS_FASES.md` e depois `PAGINAS_POR_REDENHAR.md`. Mantem o design
> atual, nao reverta trabalho existente e comeca pela primeira validacao
> pendente da Fase 1. Implementa, testa visualmente em 390 e 1440 px nos dois
> temas, atualiza o inventario e nao faças deploy sem eu pedir.
