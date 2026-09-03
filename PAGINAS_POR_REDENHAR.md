# Inventario do Design Pinterest

Ler primeiro `DESIGN_PINTEREST_HANDOFF.md`. Este checklist regista o estado por rota e variante. `[x]` significa que a variante indicada cumpre a definicao de concluida do guia; nao significa automaticamente desktop ou modo escuro.

## Concluido no Design Pinterest

- [x] `/dashboard` - familia/aluno - mobile - modo claro (`d9b22d2`, acabamento `067da9d`)
- [x] `/dashboard/agenda` - familia/aluno - mobile - modo claro (`f9c973c`)
- [x] `/dashboard/avisos` - familia/aluno - mobile - modo claro (`5c12018`, hierarquia afinada em `0e1940f`)
- [x] `/dashboard/avisos/[avisoId]` - familia/aluno - mobile - modo claro (`5c12018`)
- [x] `/dashboard/mensalidades` - familia - mobile - modo claro (`fc4402d`, estado vazio `754460e`)
- [x] `/dashboard/conta/avancado` - familia/aluno - mobile - modo claro (`f3131bf`)
- [x] `/dashboard/reposicoes/pedidos` - professor - mobile - modo claro (`f3131bf`)

## Publicas pendentes no Design Pinterest

Estas rotas funcionam com o design herdado da `main`, mas todas precisam de redesign ou revisao completa antes de receberem `[x]`.

- [x] `/` - publica - mobile - modo claro (verificada a 360, 390 e 430 px, sem sessao)
- [x] `/pedir-aula` - publica - mobile - modo claro (5 passos, becos e estado bloqueado; 360, 390 e 430 px)
- [x] `/professor/[professorId]` - publica - mobile - modo claro (com e sem foto, com e sem apresentacao)
- [x] `/login` - publica - mobile - modo claro
- [x] `/registo` - publica - mobile - modo claro
- [x] `/esqueci-password` - publica - mobile - modo claro
- [ ] `/redefinir-password` - publica - mobile - modo claro - implementado; o reencaminhamento sem sessao de recuperacao esta validado em producao, falta o formulario da password nova (exige link de email real)
- [x] `/instalar` - publica - mobile - modo claro (os dois separadores)
- [x] `/legal` - publica - mobile - modo claro (validado visualmente a 360 px)
- [x] `/legal/[documento]` - publica - mobile - modo claro (validado visualmente a 360 px)

## Internas partilhadas

- [x] Fundacao desktop autenticada - navegacao lateral e coluna Pinterest comum de 720 px
- [ ] `/dashboard` - professor - desktop - modo claro - composicao vertical comum implementada em localhost; falta validacao final
- [ ] `/dashboard` - familia/aluno - desktop - modo claro - composicao vertical comum implementada em localhost; falta validar com alunos reais

- [ ] `/dashboard` - professor - mobile - modo claro - implementado e publicado (`f82337d`), estado vazio validado; falta validar com aulas reais
- [ ] `/dashboard` - todas as variantes - desktop
- [ ] `/dashboard` - todas as variantes - modo escuro
- [ ] `/dashboard/agenda` - professor - mobile - modo claro - implementado, falta validar com conta de professor real
- [ ] `/dashboard/agenda` - todas as variantes - desktop e modo escuro
- [ ] `/dashboard/agenda/semana` - professor - mobile - modo claro - pagina nova (a grelha semanal saiu do acordeao da agenda), falta validar com conta de professor real
- [ ] `/dashboard/agenda/[horarioId]` - professor - mobile - modo claro - implementado, falta validar com conta de professor real
- [ ] `/dashboard/avisos` e detalhe - professor - mobile - modo claro - implementado (partilha a folha da variante familiar), falta validar com conta de professor real
- [ ] `/dashboard/avisos` e detalhe - todas as variantes - desktop e modo escuro
- [ ] `/dashboard/calendario` - familia/aluno e professor - mobile - modo claro - implementado, falta validar com conta real
- [ ] `/dashboard/conta` - familia/aluno - mobile - modo claro - implementado, falta validar com conta real (ver nota no handoff)

## Familia e aluno

- [ ] Area familia/aluno - mobile e desktop - modo escuro - sistema implementado em localhost; falta auditoria visual autenticada rota a rota

- [ ] `/dashboard/alunos` - familia/aluno - mobile - modo claro - implementado, falta validar com conta real
- [ ] `/dashboard/materiais` - familia - mobile - modo claro - implementado, falta validar com conta real
- [ ] `/aluno/[alunoId]` - familia/aluno - mobile - modo claro - implementado, falta validar com conta real
- [ ] `/aluno/[alunoId]/horario` - familia/aluno - mobile - modo claro - implementado, falta validar com conta real
- [ ] `/aluno/[alunoId]/materiais` - familia/aluno - mobile - modo claro - implementado, falta validar com conta real
- [ ] `/aluno/[alunoId]/pedido` - familia/aluno - mobile - modo claro - passou ao Pinterest com a mesma moldura do percurso publico; a lista de escolhas e vestida por descendencia porque o CartaoLink e partilhado; visto em ensaio a 360 px com o CSS compilado; falta ver com conta real
- [ ] `/aluno/[alunoId]/reposicao/[aulaId]` - familia/aluno - mobile - modo claro - implementado e publicado (`703dd56`), falta validar com uma aula desmarcada elegivel

## Professor

> Auditoria de 3 de setembro de 2026: todas as rotas visiveis de professor
> receberam mobile, desktop vertical e tema escuro na branch. A ronda escura
> foi afinada entre `a730a0f` e `b5b77bf`. O historico individual esta preparado
> para resumo, agrupamento mensal e estados presente/falta, mas continua sem
> validacao com registos reais. Os `[ ]` abaixo preservam essa distincao entre
> implementado e validado, conforme a definicao de pagina concluida.

- [ ] `/dashboard/horarios` - professor - mobile - modo claro - implementado, falta validar com conta de professor real
- [ ] `/professor/horarios/[id]` - professor - mobile - modo claro - implementado, falta validar com conta de professor real
- [ ] `/dashboard/meus-alunos` - professor - mobile - modo claro - implementado e publicado (`c4891d5`), estado vazio validado; falta validar com alunos reais
- [ ] `/dashboard/meus-alunos/[matriculaId]` - professor - mobile - modo claro - implementado e publicado (`d88398b`), incluindo ficha, proposta de horario, materiais e confirmacao de desmatricula; falta validar com aluno real
- [ ] `/dashboard/pedidos` - professor - mobile - modo claro - implementado, falta validar com um pedido real pendente
- [ ] `/dashboard/presencas` - professor - mobile - modo claro - implementado e publicado (`60ca4c7`), estado sem pendencias validado; falta validar com aulas por confirmar
- [ ] `/dashboard/presencas/[horarioId]` - professor - mobile - modo claro - implementado e publicado (`890059f`, clareza revista em `8d4c9ca`), falta validar com um horario e alunos reais
- [ ] `/dashboard/presencas/confirmar` - professor - mobile - modo claro - implementado e publicado (`890059f`), estado vazio validado; falta validar com aulas pendentes
- [ ] `/dashboard/presencas/historico` - professor - mobile - modo claro - implementado e publicado (`24cb560`), estado vazio validado; falta validar com alunos
- [ ] `/dashboard/presencas/historico/[alunoId]` - professor - mobile - modo claro - implementado e publicado (`24cb560`), falta validar com registos reais
- [ ] `/dashboard/reposicoes` - professor - mobile - modo claro - implementado e publicado (`7d3c980`), formulario e estado vazio validados; falta testar vagas reais e popup de remocao
- [ ] `/dashboard/mensagens` - professor - mobile - modo claro - implementado e publicado (`7bce7b4`), estado vazio validado; falta testar composicao e historico com alunos reais
- [ ] `/dashboard/enviar-material` - professor - mobile - modo claro - implementado e publicado (`d88398b`), estado vazio validado; falta testar video, PDF e selecao com alunos reais
- [ ] `/dashboard/mensalidades` - professor - mobile - modo claro - implementado e publicado (`7d84fb0`), resumo e estado vazio validados; falta testar movimentos reais

## Administracao

- [x] `/admin` - secretaria - Home Pinterest concluida e validada com a conta real a 390 px e 1440 px; claro e escuro, sem overflow; preserva pedidos, numeros, avisos, recomendacoes e Musica para Bebes
- [x] `/admin/bebes` - secretaria - entrada de Musica para Bebes redesenhada em modo claro para mobile e desktop; resumo operacional e acessos a turmas e inscricoes
- [x] `/admin/bebes/horarios` - secretaria - gestao das duas turmas redesenhada em modo claro; horario, lotacao e professores responsivos
- [x] `/admin/bebes/pedidos` - secretaria - estado das turmas e fluxo de aceitar/recusar inscricoes redesenhados em modo claro para mobile e desktop
- [x] `/admin/alunos` - secretaria - diretorio redesenhado em modo claro para mobile e desktop; pesquisa, filtros, selecao, exportacao e dossier rapido preservados
- [x] `/admin/alunos/[alunoId]` - secretaria - ficha completa redesenhada em modo claro; contactos, matriculas, presencas, recomendacoes e mensalidades responsivos
- [x] `/admin/conta` - secretaria - dados, seguranca, painel de professor, aparencia, notificacoes, saida e zona sensivel redesenhados; validado a 390 px e 1440 px em claro e escuro
- [ ] `/admin/alunos` - administracao - mobile - modo claro - tratamento Pinterest so abaixo dos 720 px, a mesa do computador fica como estava; lista, folha do dossier e alvos de toque vistos em ensaio a 360 px; falta ver com conta de administrador real
- [ ] `/admin/alunos/[alunoId]`
- [x] `/admin/professores` - secretaria - diretorio, pedidos pendentes, convite e pesquisa preservados; modo claro responsivo
- [x] `/admin/professores/[professorId]` - secretaria - ficha de gestao responsiva com atalhos, evolucao de alunos e Programa de Recomendacao
- [x] `/admin/professores/[professorId]/alunos` - secretaria - diretorio compacto e pesquisavel dos alunos do professor
- [x] `/admin/professores/[professorId]/conta` - secretaria - dados, disciplinas e edicao da ficha publica em mobile e desktop
- [x] `/admin/professores/[professorId]/horario` - secretaria - criacao de disponibilidade e grelha semanal responsiva com scroll contido
- [x] `/admin/professores/disciplinas` - secretaria - pedidos pendentes e historico de respostas redesenhados para mobile e desktop
- [x] `/admin/pagamentos` - secretaria - entrada de Mensalidades concluida em mobile e desktop, modo claro
- [x] `/admin/pagamentos/confirmar` - secretaria - pendentes priorizados e professores em dia; validado com dados reais a 390 px e 1440 px
- [x] `/admin/pagamentos/confirmar/[professorId]` - secretaria - valor, isencao CCG, fatura e confirmacao reorganizados; validado com duas mensalidades reais em mobile e desktop
- [x] `/admin/pagamentos/historico` - secretaria - diretorio de professores concluido em mobile e desktop, modo claro
- [x] `/admin/pagamentos/historico/[professorId]` - secretaria - arquivo anual responsivo, scroll interno e coluna do aluno fixa; validado com dados reais em mobile e desktop
- [x] `/admin/recomendacoes` - secretaria - visao geral responsiva em modo claro, com balanco, acoes, indicacoes por confirmar e registos
- [x] `/admin/recomendacoes/[id]` - secretaria - detalhe responsivo com estado, beneficio, correcoes administrativas e anulacao
- [x] `/admin/recomendacoes/nova` - secretaria - registo guiado responsivo, incluindo tratamento de indicacoes por confirmar
- [x] `/admin/recomendacoes/estudo` - secretaria - indicadores, balanco, comparacao e tabelas responsivas com exportacao CSV
- [x] `/admin/avisos` - secretaria - caixa de entrada responsiva em claro e escuro, com estados lido/novo, acoes e ponte para os avisos de professor
- [x] `/admin/avisos/[avisoId]` - secretaria - leitura e acao contextual no mesmo modelo final dos avisos de aluno e professor
- [x] `/admin/mensagens` - compositor completo e historico responsivos em claro e escuro; falta apenas inspecao autenticada com dados reais
- [x] `/admin/administradores` - super administracao - pesquisa, promocao e diretorio de acessos redesenhados para mobile/desktop, claro/escuro
- [x] `/admin/administradores/[id]` - super administracao - identidade, acesso, papel e acoes sensiveis reorganizados para mobile/desktop, claro/escuro

## Sem interface propria

Nao redesenhar estas rotas; apenas redirecionam:

- `/aluno/calendario` -> `/dashboard/calendario`
- `/aluno/notificacoes` -> `/dashboard/avisos`

## Ordem recomendada imediata

1. `/dashboard/conta`
2. `/dashboard/alunos`
3. paginas `/aluno/[alunoId]/*`
4. `/dashboard/agenda` e detalhe - professor

## Regra de atualizacao

Ao concluir uma variante, registar na mesma linha: variante, viewport/modo, commit e uma nota curta se tiver criado um padrao reutilizavel. Atualizar tambem a seccao "Estado aprovado ate agora" de `DESIGN_PINTEREST_HANDOFF.md`.
