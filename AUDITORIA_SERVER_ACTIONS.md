# Auditoria das Server Actions

As 48 Server Actions da web, classificadas pelo que as prende ao Next.
Serve para a fase da app móvel saber, antes de começar, o que se
aproveita e o que tem de ser repensado.

A classificação sai dos sinais no corpo de cada função — escritas,
`redirect`, `revalidatePath`, `headers()`, ficheiros, sessão — e não do
nome. Onde a regra automática errou, está corrigido à mão e dito porquê.

| Classe | O que significa | Quantas |
|---|---|---|
| **A** | Lógica de dados pura. Move para `packages/data` sem alterações. | 1 |
| **B** | Dados **e** efeitos do Next. A query extrai-se; o invólucro fica na web. | 37 |
| **C** | Específica da web: sessão, cabeçalhos, ficheiros. | 10 |
| **D** | Não mover. | 0 |

## O resultado que interessa

**Uma única ação em 48 é pura.** Todas as outras ou escrevem e a seguir
navegam, ou dependem de coisas que só existem no servidor da web.

Isto não é um defeito do código: é o que uma app Next.js bem feita
parece. O `redirect` e o `revalidatePath` não são um efeito colateral
pendurado no fim da função — são metade do que a função faz. "Confirma
este horário" quer dizer *grava e leva-me à página que mostra o
resultado*.

A consequência prática, e é a razão desta auditoria existir: **o caminho
de escrita não se levanta para a app móvel, tem de ser redesenhado.** Uma
app móvel não tem navegação do servidor nem cache de rotas para
invalidar; tem estado local e ecrãs. Quem for fazer essa fase não vai
mover 37 funções — vai extrair 37 queries e decidir, uma a uma, o que
acontece no lugar da navegação.

Orçamentar isso como "mover as Server Actions" seria enganar-se por uma
ordem de grandeza.

## Classe A — 1

| Ficheiro | Ação |
|---|---|
| `pedido-publico.ts` | `listarMeusAlunos` |

Já extraída: a query é agora `listarAlunosDoEncarregado` no
`packages/data`, e a ação ficou a ser o que é da web — resolver a sessão
a partir dos cookies e chamar a função partilhada.

Foi também o caso que mostrou o limite da regra automática. Como chama
`supabase.auth.getUser()`, a primeira versão da regra classificou-a como
específica da web. Não é: resolver a sessão é coisa que as duas
plataformas fazem, só que de sítios diferentes. Com o id do encarregado
recebido por parâmetro, a query é a mesma nas duas.

## Classe B — 37

Escrevem e a seguir redirecionam ou invalidam cache. A query é
partilhável; o resto não.

| Ficheiro | Ações |
|---|---|
| `admin.ts` | `atualizarAdministradores` |
| `aluno.ts` | `cancelarMatricula`, `cancelarPedido`, `criarAluno`, `escolherDisponibilidades` |
| `auth.ts` | `apagarConta`, `apagarContaSuperAdmin`, `atualizarNomeConta` |
| `convites.ts` | `criarConviteAdmin`, `criarConviteMigracaoAluno`, `criarConviteProfessor`, `resgatarConvite` |
| `notificacoes.ts` | `marcarNotificacaoLida`, `marcarTodasNotificacoesLidas` |
| `pagamentos.ts` | `atualizarHistoricoMensalidades`, `definirNumeroFatura`, `definirValorMensal`, `marcarMensalidadePaga` |
| `pedido-publico.ts` | `criarAlunoDependenteModal` |
| `presencas.ts` | `marcarPresencas` |
| `professor.ts` | `alternarEstadoHorario`, `apagarHorario`, `apagarHorarios`, `atualizarHorario`, `atualizarInstrumentos`, `bloquearHorarios`, `cancelarMatricula`, `confirmarHorario`, `criarHorarios`, `desbloquearHorarios`, `desmatricularAluno`, `recusarPedido` |
| `recomendacoes.ts` | `anularRecomendacao`, `atualizarDadosRecomendacao`, `definirAdesaoRecomendacao`, `registarRecomendacao`, `validarRecomendacao` |

O `professor.ts` sozinho tem 13 das 37 — é o ficheiro por onde passa
quase tudo o que um professor faz. Se a extração for feita por partes, é
por aí que compensa começar e é aí que o risco se concentra.

## Classe C — 10

Autenticação e ficheiros. A app móvel usa os mesmos métodos do Supabase,
mas com a sessão noutro sítio e sem redirecionamentos do servidor — o
invólucro é diferente por natureza, não por acaso.

| Ficheiro | Ações |
|---|---|
| `auth.ts` | `atualizarEmailConta`, `atualizarPassword`, `atualizarPasswordConta`, `login`, `logout`, `pedirRecuperacaoPassword`, `signup` |
| `pedido-publico.ts` | `loginModal`, `registoModal` |
| `professor.ts` | `atualizarFoto` |

O `atualizarFoto` é o mais diferente dos dez: recebe um `File` de um
formulário e escreve no Storage. Na app móvel a fotografia vem da câmara
ou da galeria, por outro caminho.

## Nota sobre a duplicação em `pedido-publico.ts`

O próprio ficheiro avisa, num comentário no topo, que `loginModal` e
`registoModal` replicam a validação do `auth.ts` — existem para o popup
de conta poder ficar na mesma página em vez de saltar para o
`/dashboard`. É duplicação conhecida e assumida, não descuido.

Vale a pena registá-la aqui porque, quando as validações forem para um
sítio partilhado, estes dois pares deixam de poder divergir — e essa é
uma razão a mais para o fazer.
