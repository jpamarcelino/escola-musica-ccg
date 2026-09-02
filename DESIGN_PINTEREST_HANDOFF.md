# Design Pinterest - guia de continuidade

Este documento e `PAGINAS_POR_REDENHAR.md` sao a memoria persistente do redesign. Atualizar ambos no fim de cada pagina concluida.

## Ponto de partida

- Repositorio: `jpamarcelino/escola-musica-ccg`
- Branch: `design-pinterest`
- Base original: `main` no commit `2570987`
- Aplicacao: PWA Next.js em `apps/web`
- Primeiro redesign: `/dashboard`, conta de familia/aluno, mobile e modo claro
- Commit estrutural de referencia: `d9b22d2`
- Acabamento aprovado do cartao da proxima aula: `067da9d`
- Producao: `https://escola-musica-ccg.vercel.app`

Nao continuar na branch `design-novo`. Essa branch pertence a uma tentativa visual anterior.

## Direcao aprovada

O produto deve parecer uma aplicacao iOS simples e cuidada, com alguma familiaridade do Instagram, sem copiar nenhuma das duas interfaces. A referencia aprovada e a pagina Hoje da conta familiar na branch `design-pinterest`.

Principios:

- mobile primeiro e modo claro primeiro;
- fundo cinzento muito claro, superficies brancas e hierarquia por tamanho e espacamento;
- tipografia de sistema Apple/Geist, direta, sem estilo editorial antigo;
- cantos suaves, sombras discretas e contornos finos;
- icones Lucide em caixas pequenas com cores funcionais suaves;
- a informacao mais importante aparece primeiro;
- dados reais da aplicacao, sem estatisticas ou conteudo inventado;
- linguagem curta, natural e em portugues;
- navegacao inferior preservada e conteudo com espaco suficiente para nunca ficar tapado;
- nada deve ficar cortado a 360 px, 390 px ou 430 px.

## Padrao visual aprovado

A pagina Hoje e a fonte de verdade. Em particular:

- cabecalho simples com saudacao, subtitulo curto e avatar com inicial;
- titulo de seccao a cerca de 21 px, texto principal compacto e legivel;
- cartoes brancos com raio aproximado de 20-25 px;
- sombras com baixa opacidade, sem linhas pretas grossas;
- cartao de destaque tambem branco;
- destaque da proxima aula com um fade azul muito subtil: azul do logotipo `#78AEDE` a 16% no inicio, 5% antes do meio e branco no restante cartao;
- texto do destaque continua escuro; o azul nao deve preencher todo o cartao;
- cor primaria escura `#1B4F7A`, azul medio `#3D7FB8` e azul do logotipo `#78AEDE`;
- grelha de acessos rapidos 2 x 2, com alvos de toque confortaveis;
- animacao apenas funcional e discreta, respeitando `prefers-reduced-motion`.

CSS de referencia: bloco `.pinterest-home` em `apps/web/src/app/globals.css`.

## O que evitar

- cartoes pretos ou grandes massas de cor;
- gradientes fortes, brilho, glassmorphism ou decoracao gratuita;
- estilo editorial da antiga branch `design-novo`;
- bordas pretas grossas;
- excesso de texto explicativo dentro da interface;
- cartoes dentro de cartoes;
- numeros, indicadores ou promessas sem dados reais;
- alterar regras de negocio para facilitar o redesign;
- declarar uma pagina concluida sem a testar com dados reais.

## Definicao de pagina concluida

Uma pagina so recebe `[x]` quando:

1. Todo o estado visual da variante indicada foi redesenhado.
2. Loading, vazio, erro, sucesso, disabled, foco e conteudo longo foram considerados quando existirem.
3. Os fluxos e permissoes anteriores continuam a funcionar.
4. Foi testada com a conta adequada e dados reais.
5. Foi verificada a 360 px, 390 px e 430 px, sem overflow, cortes ou elementos tapados pela navegacao.
6. `pnpm --filter web lint`, `pnpm --filter web typecheck` e o build relevante passam.
7. A pagina foi inspecionada visualmente no browser.
8. O inventario foi atualizado com commit, variante e observacoes.

Mobile claro, desktop e modo escuro sao entregas diferentes. Concluir uma nao conclui automaticamente as outras.

## Estado aprovado ate agora

### Concluido

- `/dashboard` - conta familia/aluno - mobile - modo claro.
- `/dashboard/agenda` - conta familia/aluno - mobile - modo claro (`f9c973c`).
- `/dashboard/avisos` - conta familia/aluno - mobile - modo claro (`5c12018`).
- `/dashboard/avisos/[avisoId]` - conta familia/aluno - mobile - modo claro (`5c12018`).
- `/dashboard/mensalidades` - variante familia - mobile - modo claro (`fc4402d`, estado vazio finalizado em `754460e`).
- `/dashboard/conta/avancado` - familia/aluno - mobile - modo claro (`f3131bf`).
- `/dashboard/reposicoes/pedidos` - professor - mobile - modo claro (`f3131bf`).

Inclui:

- proxima aula;
- alunos associados a conta;
- gerir alunos;
- mensalidades;
- agenda;
- avisos;
- alertas contextuais quando existem dados reais.

A Agenda estabelece o padrao aprovado para listas cronologicas: cabecalho compacto, atalho branco com icone suave, data numa caixa azul clara e aulas em cartoes brancos. Foi validada a 360 px e 390 px com dados reais, sem overflow.

Avisos estabelece o padrao de caixa de entrada: titulo de seccao e contagem, cartoes brancos individuais, icone contextual, titulo do tipo de aviso, barra azul discreta para nao lidos e resumo a 14 px. Mesmo os avisos lidos mantem contraste e presenca; nao reduzir toda a hierarquia apenas para os tornar secundarios. O detalhe vive numa superficie branca separada. Lista, detalhe e acao contextual foram validados a 360 px e 390 px com dados reais.

Mensalidades estabelece o padrao para resumo financeiro familiar: um resumo mensal destacado mas leve, seletor horizontal de meses e estados de pagamento em superficies brancas. O estado real sem mensalidades foi tratado como parte integral da pagina, com mensagem e nota informativa separadas. Foi validada autenticada a 360 px e 390 px, sem overflow horizontal da pagina.

Cancelamentos e transferencias agrupa cada decisao rara numa superficie branca propria, com consequencias legiveis e perigo reservado para a eliminacao da conta. Marcar reposicao usa uma hierarquia operacional: pedidos primeiro e formulario manual em destaque azul subtil. Ambas foram validadas autenticadas a 360 px, 390 px e 430 px, sem overflow horizontal; na conta de professor foi validado o estado real sem pedidos e o formulario manual completo.

A Home do professor foi implementada e publicada em `f82337d`. Mantem a linguagem da Home familiar, mas ordena o trabalho do professor: presencas urgentes, proxima aula, acessos frequentes e gestao. O estado real sem horarios, a navegacao completa e a responsividade foram validados a 360 px, 390 px e 430 px. Falta validar visualmente o cartao com aulas reais antes de marcar a variante como concluida.

### Ainda nao concluido nessa mesma rota

- `/dashboard` - variante professor com aulas reais (a implementacao e o estado vazio ja estao validados);
- `/dashboard/agenda` - variante professor (implementada, por validar com uma conta de professor com aulas);
- `/dashboard` - desktop;
- `/dashboard` - modo escuro;
- estados de outros papeis que possam usar a rota.

Todas as restantes paginas visiveis, incluindo as 10 paginas publicas, continuam pendentes ate serem marcadas no inventario. O facto de uma pagina estar funcional ou ter recebido um redesign noutra branch nao a torna concluida no Design Pinterest.

## Ordem de trabalho recomendada

1. Fechar o percurso familiar mobile claro: Agenda, Avisos, Conta, Gerir alunos, Mensalidades e paginas do aluno.
2. Consolidar componentes reutilizaveis apenas depois de existirem dois ou tres exemplos reais.
3. Fazer o percurso do professor mobile claro.
4. Fazer administracao mobile claro, adaptando a densidade ao trabalho operacional.
5. Rever e implementar desktop responsivo.
6. Criar modo escuro a partir dos componentes ja estabilizados.
7. Redesenhar e validar as 10 paginas publicas no mesmo sistema visual; nenhuma esta atualmente concluida no Design Pinterest.

Proxima pagina sugerida: `/aluno/[alunoId]` (variante familia/aluno).

### Nota sobre `/aluno/[alunoId]/reposicao/[aulaId]`

O pedido de reposicao do aluno foi refeito no sistema Pinterest em `703dd56`: resumo da aula desmarcada, aviso de disponibilidade, vagas como alvos de toque completos, mensagem opcional e acoes finais claras. Lint, typecheck e build passam e a versao esta publicada. A conta de teste nao tem uma aula desmarcada com `reposicao_estado = sem_pedido`; a propria rota redireciona corretamente nesses casos. Falta apenas a inspecao visual autenticada a 360, 390 e 430 px quando existir um caso elegivel, por isso ainda nao recebeu `[x]`.

### Nota sobre `/dashboard/conta`

A pagina foi reescrita no sistema Pinterest (cabecalho compacto, cartao de
identidade, uma seccao por assunto e listas de ligacoes para os destinos
raros). Lint, typecheck e build passam.

Nao recebeu `[x]`: os pontos 4 e 8 da definicao de concluida — testar com
a conta adequada e inspecionar no browser — exigem sessao iniciada, e o
agente que a escreveu nao entra em contas do dono do projeto. Falta
percorre-la autenticado a 360, 390 e 430 px e confirmar os formularios de
nome, NIF, email e password antes de a marcar.

## Processo por pagina

1. Ler a pagina atual e os componentes partilhados que usa.
2. Identificar papeis, estados, acoes e dados reais.
3. Definir hierarquia antes de alterar CSS.
4. Implementar apenas a superficie escolhida.
5. Testar comportamento e responsividade.
6. Fazer commit pequeno e descritivo.
7. Atualizar `PAGINAS_POR_REDENHAR.md` e este documento.
8. Publicar apenas quando o dono do projeto pedir.

## Prompt de continuidade

Usar algo proximo deste texto com outro agente:

> Trabalha no repositorio `jpamarcelino/escola-musica-ccg`, branch `design-pinterest`. Le primeiro `DESIGN_PINTEREST_HANDOFF.md` e `PAGINAS_POR_REDENHAR.md`. A fonte visual aprovada e `/dashboard` na variante familia/aluno, mobile e modo claro, especialmente o commit `067da9d`. Continua pela primeira pagina pendente da ordem recomendada. Nao alteres regras de negocio. So marques uma pagina concluida depois de cumprir a definicao de concluida e atualiza os dois documentos no fim.

## Registo de decisoes

- `d9b22d2`: nova estrutura da Home familiar mobile.
- `61ad8c1`: experiencia rejeitada; cartao inteiro azul ficou demasiado pesado. Nao repetir.
- `067da9d`: solucao aprovada; cartao branco com fade azul subtil.
- `f9c973c`: Agenda familiar mobile clara, com o padrao de lista cronologica aprovado.
- `5c12018`: lista e detalhe de Avisos da familia, mobile claro.
- `0e1940f`: reforco de hierarquia na lista de Avisos depois de validar o estado com apenas um aviso lido.
- `703dd56`: pedido de reposicao do aluno redesenhado; aguarda um caso real elegivel para validacao visual final.
- `f82337d`: Home do professor mobile clara; publicada e validada sem horarios, aguarda dados de aulas reais para fechar.
- Conta, informacao legal e gerir alunos reescritos no sistema. A lista de
  alunos reutiliza `.pinterest-alunos` da Home de proposito: sao os mesmos
  alunos a dois toques de distancia. As setas de voltar das paginas legais
  passaram a recuar no historico (`components/voltar-atras.tsx`), porque
  ligacoes fixas mandavam quem vinha da Conta para o indice legal e dai
  para a Home.

## Agenda do professor

A rota `/dashboard/agenda` serve duas paginas diferentes: a familiar
(`agenda-familia.tsx`) e a do professor (`page.tsx`). A do professor herda
o mesmo esqueleto `.pinterest-agenda` e a mesma lista cronologica
`.pinterest-agenda-dias`, com tres diferencas proprias, no bloco
`.pinterest-agenda-professor`:

- a linha diz primeiro a disciplina e so depois os alunos, a hora e a
  sala — quem ensina duas disciplinas ao mesmo aluno precisa de as
  distinguir onde prepara o dia;
- a contagem de alunos passou a ser um numero num quadrado cinzento e so
  aparece em aula de grupo: com um aluno repetia o nome da linha de cima;
- "Desmarcar o dia" e uma pilula pequena de contorno no cabecalho de cada
  data, e nao um botao editorial — repete-se por cada dia, e so existe em
  musica (as unicas aulas com reposicao) e em dias com aulas da grelha
  semanal.

A grelha semanal deixou de ser um `<details>` de texto sublinhado: e um
cartao branco com icone, que abre encostado a grelha (cantos de cima
quadrados quando aberta) e nao um segundo cartao dentro do primeiro. Os
blocos da grelha usam o azul suave `#e7f1fa` em vez do papel bege.
