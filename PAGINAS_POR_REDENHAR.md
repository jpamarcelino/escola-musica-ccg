# Inventario do Design Pinterest

Ler primeiro `DESIGN_PINTEREST_HANDOFF.md`. Este checklist regista o estado por rota e variante. `[x]` significa que a variante indicada cumpre a definicao de concluida do guia; nao significa automaticamente desktop ou modo escuro.

## Concluido no Design Pinterest

- [x] `/dashboard` - familia/aluno - mobile - modo claro (`d9b22d2`, acabamento `067da9d`)
- [x] `/dashboard/agenda` - familia/aluno - mobile - modo claro (`f9c973c`)
- [x] `/dashboard/avisos` - familia/aluno - mobile - modo claro (`5c12018`, hierarquia afinada em `0e1940f`)
- [x] `/dashboard/avisos/[avisoId]` - familia/aluno - mobile - modo claro (`5c12018`)

## Publicas pendentes no Design Pinterest

Estas rotas funcionam com o design herdado da `main`, mas todas precisam de redesign ou revisao completa antes de receberem `[x]`.

- [ ] `/`
- [ ] `/pedir-aula`
- [ ] `/professor/[professorId]`
- [ ] `/login`
- [ ] `/registo`
- [ ] `/esqueci-password`
- [ ] `/redefinir-password`
- [ ] `/instalar`
- [ ] `/legal` - publica - mobile - modo claro - implementado, falta validar visualmente
- [ ] `/legal/[documento]` - publica - mobile - modo claro - implementado, falta validar visualmente

## Internas partilhadas

- [ ] `/dashboard` - professor - mobile - modo claro
- [ ] `/dashboard` - todas as variantes - desktop
- [ ] `/dashboard` - todas as variantes - modo escuro
- [ ] `/dashboard/agenda` - professor - mobile - modo claro
- [ ] `/dashboard/agenda` - todas as variantes - desktop e modo escuro
- [ ] `/dashboard/agenda/[horarioId]`
- [ ] `/dashboard/avisos` e detalhe - professor - mobile - modo claro
- [ ] `/dashboard/avisos` e detalhe - todas as variantes - desktop e modo escuro
- [ ] `/dashboard/calendario` - familia/aluno e professor - mobile - modo claro - implementado, falta validar com conta real
- [ ] `/dashboard/conta` - familia/aluno - mobile - modo claro - implementado, falta validar com conta real (ver nota no handoff)
- [ ] `/dashboard/conta/avancado`

## Familia e aluno

- [ ] `/dashboard/alunos` - familia/aluno - mobile - modo claro - implementado, falta validar com conta real
- [ ] `/dashboard/materiais`
- [ ] `/dashboard/mensalidades` - variante familia
- [ ] `/aluno/[alunoId]`
- [ ] `/aluno/[alunoId]/horario`
- [ ] `/aluno/[alunoId]/materiais`
- [ ] `/aluno/[alunoId]/pedido`
- [ ] `/aluno/[alunoId]/reposicao/[aulaId]`

## Professor

- [ ] `/dashboard/horarios`
- [ ] `/professor/horarios/[id]`
- [ ] `/dashboard/meus-alunos`
- [ ] `/dashboard/meus-alunos/[matriculaId]`
- [ ] `/dashboard/pedidos`
- [ ] `/dashboard/presencas`
- [ ] `/dashboard/presencas/[horarioId]`
- [ ] `/dashboard/presencas/confirmar`
- [ ] `/dashboard/presencas/historico`
- [ ] `/dashboard/presencas/historico/[alunoId]`
- [ ] `/dashboard/reposicoes`
- [ ] `/dashboard/reposicoes/pedidos`
- [ ] `/dashboard/mensagens`
- [ ] `/dashboard/enviar-material`
- [ ] `/dashboard/mensalidades` - variante professor

## Administracao

- [ ] `/admin`
- [ ] `/admin/conta`
- [ ] `/admin/alunos`
- [ ] `/admin/alunos/[alunoId]`
- [ ] `/admin/professores`
- [ ] `/admin/professores/[professorId]`
- [ ] `/admin/professores/[professorId]/alunos`
- [ ] `/admin/professores/[professorId]/conta`
- [ ] `/admin/professores/[professorId]/horario`
- [ ] `/admin/professores/disciplinas`
- [ ] `/admin/pagamentos`
- [ ] `/admin/pagamentos/confirmar`
- [ ] `/admin/pagamentos/confirmar/[professorId]`
- [ ] `/admin/pagamentos/historico`
- [ ] `/admin/pagamentos/historico/[professorId]`
- [ ] `/admin/recomendacoes`
- [ ] `/admin/recomendacoes/[id]`
- [ ] `/admin/recomendacoes/nova`
- [ ] `/admin/recomendacoes/estudo`
- [ ] `/admin/avisos`
- [ ] `/admin/avisos/[avisoId]`
- [ ] `/admin/mensagens`
- [ ] `/admin/administradores`
- [ ] `/admin/administradores/[id]`

## Sem interface propria

Nao redesenhar estas rotas; apenas redirecionam:

- `/aluno/calendario` -> `/dashboard/calendario`
- `/aluno/notificacoes` -> `/dashboard/avisos`

## Ordem recomendada imediata

1. `/dashboard/conta`
2. `/dashboard/alunos`
3. `/dashboard/mensalidades` - familia
4. paginas `/aluno/[alunoId]/*`
5. `/dashboard/agenda` e detalhe - professor

## Regra de atualizacao

Ao concluir uma variante, registar na mesma linha: variante, viewport/modo, commit e uma nota curta se tiver criado um padrao reutilizavel. Atualizar tambem a seccao "Estado aprovado ate agora" de `DESIGN_PINTEREST_HANDOFF.md`.
