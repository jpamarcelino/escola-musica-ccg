# Arquitetura e funcionalidades

Estado da app em `main`, publicado em escola-musica-ccg.vercel.app.

Este documento descreve **o que existe hoje**. Foi escrito a ler o
código e as migrações, não de memória — cada afirmação tem um ficheiro
por trás. Onde algo está por fazer, está marcado como tal em vez de
descrito como se funcionasse.

> **Como continuar isto.** Acrescenta secções onde faltam; se
> encontrares uma afirmação errada, corrige-a e diz onde estava. Um
> documento de arquitetura que mente é pior do que não existir — foi o
> que aconteceu com a secção 12c do `DESIGN_SYSTEM_V2.md`, que durante
> uns dias descreveu esqueletos que já tinham sido retirados.

---

## 1. O que a app faz

Gere as **Escolas Artísticas do Centro Cultural da Guarda**: música,
dança e música para bebés. Três coisas, por esta ordem de importância:

1. Um encarregado de educação descobre a oferta, escolhe disciplina e
   professor, e pede uma aula indicando quando pode.
2. O professor confirma o horário, gere a sua disponibilidade e lança
   presenças.
3. A administração acompanha alunos, professores, mensalidades e
   recomendações.

Desenhada para telemóvel — 375 px é a largura de referência — e
instalável como PWA.

---

## 2. Stack

| | |
|---|---|
| Framework | Next.js 15.5.21, App Router, React 19.2.4 |
| Renderização | Server Components por omissão; Server Actions para escrita |
| Dados e auth | Supabase (Postgres + Auth), acesso via RLS |
| Estilo | Tailwind v4 com `@theme` em `globals.css` (não há `tailwind.config`) |
| Primitivas | Radix (`Dialog`, `AlertDialog`) — só acessibilidade, restilizadas |
| Ícones | Lucide |
| Alojamento | Vercel (`vercel.json` define um cron) |
| Dev | `pnpm dev` com Turbopack |
| Testes | Vitest, só em `packages/core` |

### Estrutura do repositório

O repositório é um workspace pnpm. A web deixou de estar na raiz:

```
apps/web/         a aplicação Next.js
apps/mobile/      a aplicação Expo (React Native)
packages/core/    lógica sem framework, partilhada
packages/data/    leituras da base de dados, partilháveis
packages/types/   vocabulário de estados, gerado do esquema
```

O `packages/core` é o que a web e a futura app móvel partilham
literalmente — o mesmo ficheiro, não duas cópias. Só entra ali código
que corre sem alterações no Node, no browser e no Hermes: datas,
dinheiro, plurais, idades, salas, faixas etárias e a grelha de horários.
Não entra nada que faça queries, nem nada que toque no DOM — o
`tsconfig.json` do pacote não inclui a lib `dom`, por isso quem tentar
usar `window` não compila.

É publicado em TypeScript, sem passo de build próprio; quem o consome
compila-o (`transpilePackages` no `next.config.ts`). Em troca não há
`dist/` desatualizado.

O `packages/types` resolve outro problema. As colunas de estado são
`text` com uma constraint `CHECK`, e não tipos enum — do lado da
aplicação chegavam como `string`, e um `'confimado'` mal escrito
compilava sem queixa até o Postgres o recusar em produção. O ficheiro
`src/estados.gerado.ts` traz as 14 uniões, extraídas do `schema.sql` e
das migrações aplicadas por ordem (o estado final de uma constraint não
se lê no `schema.sql`: o `tipo` de `perfis_escola` muda três vezes ao
longo das 25 migrações). Não se edita à mão:

```
pnpm --filter @ccg/types gerar
```

Há um teste que repete a extração e compara com o ficheiro no disco, por
isso uma migração que mude os valores permitidos e se esqueça de
regenerar faz falhar a suite em vez de divergir em silêncio.

O `packages/data` guarda as leituras. A regra que lhe dá forma é uma só:
**as funções recebem o cliente Supabase, nunca o criam.** Isso torna-as
partilháveis (na web o cliente lê a sessão dos cookies, na app móvel do
armazenamento local) e, mais importante, impede a `service role key` de
lá entrar — um pacote que criasse o seu cliente teria de ir buscar
chaves ao ambiente, e num bundle de app móvel isso é código entregue ao
telemóvel de quem a instala. Há um teste que varre todos os pacotes e
falha se algum mencionar `SERVICE_ROLE`, ler `process.env` ou criar um
cliente.

### A app móvel

Expo com `expo-router`, em `apps/mobile`. Cobre os três perfis — Conta
CCG, professor e administração — e escreve, não só consulta.

As escritas **não passam por Server Actions**: a app escreve direto no
Supabase e é a RLS que decide se passa. Isso só é possível porque as
regras deste projeto vivem no Postgres; as Server Actions da web validam
e navegam, mas não são elas que protegem os dados. As funções em
`packages/data` não recebem o id de quem escreve, de propósito — passá-lo
daria a ilusão de se poder escrever em nome de outra pessoa.

O que a app **não** faz, e é decisão e não esquecimento: pagamentos,
faturação e o estudo das recomendações continuam no site. São tabelas
largas, de conferir com calma, e num telemóvel dariam mais erros do que
rapidez. O ecrã de administração di-lo, para ninguém concluir que a app
está partida.

O que interessa não é o tamanho — é que as contas são as mesmas. A
próxima ocorrência de uma aula, a hora de Lisboa, o nome da sala, os
plurais: tudo vem do `@ccg/core` e do `@ccg/data`, os mesmos ficheiros
que a web usa. Não é código parecido nos dois sítios, é o mesmo código.

Confirmado num telemóvel, e não só em teoria: numa segunda-feira à
noite, a aula de Guitarra das 16h desse mesmo dia apareceu com a data da
segunda seguinte, e a de Bateria de quarta-feira veio à frente dela na
lista. É a `proximaOcorrenciaDeAula` e a ordenação por data a correrem
em Hermes com o mesmo resultado que dão no servidor.

A única diferença real entre as duas apps, no que toca a dados, é onde
mora a sessão: cookies na web, `AsyncStorage` no telemóvel. É por isso
que o `packages/data` recebe o cliente já construído.

O `metro.config.js` merece uma leitura antes de se lhe mexer: num
workspace pnpm o Metro precisa de saber que a raiz do monorepo faz parte
do projeto, e a busca hierárquica tem de ficar **ligada** — ao contrário
do conselho que se encontra escrito para monorepos npm e yarn.

As **escritas** estão em `escritas-professor.ts`,
`escritas-encarregado.ts`, `conta.ts` e `admin.ts`. Não foram levantadas
das Server Actions: a
[`AUDITORIA_SERVER_ACTIONS.md`](AUDITORIA_SERVER_ACTIONS.md) explica
porquê — das 48, uma só era lógica de dados pura; as outras escrevem *e*
navegam, e a navegação do servidor não existe numa app. O que se
partilhou foram as queries e as regras; o que decide o que acontece a
seguir é de cada frente.

O que ainda **não** está no `packages/types` são as formas das linhas de
cada tabela. Isso quer a geração de tipos do Supabase, que precisa de um
token de acesso, do Docker ou da ligação à base — nenhum deles disponível
até agora. As projeções de cada query continuam declaradas em cada
página, e é aceitável: seis páginas declaram um tipo `Matricula` e as
seis são projeções diferentes, não cópias.

Comandos, todos a partir da raiz:

| | |
|---|---|
| `pnpm dev` | servidor de desenvolvimento da web |
| `pnpm build` | build de produção da web |
| `pnpm test` | testes de todos os pacotes |
| `pnpm typecheck` | TypeScript em todos os pacotes |
| `pnpm lint` | ESLint (só a web tem configuração) |

Três clientes Supabase, em `apps/web/src/lib/supabase/`:

- `server.ts` — Server Components e Server Actions
- `client.ts` — o pouco que corre no browser
- `proxy.ts` — usado pelo `middleware.ts` para renovar a sessão em cada
  pedido; o matcher cobre tudo menos estáticos e imagens

---

## 3. Quem usa a app

`perfis_escola.tipo` aceita **três** valores, mas os níveis de acesso são
**quatro**, porque `admin` e `super_admin` são flags independentes do
tipo — a mesma conta pode ser professor *e* administrador.

| `tipo` | Na app é | Notas |
|---|---|---|
| `conta` | **Conta CCG** — quem gere | email, password, avisos, agenda familiar, gestão de alunos |
| `professor` | Professor | tem `programa` obrigatório (música ou dança) |
| `admin` | Direção / secretaria | |

Mais as flags `admin` e `super_admin` em `perfis_escola`. Só um super
admin pode dar ou tirar admin — garantido pelo gatilho
`impedir_auto_promocao_admin`, que bloqueia **mesmo com chave de
serviço**.

**Conta e aluno são coisas separadas.** A migração `0025` levou esta
distinção até ao fim e renomeou o tipo `aluno` para `conta`:

- **Conta CCG** — quem gere: email, password, nome, avisos, agenda
  familiar, gestão de alunos.
- **Aluno** — quem tem aulas: perfil sem login, seja um filho ou o
  próprio titular da conta.

Criar conta já não inventa um aluno com o nome do titular. Quem se
regista escolhe em `/dashboard/alunos` quem vai às aulas. As 17 contas
que já existiam mantiveram alunos, matrículas, presenças, mensalidades e
histórico.

Então há **cinco tipos de pessoa** (encarregado, aluno dependente,
professor, admin, super admin) mas só **três tipos de conta**.

Duas funções `security definer` centralizam a verificação, para as
policies não caírem em recursão: `eh_admin()` e `eh_super_admin()`.

---

## 4. Modelo de dados

15 tabelas. O `supabase/schema.sql` só tem o esquema inicial — o resto
está nas 25 migrações em `supabase/migrations/`.

### Identidade

- **`profiles`** — identidade genérica: nome, email, telefone, foto.
  Desde a `0021` já não sabe nada da escola, para poder vir a servir
  outras secções do CCG.
- **`perfis_escola`** (1:1 com `profiles`) — o papel na escola: `tipo`,
  `programa`, `admin`, `super_admin`, prioridade de sala.
- **`alunos`** — quem tem aulas. `encarregado_id` aponta a quem gere;
  `propria_conta_id` só está preenchido quando o aluno tem login próprio.

### Oferta e horários

- **`instrumentos`** — as disciplinas das três escolas.
- **`professor_instrumentos`** — quem ensina o quê, com especialidade
  opcional.
- **`horarios`** — as janelas semanais de cada professor. Estado
  `aberto` ou `bloqueado`. A base de dados impõe que fiquem dentro do
  horário de abertura do Centro (`0011`).
- **`salas`** — atribuídas por `recalcular_salas()`, com prioridade.

### Matrículas

- **`matriculas`** — o pedido e depois a aula. Estado `a_escolher` (o
  encarregado pediu, o professor ainda não confirmou) ou `confirmado`.
- **`disponibilidades_selecionadas`** — os horários que o encarregado
  indicou no pedido. É por aqui que o professor confirma.

### Acompanhamento

- **`presencas`** — `presente`, `falta_aviso` ou `falta_sem_aviso`.
- **`notificacoes`** — avisos ao encarregado.
- **`mensalidades`** — uma por matrícula/ano/mês, com valor, `pago`,
  número de fatura e uma flag para não repetir o aviso final.
- **`recomendacoes`** e **`beneficios`** — quem trouxe quem, e o
  desconto daí resultante. Estados `registada`/`validada`/`anulada` e
  `pendente`/`usado`/`expirado`/`anulado`.
- **`convites`** — para criar contas de professor ou admin, e para
  migrar um aluno antigo. Tipos `professor`, `admin`, `migracao_aluno`.

---

## 5. Regras de negócio que vivem na base de dados

Estas não estão só na app — estão em gatilhos e policies, e é de
propósito: a app valida para dar boa mensagem, a base de dados valida
para garantir.

| Regra | Onde |
|---|---|
| Um aluno não pode ter duas aulas sobrepostas, mesmo com professores diferentes | `impedir_sobreposicao_aluno` (`0012`) |
| Os horários têm de cair dentro da abertura do Centro | `0011` |
| Só um super admin altera a flag `admin` | `impedir_auto_promocao_admin` (`0007`) |
| Uma matrícula ativa por aluno e disciplina | índice único `matriculas_aluno_instrumento_ativa_unique` (`schema.sql:222`) |
| Cancelar uma matrícula anula os benefícios associados | `anular_beneficios_por_cancelamento` |
| Salas recalculadas quando os horários mudam | `trg_recalcular_salas` |
| Criar conta cria o perfil | `handle_new_user` |
| Um aluno dependente mantém-se sincronizado | `sincronizar_aluno_dependente` |

**Presenças são fechadas ao encarregado.** A `0002` diz explicitamente
que só professores e administradores têm acesso — os alunos não veem nem
marcam. Isto teve consequência de desenho: o anel de progresso do
encarregado conta os horários da semana, não a assiduidade, porque a
assiduidade não lhe é visível.

---

## 6. Rotas

47 rotas. As áreas com conta têm navegação inferior própria, montada no
`layout.tsx` de cada área.

### Público

| Rota | O que faz |
|---|---|
| `/` | Escolha de escola, com carrossel automático (pausável) |
| `/pedir-aula` | Assistente de pedido, 5 passos, por query string |
| `/login`, `/registo` | Entrada e criação de conta |
| `/esqueci-password`, `/redefinir-password` | Recuperação |
| `/instalar` | Como instalar como app |

### Encarregado

| Rota | O que faz |
|---|---|
| `/dashboard` | Saudação, próxima aula, lista de alunos, anel por filho |
| `/aluno/[id]` | O dia do aluno |
| `/aluno/[id]/horario` | Agenda e pedidos em curso |
| `/aluno/[id]/materiais` | Metrónomo *(por agora, só isso)* |
| `/aluno/[id]/pedido` | Assistente de pedido, já autenticado |
| `/aluno/notificacoes` | Avisos |
| `/aluno/calendario` | **Por construir** — estado vazio a explicar |
| `/dashboard/conta` | Perfil, password, foto |

### Professor

| Rota | O que faz |
|---|---|
| `/dashboard` | Anel de ocupação e próximas aulas |
| `/dashboard/agenda` | Aulas por dia; `[horarioId]/[matriculaId]` abre o aluno |
| `/dashboard/horarios` | Grelha semanal, criação e edição em massa |
| `/dashboard/presencas` | Hub; `/confirmar` e `/historico` |
| `/dashboard/pedidos` | Confirmar ou recusar pedidos |
| `/dashboard/mensalidades` | Extrato por mês do ano letivo |
| `/dashboard/calendario`, `/dashboard/conta` | |
| `/professor/horarios/[id]` | Editar um horário |

### Administração

Mais de vinte rotas: `/admin`, `/admin/alunos`, `/admin/professores`
(com `/alunos`, `/conta`, `/horario`), `/admin/pagamentos` (com
`/confirmar` e `/historico`), `/admin/recomendacoes` (com `/nova`,
`/estudo`, `/[id]`), `/admin/administradores`, `/admin/conta`.

**Revista em parte.** Foram percorridos com dados reais os ecrãs que
mexem em dinheiro e em privilégios: `/admin`, `/admin/pagamentos`,
`/confirmar`, `/confirmar/[professorId]`, `/historico`,
`/historico/[professorId]`, `/admin/recomendacoes` e
`/admin/administradores`.

Faltam ver `/admin/alunos` e `/admin/professores` com as suas
sub-rotas — são de consulta e gestão corrente, sem operações
financeiras.

---

## 7. Escrita: as Server Actions

Toda a escrita passa por Server Actions em `apps/web/src/lib/actions/`. Não há
rotas de API para operações de negócio — a única rota de API é o cron.

| Ficheiro | Responsabilidade |
|---|---|
| `auth.ts` | Entrar, criar conta, recuperar password, gerir e apagar conta |
| `aluno.ts` | Indicar disponibilidade, cancelar pedido/matrícula, criar filho |
| `professor.ts` | Confirmar horário, recusar pedido, gerir horários e disciplinas |
| `presencas.ts` | Marcar presenças |
| `pagamentos.ts` | Valor mensal, marcar paga, número de fatura |
| `recomendacoes.ts` | Registar, validar, anular |
| `convites.ts` | Criar e resgatar convites |
| `notificacoes.ts` | Marcar lidas |
| `admin.ts` | Gerir administradores |
| `pedido-publico.ts` | O que o assistente público precisa antes de haver conta |

### Automatismo

`/api/cron/mensalidades` corre todos os dias às 07:00 (`vercel.json`) e
chama três funções:

- `gerar_mensalidades_e_avisos()`
- `avisar_pagamentos_em_falta()`
- `expirar_beneficios_ano_letivo()`

A flag `aviso_final_enviado` impede o aviso duplicado se a função for
chamada mais que uma vez no mesmo dia.

---

## 8. Fluxo principal: do pedido à aula

1. O encarregado escolhe escola em `/`, e o assistente pede idade,
   disciplina, professor e disponibilidade.
2. Se não tiver conta, cria-a num modal no fim — o pedido não se perde.
3. Cria-se uma `matricula` em `a_escolher` e as
   `disponibilidades_selecionadas`.
4. O professor vê em `/dashboard/pedidos` e confirma **um** dos horários
   indicados. A matrícula passa a `confirmado` com `horario_final_id`.
5. A partir daí a aula aparece nas agendas dos dois, e entra nas
   presenças e nas mensalidades.

> ⚠️ **Beco conhecido.** A validação do assistente aceita "zero horários
> **ou** mensagem" — e quando o professor não tem vagas, a app convida
> mesmo a deixar recado. Mas o professor só consegue confirmar carregando
> num horário indicado. Sem nenhum, resta-lhe **Recusar**. Falta uma via
> para ele propor um horário. O ecrã já explica a situação e mostra o
> contacto, mas a saída em falta é real.

---

## 9. Interface

O sistema visual está em `DESIGN_SYSTEM_V2.md`; aqui fica só o que é
estrutural.

- **Navegação inferior** por área, montada no `layout.tsx` respetivo.
  `/aluno` usa um grupo de rotas `(gerais)` para as páginas que não
  pertencem a um filho — sem isso, um layout na raiz de `/aluno`
  duplicaria a barra sobre `/aluno/[alunoId]`.
- **Espera**: `EcraCarregamento` em todos os `loading.tsx`, cada um com
  mensagem própria. O atraso de 400 ms vive em CSS, não em JS —
  a razão está na secção 12c do design system.
- **Estados vazios**: componente `EmptyState`, com ação de saída quando
  faz sentido.
- **Ações destrutivas**: `BotaoAcaoDestruir` sobre Radix AlertDialog.
- **Formatação**: `moeda.ts` (Intl, pt-PT), `datas.ts` e `plural.ts`, os
  três em `packages/core`. Datas e dinheiro nunca formatados à mão.

---

## 10. Dívida conhecida

Registada aqui para não se descobrir duas vezes.

| O quê | Onde | Gravidade |
|---|---|---|
| ~~`apagar_propria_conta` falhava com `column "tipo" does not exist`~~ | **resolvido** na migração `0025`, aplicada em produção | — |
| "Ver aulas" desalinhado por volta dos 800&nbsp;px | home pública | Baixo |
| Painel da Dança sem ilustração | home pública | Baixo |
| Ecrã do professor sem horários contradiz-se | área do professor | Baixo |
| Conta "Teste Admin (Claude QA)" com privilégios de admin em produção | base de dados | **Segurança** — sem nada agarrado, apagar não arrasta nada |
| 18 de 35 perfis são de teste, misturados com pessoas reais no diretório | base de dados | Médio |
| `/admin/alunos` e `/admin/professores` ainda não foram vistos | 2 rotas + sub-rotas | Média — o resto do `/admin` já foi percorrido |
| Falta ao professor uma via para propor horário | secção 8 | Média |
| `/aluno/calendario` por construir | | Média |
| "Os teus alunos" é vocabulário de secretaria para descrever filhos — mas a mesma lista serve adultos inscritos a si próprios | `dashboard/page.tsx` | Baixa — exige distinguir os casos |
| Não há como trocar de filho a partir do separador "Aluno" | `bottom-navigation` | Baixa |
| Contas demo (`demo-professor@ccg.pt`, `demo-encarregado@ccg.pt`) vivas em produção com password conhecida | base de dados | A remover antes de publicar |
| `notificacoes.tipo` permite cinco valores e a app só cria `pedido_aceite` — os outros quatro (lembretes de aula e de pagamento, mudança de horário, novo material) nunca são escritos | esquema vs. Server Actions | Baixa — superfície declarada por usar, não erro |
| `instrumentos.programa` aceita `bebes`, mas `perfis_escola.programa` só aceita `musica` e `danca`: um professor não pode ter o programa da escola de bebés, e `convites.ts` recusa-o também | esquema | A confirmar com o dono — pode ser intencional (bebés dados por professores de música) |
| As formas das linhas de cada tabela ainda não estão tipadas — falta gerar os tipos do Supabase, que precisa de token, Docker ou ligação à base | `packages/types` | Média |
| ~~A app móvel nunca correu num dispositivo~~ | **confirmada** em iPhone com Expo Go a 17/08/2026: login, lista de alunos, aulas com data/hora corretas e avisos | — |
| A app móvel só foi vista num iPhone. O Android não foi experimentado, e é onde vivem a maioria dos encarregados | `apps/mobile` | Média |
| A data de uma presença não pode ser futura nem cair fora do dia do horário — mas isso é verificado **só pela aplicação**. A RLS da tabela `presencas` garante a posse e mais nada. Já era assim antes da app; fechá-lo quer uma constraint ou trigger, ou seja uma migração | `presencas` | Média — decisão do dono |
| Não há forma de fazer um pedido de aula pela app — o ecrã vazio manda a pessoa ao site. É consequência de as escritas ainda não estarem partilhadas | `apps/mobile` | Média — decisão de âmbito, não defeito |
| Três componentes chamam `setState` em síncrono dentro de um `useEffect` (`instalar-callout`, `modal-conta-pedido`, `navigation-feedback`) | web | Baixa — apanhado pela regra `react-hooks/set-state-in-effect` da versão 7 do plugin, que a web não usa (ver abaixo) |
| A web fixa `eslint-plugin-react-hooks@^5` porque o `FlatCompat` resolve o plugin pelo nome e apanhava a versão 7 trazida pela app móvel. Atualizar a web para a 7 é uma decisão à parte, com as três correções acima | `apps/web` | Baixa |

---

## 11. Ambiente

Ver `.env.example`. Uma nota que lá está e vale repetir:

> `SUPABASE_SERVICE_ROLE_KEY` ignora todas as regras de RLS. Serve só
> para scripts locais de seed e limpeza. Nunca em código que vai para
> produção, e nunca com prefixo `NEXT_PUBLIC_`.

E a regra permanente do `README.md`: **não publicar sem perguntar ao
dono do projeto.** Mesmo quando a alteração parece inofensiva.
