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
- `/` - publica - mobile - modo claro.

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

### Ainda nao concluido nessa mesma rota

- `/dashboard` - variante professor;
- `/dashboard` - desktop;
- `/dashboard` - modo escuro;
- estados de outros papeis que possam usar a rota.

Todas as restantes paginas visiveis, incluindo as 10 paginas publicas, continuam pendentes ate serem marcadas no inventario. O facto de uma pagina estar funcional ou ter recebido um redesign noutra branch nao a torna concluida no Design Pinterest.

### Nota sobre `/`

A home publica passou ao sistema Pinterest. Saiu o carrossel editorial:
rodava sozinho de cinco em cinco segundos e mostrava uma escola de cada
vez, escondendo dois tercos da oferta. As tres cabem as tres no ecra.

Com isso a pagina deixou de precisar de um componente de cliente com
temporizador e estado — e e a pagina mais visitada do site.

As tres escolas sao cartoes brancos com a ilustracao numa caixa pastel de
64px (verde-agua, indigo, ambar — as mesmas dos acessos rapidos da Hoje),
nome, disciplinas, a frase que ja existia, e seta. Os destinos nao
mudaram: cada uma entra no assistente com o programa escolhido.

Duas armadilhas encontradas e resolvidas, ambas so visiveis no browser:

- a grelha do cartao com colocacao automatica mandava o nome para a
  coluna de 20px da seta, e o texto partia letra a letra. Todo o texto
  passou para um `span` unico em coluna, como `.pinterest-alunos` ja
  fazia;
- a 360px o cabecalho precisa de 357px e so tem 328: o "Criar conta"
  saia do ecra. A marca passou a encolher com `min-width: 0` e o nome
  corta com reticencias.

O rodape legal vive fora do `<main>` e apanhava o fundo do body; o
cinzento passou para um involucro que envolve os dois.

## Ordem de trabalho recomendada

1. Fechar o percurso familiar mobile claro: Agenda, Avisos, Conta, Gerir alunos, Mensalidades e paginas do aluno.
2. Consolidar componentes reutilizaveis apenas depois de existirem dois ou tres exemplos reais.
3. Fazer o percurso do professor mobile claro.
4. Fazer administracao mobile claro, adaptando a densidade ao trabalho operacional.
5. Rever e implementar desktop responsivo.
6. Criar modo escuro a partir dos componentes ja estabilizados.
7. Redesenhar e validar as restantes paginas publicas no mesmo sistema visual. A `/` ja esta; faltam nove.

Proxima pagina sugerida: `/pedir-aula`, que e para onde a `/` manda toda a gente. Em alternativa, `/aluno/[alunoId]` (variante familia/aluno) se o percurso com sessao voltar a ser prioridade.

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
- Conta, informacao legal e gerir alunos reescritos no sistema. A lista de
  alunos reutiliza `.pinterest-alunos` da Home de proposito: sao os mesmos
  alunos a dois toques de distancia. As setas de voltar das paginas legais
  passaram a recuar no historico (`components/voltar-atras.tsx`), porque
  ligacoes fixas mandavam quem vinha da Conta para o indice legal e dai
  para a Home.
