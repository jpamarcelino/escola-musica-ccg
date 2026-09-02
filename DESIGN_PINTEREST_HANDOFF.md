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

## Fundacao desktop

A estrutura desktop autenticada foi iniciada em setembro de 2026. O componente
partilhado `BottomNavigation` conserva a barra inferior ate 1023 px e passa a
uma navegacao lateral fixa a partir de 1024 px. Os layouts de `/dashboard`,
`/aluno/[alunoId]` e `/aluno/(gerais)` reservam agora a coluna da navegacao sem
alterar a composicao mobile.

Padrao base:

- lateral escura de 232-240 px, com marca, icones, rotulos e pagina ativa;
- margem exterior de 20-28 px e area de trabalho sobre `#F5F6F8`;
- conteudo começa depois da lateral, sem sobreposicao;
- breakpoint desktop em 1024 px; tablets e telemoveis mantêm a navegacao inferior;
- este passo conclui apenas a moldura. Cada pagina continua pendente em desktop
  ate receber composicao propria e validacao a 1024, 1440 e largura ampla.

## Estado aprovado ate agora

### Concluido

- `/dashboard` - conta familia/aluno - mobile - modo claro.
- `/dashboard/agenda` - conta familia/aluno - mobile - modo claro (`f9c973c`).
- `/dashboard/avisos` - conta familia/aluno - mobile - modo claro (`5c12018`).
- `/dashboard/avisos/[avisoId]` - conta familia/aluno - mobile - modo claro (`5c12018`).
- `/dashboard/mensalidades` - variante familia - mobile - modo claro (`fc4402d`, estado vazio finalizado em `754460e`).
- `/dashboard/conta/avancado` - familia/aluno - mobile - modo claro (`f3131bf`).
- `/dashboard/reposicoes/pedidos` - professor - mobile - modo claro (`f3131bf`).
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

Cancelamentos e transferencias agrupa cada decisao rara numa superficie branca propria, com consequencias legiveis e perigo reservado para a eliminacao da conta. Marcar reposicao usa uma hierarquia operacional: pedidos primeiro e formulario manual em destaque azul subtil. Ambas foram validadas autenticadas a 360 px, 390 px e 430 px, sem overflow horizontal; na conta de professor foi validado o estado real sem pedidos e o formulario manual completo.

A Home do professor foi implementada e publicada em `f82337d`. Mantem a linguagem da Home familiar, mas ordena o trabalho do professor: presencas urgentes, proxima aula, acessos frequentes e gestao. O estado real sem horarios, a navegacao completa e a responsividade foram validados a 360 px, 390 px e 430 px. Falta validar visualmente o cartao com aulas reais antes de marcar a variante como concluida.

A entrada de Presencas do professor foi implementada e publicada em `60ca4c7`. O estado real sem pendencias usa um resumo verde suave e dois destinos brancos para rever confirmacoes e consultar historico. Foi validada autenticada a 360 px, 390 px e 430 px, sem overflow. Falta validar o resumo acionavel quando existirem aulas por confirmar antes de receber `[x]`.

O fluxo seguinte de Presencas foi implementado e publicado em `890059f`. `/dashboard/presencas/confirmar` separa atrasos e aulas de hoje em cartoes acionaveis; o estado vazio real foi validado a 360 px, 390 px e 430 px. `/dashboard/presencas/[horarioId]` transforma a chamada numa lista de alunos com tres escolhas grandes e botao bloqueado ate estar completa. A conta de teste nao tem horarios, portanto a chamada individual e os cartoes com pendencias aguardam dados reais para a inspecao visual final.

Depois de feedback de falta de clareza, a chamada individual foi revista em `8d4c9ca`: o titulo passou a explicar a tarefa, o progresso ganhou barra visual e cada estado e agora uma linha larga com icone, nome e explicacao (`Presente / Veio a aula`, `Falta avisada / Avisou antes`, `Sem aviso / Nao avisou`). As tres cores so ganham peso depois da selecao.

O Historico de Presencas e o detalhe por aluno foram implementados e publicados em `24cb560`. O indice usa um cartao por aluno com contagem discreta; o detalhe abre com percentagem de presencas e agrupa os registos por mes, usando verde, amarelo e vermelho apenas nos estados. O estado vazio do indice foi validado autenticado a 360 px, 390 px e 430 px. A conta de teste nao tem alunos, por isso as listas preenchidas e o detalhe individual aguardam dados reais.

A lista de alunos do professor foi implementada e publicada em `c4891d5`. Mantem o cabecalho compacto da area do professor e apresenta cada aluno como um cartao acionavel, com inicial, disciplina, horario e idade quando existirem. O estado vazio real foi validado autenticado a 360 px, 390 px e 430 px, sem overflow. A lista preenchida aguarda uma conta com alunos reais para a inspecao visual final.

A ficha individual e o envio de materiais foram redesenhados e publicados em `d88398b`. A ficha organiza dados, contactos, proposta de novo horario, historico de materiais e desmatricula em superficies separadas; a confirmacao destrutiva usa o dialogo movel Pinterest. O envio de materiais ganhou seletor segmentado Video/Partitura, formulario, preview e selecao de destinatarios na mesma linguagem. O estado vazio de `/dashboard/enviar-material` foi validado autenticado em producao; os formularios preenchidos, a ficha e os dialogos aguardam alunos reais para a inspecao visual final.

As Mensagens do professor foram redesenhadas e publicadas em `7bce7b4`. A composicao separa destinatarios, mensagem e pre-visualizacao, usa seletores segmentados e reserva o azul da marca para a acao final; o historico passa a uma lista de cartoes leves. O estado vazio foi validado autenticado em producao. A composicao e o historico preenchidos aguardam uma conta com alunos reais para a inspecao visual final.

As Mensalidades do professor foram redesenhadas e publicadas em `7d84fb0`. O extrato abre com meses em scroll horizontal, valor por receber, total previsto e contadores; os movimentos usam um cartao por aluno e cor apenas no estado financeiro. O resumo, a navegacao mensal, a nota do Programa de Recomendacao e o estado vazio foram validados autenticados em producao. Os movimentos preenchidos aguardam matriculas reais para a inspecao visual final.

A gestao de Reposicoes do professor foi redesenhada e publicada em `7d3c980`. A pagina prioriza pedidos, depois a abertura de uma vaga e so depois as listas de vagas disponiveis e ocupadas. O formulario, a ligacao aos pedidos e o estado vazio foram validados autenticados em producao; vagas reais e o dialogo de remocao aguardam dados para a inspecao visual final.

### Ainda nao concluido nessa mesma rota

- `/dashboard` - variante professor com aulas reais (a implementacao e o estado vazio ja estao validados);
- `/dashboard/agenda` e `/dashboard/agenda/[horarioId]` - variante professor (implementadas, por validar com uma conta de professor com aulas);
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

Do que ele faz, uma metade ja se pode ver: sem sessao de recuperacao a
rota reencaminha para `/esqueci-password`, e isso foi verificado em
producao a 360 px. O que continua por ver e o formulario da password
nova, que so aparece com um link vindo de um email verdadeiro.

Falta-lhes o rodape legal — a `/esqueci-password` e a
`/redefinir-password`. Nao e regressao do desenho: nasceram assim em
`80db4f7`, o commit que criou as paginas juridicas e as ligou a `/login`,
`/registo` e `/instalar`. Fica anotado e nao corrigido: onde aparecem
ligacoes juridicas e decisao de quem responde pelo site, nao de quem o
desenha.

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
- `60ca4c7`: entrada de Presencas mobile clara; publicada e validada sem pendencias, aguarda uma aula por confirmar para fechar.
- `890059f`: lista por confirmar e chamada individual redesenhadas; estado vazio publicado e validado, estados com aulas aguardam dados reais.
- `8d4c9ca`: segunda iteracao da chamada individual, com estados explicitos e progresso visual depois de feedback de falta de clareza.
- `24cb560`: Historico de Presencas e detalhe individual mobile claro; estado vazio validado, estados preenchidos aguardam dados reais.
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

## Cabecalho de data nas listas cronologicas

O cabecalho de cada dia passou a ter so o rotulo: "Hoje", "Amanha" ou
"Sexta-feira, 5 de setembro". A linha pequena por baixo ("sexta-feira ·
setembro") saiu das duas agendas — em "Hoje" e "Amanha" acrescentava uma
linha que ninguem precisa de ler, e nos outros dias repetia a letra o que
o proprio rotulo ja diz. O numero do dia continua na caixa azul.

## Dialogo de confirmacao

`BotaoAcaoDestruir` e o unico dialogo de confirmacao da app (desmarcar um
dia, recusar um pedido, cancelar matricula, apagar conta), por isso o
restyle e global e nao por pagina: bloco `.pinterest-dialogo` em
`globals.css`. Caixa de 340 px com raio 26, titulo em tipografia de
sistema a 18.5 px (deixou de ser a serifa editorial), mensagem a 14 px e
botoes empilhados a largura toda — confirmar em cima, cancelar por baixo.
Lado a lado, rotulos como "Desmarcar todas as aulas deste dia" partiam a
meio no telemovel.

O tom continua a vir do componente em estilo inline: vermelho `#9A3B2E`
para accoes destrutivas, azul da marca para as que so precisam de uma
pausa. O gatilho nao mudou — cada pagina continua a dar-lhe a forma que
precisa.

## Detalhe da aula semanal

`/dashboard/agenda/[horarioId]` abre ao tocar numa linha da agenda.
Cabecalho com o dia da semana, cartao de contexto com o fade azul
aprovado (hora e sala) e a lista de quem vem: um cartao branco por aluno,
com inicial em caixa azul clara, nome, disciplina e ligacao para a ficha.
A data da proxima aula subiu para uma faixa no fundo do cartao, ao lado
do desmarcar — antes so aparecia dentro da confirmacao, o que obrigava a
abrir o dialogo para saber de que dia se tratava.

Cuidado com os nomes: `.pinterest-aula` e `.pinterest-aula-aluno` ja
pertenciam ao cartao da proxima aula na Home. O bloco desta pagina usa o
prefixo `.pinterest-detalhe-*` por causa disso. Antes de criar uma
familia nova de classes, procurar o nome no `globals.css` — o ficheiro ja
passa das 5400 linhas e uma colisao so aparece na pagina do outro.

O CSS antigo `.detalhe-aula-*` em `globals.css` ficou orfao e pode ser
removido numa limpeza; nao foi removido agora para nao alargar o conflito
no ficheiro enquanto ha duas sessoes a escrever nele.

## Grelha semanal

`/dashboard/agenda/semana` e uma pagina nova. A grelha estava num
`<details>` no fundo da agenda do professor, onde nunca chegou a ter
desenho nenhum — e sao duas perguntas diferentes: a agenda responde a "o
que tenho a seguir", a grelha a "como e a minha semana". A agenda passou
a ter no fim um cartao branco que leva la.

A grelha e nova e nao reaproveita `.horarios-grade` (essa continua a
servir a secretaria e o pedido publico, e nao foi tocada). Decisoes:

- so os dias com aulas ganham coluna — um professor de segunda a sexta
  nao precisa de duas colunas vazias a roubar largura ao telemovel, e as
  que ficam passam a 84 px;
- a altura da hora e 56 px e nao os 64 do `HOUR_HEIGHT`, para a semana
  caber num ecra sem scroll vertical; uma aula de 45 minutos ainda fica
  com 42 px;
- a regua das horas fica `sticky` a esquerda enquanto se arrasta a semana
  na horizontal;
- os blocos usam o azul suave `#e7f1fa` e levam para o detalhe da aula;
- o dia de hoje tem a coluna com um azul de 6 % e a linha do "agora";
- o resumo no topo tem tres contagens reais tiradas dos mesmos dados
  (aulas por semana, alunos distintos, primeira hora) — nada calculado
  para encher.

## Pedidos e Horarios do professor

`/dashboard/pedidos` e uma fila de decisao, e o cartao esta ordenado por
isso: quem/o que/ha quanto tempo no topo, o telefone do encarregado a
seguir (e uma linha de accao, nao um dado), a mensagem dele, e so depois
as horas que indicou — cada uma um botao de confirmar com a hora em
destaque e o verbo pequeno a direita. Propor outra hora fica num
`<details>` fechado, porque quando uma das horas indicadas serve essa e a
decisao mais rapida. Recusar fica sozinho no fim, atras de confirmacao.

`/dashboard/horarios` mantem as duas leituras da semana: lista por dia ate
aos 720 px, grelha a partir dai. A grelha passou a usar as classes
`.pinterest-semana-*` da pagina Semana, com dois estados novos
(`-livre`, tracejado, e `-bloqueado`, recuado) — as duas grelhas da app
leem-se agora a mesma escala, 56 px por hora. "Bloqueado" nao e vermelho:
e uma hora que o professor fechou, nao um erro. Editar em lote e criar
horarios ficaram em paineis fechados.

## Dialogos ja convertidos

Alem do `BotaoAcaoDestruir`, passaram para `.pinterest-dialogo`:

- `horarios-apagar-selecionados.tsx` (apagar horarios em lote);
- `confirmar-um-horario.tsx` (o aviso de "so uma opcao de horario", usado
  em `/pedir-aula` e em `/aluno/[alunoId]/pedido`).

Nesse ultimo a enfase nao mudou: "Enviar assim mesmo" continua a ser o
botao cheio e "Escolher mais horarios" o secundario. Trocar a enfase seria
uma decisao de produto e nao de desenho.

## Setas de voltar

Uma pagina que se alcanca de mais do que um sitio nao pode ter a seta
apontada a um destino fixo: quem vem do outro caminho e despejado num
ecra onde nunca esteve. O componente `VoltarAtras` recua no historico e
so usa o `destino` quando nao ha para onde recuar (aba nova, PWA a
arrancar ali, refresh na propria pagina).

Ja o usam: os documentos legais, a ficha do aluno
(`/dashboard/meus-alunos/[matriculaId]`, alcancavel da lista e da aula) e
o detalhe da aula (`/dashboard/agenda/[horarioId]`, alcancavel da agenda,
da grelha da semana e da Home). Antes de fixar um `href` numa seta,
verificar quantas paginas ligam para aquela rota.

## Verificacao em producao

As oito publicas foram vistas no site publicado, a 360 px, depois do
merge `ae19a61`. Nenhuma transborda na horizontal: o conteudo mede
exactamente os 360 px da janela em todas.

Os alvos de toque cumprem os 44 px. Duas leituras enganam e ficam aqui
para nao voltarem a levantar duvida: o "Saltar para o conteudo" mede 1 px
porque so cresce com o foco, e as caixas de seleccao do registo medem
20 px mas estao dentro de `<label>` de 290x44 e 290x94 — a area que
recebe o toque e a etiqueta.

O `/pedir-aula` sem `?programa=` devolve a pessoa a inicial. E
intencional, esta comentado na propria pagina, e nao e ecra em falta: a
escola escolhe-se na inicial.
## Campos e o zoom do iOS

Regra global no fim do `globals.css`: em ponteiro grosseiro, qualquer
`input`, `select` ou `textarea` que receba texto tem letra de 16 px. O
Safari do iPhone aproxima a pagina sozinho quando o campo focado tem letra
mais pequena, e a aproximacao fica la depois de sair do campo — era o que
deixava o ecra "um pouco aumentado" depois do login.

Nao resolver com `maximum-scale=1` na meta viewport: isso tira a quem
precisa a possibilidade de aproximar a pagina, e o iOS recente ja nem o
respeita para este efeito.

Consequencia pratica: ao desenhar um formulario compacto, contar com
16 px no telemovel e nao com o tamanho que se escreveu. Foi por isso que
o "Criar horarios" passou a ter o dia por cima e as duas horas por baixo,
e que o "Ou uma hora nova" nos Pedidos passou a duas colunas.

## Avisos do professor

Nao ha desenho novo: a caixa de entrada e a mesma para os dois papeis, e
o que muda e o que la cai, nao a forma de o ler. A pagina tinha um
`familia ? ... : ...` em cada `className` do cabecalho, com o professor a
ficar com a folha editorial antiga — caiu tudo, e a rota usa agora
`.pinterest-avisos` para toda a gente. O detalhe (`[avisoId]`) ja pedia
`variante="pinterest"` desde o inicio.

A ponte para `/admin/avisos`, que so aparece a quem e professor e esta na
direccao, ja tinha o seu proprio tratamento Pinterest
(`.pinterest-avisos .avisos-outra-caixa`).

As classes base `.avisos-lista`, `.avisos-outra-caixa` e `.avisos-pagina`
continuam a servir `/admin/avisos`, que ainda nao foi redesenhada. Nao as
apagar.

## A seta de voltar volta mesmo

Todas as setas da app passaram a `VoltarAtras` — 48 ligacoes fixas em 47
ficheiros, incluindo a area de administracao. Uma ligacao fixa nao volta:
vai sempre ao mesmo sitio, venha a pessoa de onde vier. Quem abria um
aviso da caixa de entrada e carregava na seta saltava por cima do sitio
onde estava.

O `destino` que la estava ficou como rede, para quando nao ha historico:
aba nova, PWA a arrancar naquele ecra, ou endereco aberto de uma
notificacao push.

Dois detalhes do componente, para nao se perderem:

- `children` mantem a seta de texto das folhas que ainda nao estao no
  Design Pinterest — a marcacao muda sem o aspeto mudar com ela;
- `tamanho` existe porque as folhas desenham a seta a medidas diferentes
  (20 px, 23 px no Pinterest, 24 px nos fluxos de presencas). Uniformizar
  encolhia metade das setas da app numa alteracao que nao era de desenho.

O `PageHeader` deixou de escolher entre `BackButton` e
`BotaoVoltarHistorico` e usa sempre o mesmo componente. Os dois antigos
ficaram sem uso e podem ser apagados numa limpeza.

## Arrastar para apagar um aviso

Componente `AvisoDeslizavel`, usado nas duas caixas de entrada
(`/dashboard/avisos` e `/admin/avisos`), portanto em todos os papeis.

So envolve avisos ja lidos. Um aviso por ler e a unica prova de que a app
tentou dizer alguma coisa a alguem, e um gesto nao o pode destruir antes
de ser visto. A regra esta escrita tres vezes de proposito, e nao por
distraccao: a interface so oferece o gesto nos lidos, a accao repete o
`lida = true` para quem a chame por outro caminho, e a politica de RLS da
migracao 0057 trata de quem nem por ai passe.

O gesto: `LIMITE` 96 px de curso, `LIMIAR` 56 px para valer. Abaixo do
limiar so ha vermelho e largar nao faz nada — o arrependimento a meio tem
de ser possivel num gesto que nao tem botao para cancelar. Passado o
limiar aparece o caixote, e e ele que promete a pergunta que vem a
seguir; ao largar abre a confirmacao.

Tres detalhes que nao se veem mas sem os quais o gesto nao presta:

- a direccao so se decide passados 8 px, e ate la o ponteiro nao e
  capturado — decidir mais cedo roubava o scroll a quem so queria descer
  a lista;
- `touch-action: pan-y` devolve o vertical ao browser e deixa-nos so o
  horizontal;
- o clique que vem a seguir a um arrasto e engolido em captura, senao
  arrastar para apagar abria o aviso pelo caminho.

O botao vermelho por baixo e um `<button>` a serio e esta na ordem de
tabulacao: ao receber foco, o cartao desliza sozinho para o revelar. Um
gesto que so existe para quem tem dedos nao e uma funcionalidade, e um
atalho.

## Descarregar a grelha semanal

`DescarregarGrelha` desenha a grelha de raiz num `<canvas>` e nao fotografa
o DOM. Uma fotografia do ecra (html2canvas e afins) traz o que o telemovel
mostra: as colunas que couberam, cortadas onde a lista rolava, a largura do
aparelho de quem carregou no botao. Num horario que vai ser impresso e
afixado, isso e a distorcao que nao pode acontecer.

Desenhada de raiz, a folha tem sempre a semana toda, colunas da mesma
largura, e o mesmo aspeto venha de um iPhone SE ou de um portatil.

PNG e nao PDF nem Excel: nao traz biblioteca nenhuma para o bundle, abre
em qualquer lado, envia-se no WhatsApp e imprime-se bem aos 2x a que e
gerada. Um Excel perdia a grelha, que e o que faz o horario legivel.

Cuidado com as horas: `formatarHora` do `@ccg/core` devolve o formato do
CCG — "10h" e "10h45", nao "10:00". Dar isso a um parser de posicoes da
NaN, e o canvas desenha um bloco NaN sem se queixar: a folha sai com a
grelha toda e nenhuma aula dentro. Foi assim que a primeira versao saiu.
O componente recebe agora as horas em cru (`inicio`/`fim`, como vem da
base de dados) para a posicao, e a `etiqueta` ja escrita para o texto.

Licao do mesmo erro: a folha tinha sido verificada com dados inventados
a mao no formato errado. Testar o desenho nao e testar o contrato dos
dados — quando o que se verifica e um componente, os valores de exemplo
tem de vir da mesma forma que os reais.

Numeros que importam: `LINHA_HORA` e 84 px e nao 76 porque aos 76 uma
aula de 45 minutos so tinha espaco para duas linhas, e num horario de
professor o nome do aluno nao e o detalhe dispensavel. O fundo e branco e
nao transparente — um PNG transparente enviado por WhatsApp aparece com
texto preto sobre fundo preto no modo escuro. Os nomes compridos sao
cortados com reticencias medidas no proprio canvas.

## Colisao de nomes no `.pinterest-pedido`

Dois trabalhos em paralelo escolheram a mesma classe: o cartao de cada
pedido em `/dashboard/pedidos` e o involucro da pagina do assistente. As
duas regras aplicavam-se aos dois sitios, e nenhuma das duas paginas
estava como o seu autor a tinha desenhado — o assistente publico apanhava
a borda, o raio de 23 px e o fade azul do cartao, e os cartoes de pedido
apanhavam o padding de pagina, a fonte e o `button[type=submit]` de
largura inteira do assistente.

O involucro do assistente passou a `.pinterest-pedir`. O cartao ficou com
o nome, que e o coerente com a familia dele (`.pinterest-pedidos` para a
pagina, `.pinterest-pedido` para o cartao).

Licao para quem vier a seguir: antes de criar uma classe nova, procura-la
no globals.css. Duas pessoas a redesenhar a mesma aplicacao ao mesmo tempo
escolhem os mesmos nomes, porque os nomes bons sao poucos.

## O assistente de pedido com sessao

`/aluno/[alunoId]/pedido` passou a partilhar a moldura com o publico. A
prop `publico` do Wizard voltou ao que era — decide o rodape legal e o
subtitulo, nao a moldura.

O interior nao foi reescrito. O percurso publico tem classes proprias; o
autenticado monta-se com o `CartaoLink`, partilhado por outras quatro
paginas, e por isso a lista de escolhas e vestida por descendencia sob
`.pinterest-pedir-privado`. Duas heranças precisaram de `!important`: o
`background: transparent` que as linhas levam dentro do wizard (sobre o
cinzento ficavam invisiveis) e o risco por cima da lista.

Uma armadilha nova, da familia das outras: a regra do sobretitulo era
`.pinterest-pedido-cabecalho > div > p` e apanhava os dois paragrafos. No
percurso publico so ha um, por isso nunca se viu; no autenticado ha o
subtitulo "Segue os passos para encontrar a opcao certa.", que saia todo
em maiusculas espacadas. Passou a `:first-of-type`.


## Editar uma hora do horario

`/professor/horarios/[id]` era a ultima rota da area de professor fora do
Design Pinterest. A ordem da pagina mudou, e nao so o aspeto:

1. o que se esta a editar (dia, hora e estado) num cartao com o fade
   azul — quem chega de uma lista de catorze horas iguais nao tinha como
   confirmar que abriu a certa;
2. quem ja la esta, antes dos campos e nao depois. Mudar a hora de uma
   aula que tem alunos nao e a mesma decisao que mudar uma vaga vazia, e
   isso tem de se saber antes de mexer nos campos, nao a seguir;
3. os campos;
4. apagar, noutra superficie e no fim.

A confirmacao de apagar passou a dizer qual e a hora e quantos alunos
tem, em vez de "tens a certeza". E com alunos confirmados sugere bloquear
em Horarios, que e a saida que nao desfaz aulas.

## Area de professor concluida

Com esta, todas as rotas que um professor alcanca estao implementadas no
Design Pinterest. Falta a validacao com conta real em quase todas — nenhuma
tem `[x]` por isso. As duas rotas que sobram no ficheiro
(`/professor/[professorId]` e as publicas) sao da lista publica.

## Restos das regras substituidas

Redesenhar uma pagina deixa no globals.css o bloco antigo dela. Nao da
erro nenhum, e na maior parte das propriedades a regra nova ganha por vir
depois — mas so nas que ela repete. As outras continuam a aplicar-se.

Aconteceu na ficha do professor: o `.ficha-professor-retrato` antigo dava
`margin-top: 30px` a um retrato que ocupava a largura toda, e essa margem
sobreviveu ao redesenho. O retrato passou a uma caixa de 96 px numa
grelha, e a margem empurrava-o para baixo do nome e crescia o cartao 32 px
— 160 em vez de 128. Estava assim em producao.

Regra pratica: depois de redesenhar uma pagina, procurar no globals.css as
classes que ela usa e ver o que ficou definido mais acima. O que a regra
nova nao repete, herda.

Uma varredura a procura de mais casos — a mesma propriedade com valores
diferentes em blocos afastados — nao encontrou outros.


## Desmarcar o dia apanha as reposicoes (0058)

O bug nao era o botao faltar num dia so com reposicoes. Era um dia
misto: o botao aparecia, dizia "2 aulas", desmarcava as duas — e a
reposicao ficava la. O professor lia "dia desmarcado" e alguem aparecia
na escola. A `desmarcar_dia` percorria so `matriculas`, e uma reposicao e
uma linha avulsa em `reposicoes`.

Agora apanha as duas coisas, no estado novo `cancelada` (nao `recusada`,
que e a familia a dizer que nao pode). Todas as consultas da app filtram
por `confirmada`/`proposta`, por isso uma reposicao cancelada sai das
listas sozinha e a aula desmarcada de origem volta a poder receber outra.

Licao para a proxima migracao que mexa num `check` de lista: **nao
reescrever a lista a mao**. Escrevi-a com os valores das migracoes que
conhecia e a migracao rebentou — tinham sido acrescentados quatro tipos
de aviso entretanto. A 0058 passou a estender a constraint que esta na
base de dados (`pg_get_constraintdef` + `replace`), o que a torna imune a
isso e idempotente.
