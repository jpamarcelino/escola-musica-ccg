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
- `/pedir-aula` - publica - mobile - modo claro.
- `/login`, `/registo` e `/esqueci-password` - publicas - mobile - modo claro.
- `/professor/[professorId]` - publica - mobile - modo claro.
- `/instalar` - publica - mobile - modo claro.
- `/legal` e `/legal/[documento]` - publicas - mobile - modo claro (ja
  estavam implementadas; faltava a validacao visual, feita agora).

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

### Nota sobre `/pedir-aula`

Os cinco passos, os dois becos e o estado bloqueado, no sistema.

O `Wizard` e partilhado com `/aluno/[alunoId]/pedido`, que ainda nao esta
redesenhado. A prop `publico`, que ja existia para decidir o rodape
legal, passa a decidir tambem a moldura: o percurso autenticado fica
exatamente como estava. Redesenha-lo sem o conseguir ver seria adivinhar.

Pela mesma razao nao se tocou no `CartaoLink` nem no `ListaEscolhas` — o
percurso publico tem marcacao propria. O `CartaoLink` traz estilos
inline que o CSS nao sobrepoe sem `!important`, e o handoff pede para so
consolidar componentes depois de haver dois ou tres exemplos reais.

Progresso em cinco tracos em vez de bolas; escolhas ja feitas como
pastilhas de 44px em que se toca para voltar atras.

Tres armadilhas, todas so visiveis no browser:

- `.pinterest-pedido label { display: block }` apanhou os blocos da
  grelha de horarios, que SAO labels: desfez-lhes o flex em coluna e as
  duas horas colaram-se numa so, "10h10h50". A regra passou a excluir
  `.horario-bloco`;
- o cabecalho da marca vive fora do `<main>` e ficava numa faixa branca
  sobre o cinzento. Resolvido como o projeto ja resolvia para as paginas
  de papel: `body:has(.pinterest-publico-pagina)`;
- um professor sem foto ficava com uma caixa cinzenta vazia, que se le
  como imagem que nao carregou. Cai para a inicial.

### Nota sobre as paginas de autenticacao

As quatro — entrar, criar conta, recuperar e redefinir password —
partilham o involucro `.auth-pagina`, e sao as unicas que o usam. Por
isso passaram de uma vez: metade num sistema e metade noutro seria pior
do que qualquer um dos dois.

O trabalho foi quase todo em CSS. As regras vestem os componentes
partilhados (Cartao, Campo, BotaoPrimario) tendo o involucro por
ancestral, sem lhes tocar — sao usados por meia aplicacao.

Duas excepcoes, ambas assumidas:

- o `BotaoPrimario` leva a cor num estilo inline (o preto do sistema
  antigo) e um estilo inline so se vence com `!important`. A alternativa
  era dar-lhe uma variante, e ele e usado em toda a parte;
- o `Cartao` envolvia o formulario, que ja era o cartao: ficavam dois, um
  dentro do outro. O de fora e apagado por `div:has(> form)`.

Saiu a assinatura fixa no canto do ecra: numa pagina de formulario
sobrepunha-se ao conteudo em ecras baixos, e o rodape legal ja
identifica o Centro logo abaixo.

Uma armadilha, a terceira desta familia: `input { min-height: 50px }`
apanhou as caixas de seleccao das declaracoes do registo — que sao
inputs — e fez delas botoes enormes desalinhados do texto. A regra passou
a excluir `[type="checkbox"]`. E a mesma licao do `label` na grelha de
horarios: uma regra de formulario apanha sempre mais do que se pensa.

Havia tambem uma regra do sistema antigo, dentro de uma media query, a
repor `background: transparent` no formulario em ecra estreito. Fazia
sentido quando o cartao era uma folha translucida sobre papel; agora
deixava o formulario a flutuar sobre o cinzento.

O `/redefinir-password` nao recebeu `[x]`: exige uma sessao de
recuperacao e nao foi possivel ve-lo. Esta implementado e alinhado, e o
inventario di-lo.

### Nota sobre `/professor/[professorId]`

Cartao de identidade com retrato de 96px, disciplinas em pastilhas e a
apresentacao numa superficie propria — e a unica pagina publica com
conteudo escrito por outra pessoa, e isso merece uma folha so para si.

O retrato nao sangra o cartao de proposito: a largura toda fazia desta
pagina um perfil de rede social, e o que ela e continua a ser uma ficha
para decidir com quem se tem aulas. Sem fotografia, a inicial.

O vazio da apresentacao deixou de ser uma frase solta num ecra em
branco. Fica numa caixa tracejada e diz onde esta a informacao que ha
("as disciplinas que ensina estao acima") em vez de so constatar a
ausencia.

Uma armadilha: `min-height: 100dvh` no `<main>` alem do involucro
empurrava o rodape legal para fora do ecra numa pagina curta. So o
involucro precisa da altura.

### Nota sobre `/instalar`

Continua a usar o `PageHeader` e o `FundoPapel`, partilhados com a area
com sessao — as regras tem o involucro por ancestral e nao saem dele.

Os dois separadores passaram a um carril unico com pastilha deslizante,
como o seletor de alunos da Agenda: dois botoes soltos lado a lado nao
diziam que sao as duas metades da mesma escolha.

Os numeros dos passos ficaram em azul claro sobre branco. Quatro discos
de azul escuro seguidos pesavam mais do que o texto que numeram.

Terceira vez que apareceu um Cartao a envolver algo que ja era cartao —
depois das paginas de autenticacao e do formulario de pedido. Quando
houver mais uma, vale a pena um componente que saiba nao se repetir.

### As publicas estao fechadas

As dez estao no sistema, com uma ressalva: `/redefinir-password` esta
implementado mas nao foi visto, porque exige uma sessao de recuperacao.
Fica como o unico `[ ]` das publicas.

## Ordem de trabalho recomendada

1. Fechar o percurso familiar mobile claro: Agenda, Avisos, Conta, Gerir alunos, Mensalidades e paginas do aluno.
2. Consolidar componentes reutilizaveis apenas depois de existirem dois ou tres exemplos reais.
3. Fazer o percurso do professor mobile claro.
4. Fazer administracao mobile claro, adaptando a densidade ao trabalho operacional.
5. Rever e implementar desktop responsivo.
6. Criar modo escuro a partir dos componentes ja estabilizados.
7. Publicas concluidas, excepto validar `/redefinir-password` (precisa de uma sessao de recuperacao).

Proxima pagina sugerida: voltar ao percurso com sessao — `/aluno/[alunoId]`, que o handoff ja sugeria antes das publicas, ou a variante professor de `/dashboard`.

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
