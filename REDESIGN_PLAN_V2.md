# Plano de redesign v2 — Home perfeita → propagação → simplificação

Sequência pedida: design system → Home perfeita → aplicar às restantes
páginas → passagem final de simplificação. Este documento cobre os
passos 2–5. Nenhum código de página foi escrito a partir daqui — só os
3 componentes de baixo nível já feitos antes desta pausa (`AnelProgresso`,
`BottomNavigation`, `Chip`), que não estão ligados a nenhuma página.

---

## 2. Design system — feito

`DESIGN_SYSTEM_V2.md`. Não repito aqui.

---

## 3. Home perfeita

Esta app tem **duas homes diferentes por natureza** — não um único ecrã
com variantes cosméticas. O encarregado gere um ou mais perfis de aluno
(filhos); o professor gere a sua agenda. Definir as duas.

### 3.1 Home do encarregado/aluno

**Hero** (gradiente, ~42% do ecrã)
```
Bom dia, Francisco                    ← Display, Fraunces 600, branco
Tens 2 aulas esta semana              ← Body, branco 85% opacidade

                 [sem anel]

Próxima aula
Piano — Helena Rodrigues               ← cartão sobre o hero, vidro
Quarta, 16h20                          leve (mesmo tratamento do anel,
                                        não um card branco opaco)
```

**Porque não o anel aqui**: a métrica natural do teu briefing seria
"assiduidade", mas um encarregado pode gerir vários filhos — uma
percentagem só faz sentido por filho, não por conta. Forçar um anel
médio seria exatamente o erro que pediste para evitar ("não inventes
métricas sem significado só para reproduzir o círculo"). Em vez disso,
o hero usa o **Numeral Hero** em modo texto: contagem real (aulas
confirmadas dos filhos, esta semana — soma de `matriculas` com
`horario_final_id` cujo dia cai nos próximos 7 dias). Se for 0, o texto
muda para "Sem aulas esta semana" (ainda hero, ainda dominante — não um
espaço vazio).

O cartão "Próxima aula" só aparece se existir uma aula confirmada
futura. Sem essa aula, o hero acaba na frase de contagem — não força um
segundo bloco vazio.

**Content surface** (branco, cantos superiores 24px)
```
Os teus alunos                         ← Heading2, só se > 1 filho
[Cartão: Rodrigo, 8 anos]               (se só houver 1, salta direto
[Cartão: Maria, 11 anos]                 para o conteúdo desse filho —
                                          é o que o encarregado quer ver
                                          primeiro, não uma lista de 1)

Pedidos pendentes (1)                  ← só aparece se > 0
[linha: Piano, a aguardar confirmação]

Mensalidades                           ← só aparece se houver algo por
[linha: Piano — Outubro, 45€]            pagar; nunca lista o que já
                                          está pago
```

Regra de progressive disclosure: cada secção só existe se tiver
conteúdo acionável. Nada de "Não tens pedidos pendentes" como secção
própria — isso é o `EmptyState` dentro da página dedicada, não ruído na
Home.

**Bottom nav** (5 itens, 1 filho vs. vários não muda a nav)
```
Início · Horário · [+ Pedir aula] · Mensalidades · Conta
```
"+" central = `/aluno/[alunoId]/pedido` do filho mais recentemente
usado, ou escolhe o filho primeiro se houver mais que um.

### 3.2 Home do professor

**Hero**
```
Bom dia, Helena

        ┌──────────────┐
        │   ANEL        │   ← métrica: ocupação da agenda esta semana
        │   Ocupação     │     (horários confirmados ÷ horários
        │     72%        │     disponíveis, 7 dias) — real, calculável,
        │   72%          │     e diretamente relevante para um professor
        └──────────────┘       (mostra se a agenda está cheia ou vazia)

Próxima aula
Rodrigo Silva — Piano
Hoje, 16h20 — Sala B12
```

Se não houver horários definidos ainda (professor novo), o anel não
aparece — cai para o texto "Ainda não tens horários definidos" +
CTA para `/dashboard/horarios` (o próprio `EmptyState`, dentro do hero).

**Content surface**
```
Pedidos por responder (3)              ← só se > 0, com badge
[linha: Rodrigo — Piano]
[linha: Maria — Guitarra]

Presenças por confirmar                ← só se houver aulas passadas
[linha: Hoje, 16h20 — Piano]             sem presença marcada

Mensalidades por confirmar             ← só se houver, este mês
```

**Bottom nav**
```
Início · Agenda · [+ Pedidos] · Mensalidades · Conta
```
"+" central = `/dashboard/pedidos` (a ação mais frequente e mais
urgente de um professor, segundo a própria auditoria da Fase 1).

### 3.3 O que NÃO entra na Home (progressive disclosure)

- Calendário escolar completo → link, não conteúdo embutido.
- Lista completa de horários da semana → só "próxima aula"; o resto
  vive em `/dashboard/agenda` ou `/aluno/[id]/horario`.
- Detalhes de mensalidades linha a linha → só o total pendente + link.
- Qualquer administração (convites, recomendações) → fora da Home,
  mesmo para admins.

---

## 4. Propagação às restantes páginas

Regra geral: **hero em gradiente só na Home** (é o único ecrã "de
entrada" por sessão). As restantes páginas usam:
- cabeçalho simples branco com título Heading + `BackButton`;
- a mesma content surface (branco, cards, `Chip`, `ListItem`);
- `AnelProgresso` reaproveitado pontualmente onde fizer sentido (ex:
  ficha de aluno em `/admin/alunos/[id]` podia mostrar a assiduidade
  desse aluno especificamente — aí sim a percentagem tem um dono claro).

| Página | Mudança |
|---|---|
| `/dashboard`, `/aluno/[id]` | Home perfeita (secção 3) |
| `/dashboard/agenda`, `/aluno/[id]/horario` | Lista cronológica "Hoje" primeiro (já é como o briefing pede — só a pele muda: `ListItem` novo, sem grelha semanal como entrada) |
| `/dashboard/pedidos` | Lista de `ListItem`, ação principal = `Chip`/botão pill inline |
| `/dashboard/mensalidades`, `/admin/pagamentos/*` | Resumo primeiro (total pendente, Numeral médio), tabela/detalhe só ao abrir |
| `/dashboard/presencas/*` | Igual — resumo, depois lista |
| `/admin/*` | Mesma linguagem (cards, pill buttons), sem hero em gradiente (são ecrãs de gestão, não de entrada) |
| `/pedir-aula` (wizard público) | Content surface só, sem hero — é um fluxo de decisão, não uma home |
| Modais/confirmações | `BottomSheet` (novo) substitui o `ModalShell` centrado onde fizer sentido em mobile — mantém Radix por baixo |

Componentes a construir a seguir (por esta ordem, porque cada página
depende dos anteriores): `Avatar`, `BottomSheet`, `ListItem`,
`SectionHeader`, botões pill, `AppShell`. Só depois as páginas.

---

## 5. Passagem de simplificação

Aplicando a própria regra do briefing (secção 30–31) a este plano:

- **Cortado**: um `AppShell` genérico com hero sempre presente — só a
  Home tem hero. As outras páginas não precisam de reimplementar o
  gradiente, só o cabeçalho branco simples.
- **Cortado**: mostrar todos os filhos em cartões separados quando só
  há um — vai direto ao conteúdo desse filho.
- **Cortado**: secções vazias com `EmptyState` na Home — só entram
  quando há dados; a Home nunca mostra "0 pedidos pendentes" como bloco.
- **Cortado**: dia-seletor (chips M T W T F S) na Home — pertence à
  página de horário, não à Home; a Home só mostra "próxima aula".
- **Mantido apesar da tentação de cortar**: o anel de progresso — é a
  única secção da Home do professor com um número imediatamente
  compreensível (ocupação da agenda); sem ele a Home do professor
  ficava só texto.

---

## 6. Refinamentos confirmados (2026-08-14)

Respostas às 6 perguntas de confirmação — substituem partes da secção 3:

1. **Hero do encarregado** — confirmado: "X aulas esta semana" (contagem).
2. **Hero do professor** — ajustado de novo: mantém o **anel de
   ocupação da agenda** (proposta original), e as **próximas 3 aulas**
   passam a ser a primeira secção da content surface, logo a seguir ao
   hero — não dentro do próprio hero, para não sobrecarregar esse
   espaço com anel + lista ao mesmo tempo. O professor vê o anel ao
   entrar, e a lista está imediatamente visível a seguir, sem scroll
   significativo.
3. **Vários filhos** — muda: em vez de sem anel / anel médio, cada
   filho tem o **seu próprio anel** de assiduidade — mas não no hero
   (só há um hero). O anel de cada filho vive no cartão desse filho, na
   content surface. `AnelProgresso` ganha uma variante compacta
   (`tamanho="pequeno"`) para caber num cartão de lista.
4. **Bottom nav** — confirmada tal como proposta.
5. **Encarregado com 1 só filho** — muda: em vez de navegar para a
   página do filho, a Home mostra **diretamente na content surface** o
   resumo desse filho (próxima aula, anel de assiduidade, pedidos
   pendentes) — sem passo intermédio, mas também sem sair da Home.
6. **`/` (pública) e `/admin`** — incluídos também. Ambos ganham hero
   em gradiente:
   - `/` (sem sessão): hero institucional (o "Conhece as nossas Escolas
     Artísticas" atual, em Display), sem saudação nem número pessoal —
     não há utilizador ainda. Content surface: as 3 escolas.
   - `/admin`: hero com saudação + **Numeral Hero = pedidos por
     confirmar** (a tarefa mais acionável de um admin, paralelo à
     lógica já usada no professor). Content surface: os stat-tiles e os
     hubs já agrupados (Fase 2 anterior), só com a pele nova.

### Home do encarregado — versão final

```
HERO
Bom dia, Francisco
3 aulas esta semana                    ← Numeral Hero, sem anel

CONTENT SURFACE
— Se 1 filho: resumo do Rodrigo direto aqui —
Próxima aula: Piano, quarta 16h20
[anel pequeno] Assiduidade — 92%
Pedidos pendentes (0) → não mostra secção

— Se >1 filho —
Os teus alunos
[cartão Rodrigo: próxima aula + anel pequeno de assiduidade]
[cartão Maria: próxima aula + anel pequeno de assiduidade]

Mensalidades (só se houver pendente)
```

### Home do professor — versão final

```
HERO
Bom dia, Helena

        [ANEL]
     Ocupação da agenda
          72%

CONTENT SURFACE
Próximas aulas                          ← primeira secção, sem scroll
Hoje, 16h20 — Piano, Rodrigo Silva
Amanhã, 10h00 — Guitarra, Maria Costa
Quinta, 17h10 — Piano, António Reis

Pedidos por responder (3)
Presenças por confirmar
Mensalidades por confirmar
```

`AnelProgresso` tem agora dois tamanhos de uso: grande, no hero do
professor (ocupação da agenda); e pequeno, dentro dos cartões de filho
na Home do encarregado e em fichas individuais (`/admin/alunos/[id]`).

---

## 7. Estado da implementação (2026-08-14)

**Feito:**
- Tokens v2 em `globals.css` (cor, gradiente, raios, sombra, easing).
- Componentes novos: `AnelProgresso` (grande/pequeno), `PaginaComHero` +
  `HeroSaudacao`, `BottomNavigation`, `PageHeader`, `LinhaLista` /
  `GrupoLista` / `TituloSeccao`, `BottomSheet`, `Chip`, `Avatar`.
- Botões em pill (primário/secundário/terciário/destrutivo).
- Home pública `/`, Home do professor, Home do encarregado, `/admin` —
  todas com hero em gradiente.
- Navegação inferior nos layouts de `/dashboard`, `/aluno/[id]`, `/admin`
  (destinos por perfil).
- `PageHeader` nas 38 páginas interiores, com espaço reservado para a nav
  não tapar conteúdo.
- `OptionCard` eliminado (substituído por `LinhaLista`); ~220 linhas de
  CSS morto removidas do `globals.css`.

**Desvios ao plano, com razão:**
- **Anel de assiduidade → progresso da semana.** A RLS da migração
  `0002_presencas.sql` esconde presenças do encarregado por decisão
  deliberada. Em vez de alterar permissões, o anel passou a mostrar
  "aulas desta semana já dadas", calculado só com horários (dados que o
  encarregado já vê). Nota: à segunda-feira mostra `0/N` com o anel
  vazio — correto, mas vale a pena saber.
- **Nav do encarregado: Notificações em vez de Mensalidades.** Não
  existe vista de mensalidades para encarregados nesta app; Notificações
  é uma página real com valor real.

**Por fazer:**
- Migrar as classes `lista-item` / `secao-titulo` (ainda em ~14 e ~7
  ficheiros) para `LinhaLista` / `TituloSeccao`.
- `botao-cartao` e `saudacao` no CSS têm poucos consumidores — avaliar
  se vale a pena migrar ou manter.
- Verificação visual das páginas interiores com dados reais.
