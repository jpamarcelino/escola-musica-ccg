# Inventario do Design Pinterest

Ler primeiro `DESIGN_PINTEREST_HANDOFF.md`. Este checklist regista o estado por rota e variante. `[x]` significa que a variante indicada cumpre a definicao de concluida do guia; nao significa automaticamente desktop ou modo escuro.

## Concluido no Design Pinterest

- [x] `/dashboard` - familia/aluno - mobile - modo claro (`d9b22d2`, acabamento `067da9d`)

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
- [ ] `/legal`
- [ ] `/legal/[documento]`

## Internas partilhadas

- [ ] `/dashboard` - professor - mobile - modo claro
- [ ] `/dashboard` - todas as variantes - desktop
- [ ] `/dashboard` - todas as variantes - modo escuro
- [ ] `/dashboard/agenda`
- [ ] `/dashboard/agenda/[horarioId]`
- [ ] `/dashboard/avisos`
- [ ] `/dashboard/avisos/[avisoId]`
- [ ] `/dashboard/calendario`
- [ ] `/dashboard/conta`
- [ ] `/dashboard/conta/avancado`

## Familia e aluno

- [ ] `/dashboard/alunos`
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

1. `/dashboard/agenda`
2. `/dashboard/agenda/[horarioId]`
3. `/dashboard/avisos`
4. `/dashboard/avisos/[avisoId]`
5. `/dashboard/conta`
6. `/dashboard/alunos`
7. `/dashboard/mensalidades` - familia
8. paginas `/aluno/[alunoId]/*`

## Regra de atualizacao

Ao concluir uma variante, registar na mesma linha: variante, viewport/modo, commit e uma nota curta se tiver criado um padrao reutilizavel. Atualizar tambem a seccao "Estado aprovado ate agora" de `DESIGN_PINTEREST_HANDOFF.md`.
