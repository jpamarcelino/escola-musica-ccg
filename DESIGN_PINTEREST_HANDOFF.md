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

Inclui:

- proxima aula;
- alunos associados a conta;
- gerir alunos;
- mensalidades;
- agenda;
- avisos;
- alertas contextuais quando existem dados reais.

A Agenda estabelece o padrao aprovado para listas cronologicas: cabecalho compacto, atalho branco com icone suave, data numa caixa azul clara e aulas em cartoes brancos. Foi validada a 360 px e 390 px com dados reais, sem overflow.

Avisos estabelece o padrao de caixa de entrada: cartoes brancos individuais, barra azul discreta para nao lidos, resumo curto e detalhe de leitura numa superficie branca separada. Lista, detalhe e acao contextual foram validados a 360 px e 390 px com dados reais.

### Ainda nao concluido nessa mesma rota

- `/dashboard` - variante professor;
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

Proxima pagina sugerida: `/dashboard/conta`.

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
