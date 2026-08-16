# Design System v2 — Centro Cultural da Guarda

Substitui a direção visual do `DESIGN_SYSTEM.md` original (papel/tinta,
plano, sem gradientes). Esta é uma decisão de produto deliberada — pivot
completo, não uma evolução — confirmada em sessão a 2026-08-14.

Mantém-se apenas o que é *facto de marca*, não estilo: o logótipo real do
Centro Cultural da Guarda, o nome da instituição, o português de Portugal,
e as regras de negócio (matrículas, horários, presenças, mensalidades).
Tudo o resto — cor, forma, superfícies, motion — é novo.

**Este documento define tokens e componentes. Não implementa nada.**
Fase seguinte, quando aprovado: aplicar ecrã a ecrã.

---

## 1. Filosofia

Referência de direção: **DailyMe** (Phenomenon Studio) — não copiada
literalmente, mas usada para os princípios de hierarquia, composição e
motion. Adaptada a uma escola de música, não a nutrição.

Continuidade genuína com a marca (não escolhas arbitrárias):
- **Azul do logótipo** — os três tons que já existiam (`#78AEDE → #3D7FB8 →
  #1B4F7A`) formam por acaso uma rampa perfeita para o gradiente que a
  nova direção pede. Não é uma cor nova, é a mesma cor, tratada de forma
  diferente.
- **Fraunces + Inter** — o par serifada/sans que já existia mapeia bem no
  padrão da referência (título com uma palavra em itálico serifado dentro
  de uma frase a negrito sans). Mantém-se, só muda a escala.
- **Lucide** — biblioteca de ícones já adotada nesta sessão, mantém-se.

Regra permanente (do teu briefing, secção 30): antes de acrescentar
qualquer cartão, cor, borda, sombra, ícone ou animação — pergunta se
melhora mesmo a compreensão. Se não, não entra.

---

## 2. Cor

Paleta pequena e controlada. Cada cor tem um trabalho.

```
Primary            #1B4F7A   (azul-fundo — o mais escuro dos 3 azuis)
Primary light      #78AEDE   (azul-logo — o mais claro dos 3 azuis)
Gradient (hero)     linear-gradient(160deg, #467BA8 0%, #2E628E 45%, #1B4F7A 100%)

  NOTA: o gradiente NÃO usa o #78AEDE original no topo. Com texto branco
  por cima dava 2.36:1, muito abaixo do mínimo AA (4.5:1). Foi escurecido
  até 4.51:1 no ponto mais claro. Todo o texto do hero é branco puro —
  as opacidades (85%, 75%) que existiam derrubavam o contraste para 3.74
  e foram removidas; a hierarquia vem do tamanho e do peso.

Ink (CTA / bottom nav)   #241F1C   (o "preto" da DailyMe — mas o tinta que já
                                    existia, nunca #000 puro)

Background          #FFFFFF
Surface             #FFFFFF
Surface raised      #F5F6F8   (agrupamento subtil, sem borda)

Text primary         #241F1C
Text secondary       #6B615A
Text on-color        #FFFFFF  (sobre gradiente ou sobre Ink)

Positive            #4B8B6B   (assiduidade boa, tarefa concluída)
Warning             #A8763A   (o dourado que já existia — usar com conta)
Error               #9A3B2E   (já em uso nesta sessão — MensagemErro, AlertDialog)
```

Regra: cor de estado só aparece quando significa algo (presença, aviso,
erro). Nunca por decoração. Nunca verde/vermelho/amarelo "para dar
variedade".

### Tailwind v4 — bloco `@theme` (proposto, para quando a implementação avançar)

```css
@theme {
  --color-primary:         #1B4F7A;
  --color-primary-light:   #78AEDE;
  --color-primary-mid:     #3D7FB8;
  --color-ink:             #241F1C;
  --color-background:      #FFFFFF;
  --color-surface-raised:  #F5F6F8;
  --color-text-primary:    #241F1C;
  --color-text-secondary:  #6B615A;
  --color-positive:        #4B8B6B;
  --color-warning:         #A8763A;
  --color-error:           #9A3B2E;

  --gradient-hero: linear-gradient(160deg, #78AEDE 0%, #3D7FB8 45%, #1B4F7A 100%);
}
```

---

## 3. Tipografia

Saltos fortes de escala — nunca dois níveis com o mesmo peso visual.

| Nível | Família | Tamanho | Peso | Uso |
|---|---|---|---|---|
| Numeral hero | Fraunces | 56–64px | 700 | O número que domina o ecrã ("87%", "5 aulas") |
| Display | Fraunces | 32–40px | 600 | Saudação ("Bom dia, Francisco"), título de hero |
| Display accent | Fraunces *itálico* | igual ao Display | 500 | Palavra de destaque dentro do Display (herda o padrão já usado na home atual) |
| Heading | Fraunces | 22–24px | 600 | Título de secção |
| Heading 2 | Inter | 17px | 700 | Subtítulo de secção, título de cartão |
| Body | Inter | 15px | 400 | Texto normal |
| Body secondary | Inter | 14px | 400 | Descrições, `--color-text-secondary` |
| Caption | Inter | 12.5px | 500 | Metadata, horas, labels |
| Label maiúsculas | Inter | 9.5–11px | 600, tracking .14em | Eco do "C E N T R O" do logótipo — manter, não abusar |

Diferença chave face ao sistema anterior: o **numeral hero** é uma
categoria nova, propositadamente enorme, exclusiva para a informação mais
importante do ecrã (uma só por ecrã).

---

## 4. Espaçamento

Grid de 4px.

```
4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64
```

Padding horizontal mobile: **20–24px**. Generoso de propósito — espaço
vazio é parte da interface, não folga a preencher.

---

## 5. Raios

```
small        12px   inputs, chips pequenos
medium       18px   cards
large        24px   sheets, superfície de conteúdo sobre o hero
extra-large  32px   hero, imagens grandes
pill        999px   botões, bottom nav, chips, seletor de dia
```

---

## 6. Sombras

Quase nenhuma. Uma única sombra "flutuante", para elementos que
literalmente flutuam sobre conteúdo (bottom nav, bottom sheet, modal):

```css
--shadow-flutuante: 0 8px 24px rgba(27, 79, 122, 0.16);
```

Nada de `box-shadow` pesado em cards normais. Separação por espaço,
contraste de fundo e agrupamento — não por sombra.

---

## 7. Superfícies — as duas linguagens

**Hero (área de destaque)**
- `--gradient-hero`, ocupa a parte superior do ecrã (~40–45% em ecrãs de
  hub/dashboard).
- Texto sempre branco.
- Elemento central: o **anel de progresso** (secção 9) — o único sítio
  onde se usa um efeito "vidro": `backdrop-filter: blur(20px)` sobre um
  `background: rgba(27,79,122,.18)`, borda `1px solid rgba(255,255,255,.35)`.
  Não usar vidro em mais nenhum sítio da app.

  NOTA: o preenchimento **escurece** (azul-fundo) em vez de clarear
  (branco). Um véu branco a 12% subia a luminosidade e derrubava o
  contraste do texto branco para 4.04:1. Assim o anel passa AA em
  qualquer ponto do gradiente (5.04:1 no pior caso).

**Content surface**
- Fundo branco, `border-radius` `large` (24px) só nos cantos superiores,
  sobrepõe-se ao hero a meio do ecrã.
- Aqui vivem as listas, os cards, os formulários — tudo o resto do
  DESIGN_SYSTEM.md original quanto a "não cartão dentro de cartão"
  continua válido.

---

## 8. Cards

Regra inalterada do briefing: um cartão só existe quando agrupa
informação com relação semântica real.

```
padding        20px
border-radius  medium (18px)
border         nenhuma, ou 1px rgba(0,0,0,.04) só quando o fundo não
               chega para separar visualmente
sombra         nenhuma (usar --shadow-flutuante só se o cartão for
               acionável e precisar de se distinguir de uma lista estática)
```

Um cartão normal: título + informação principal + contexto +
(opcionalmente) uma ação. Nunca cartão dentro de cartão.

---

## 9. Anel de progresso (peça nova, sem equivalente no sistema antigo)

Mapeamento direto de dados reais, não uma métrica inventada — regra do
teu briefing (secção 5): "se não existir uma métrica relevante, usa a
próxima informação realmente útil."

Candidatos reais, por perfil:
- **Aluno/encarregado**: assiduidade do mês (`presenças confirmadas /
  aulas agendadas`) — já existe nos dados (tabela `presencas`).
- **Professor**: aulas confirmadas esta semana vs. horários disponíveis,
  ou pedidos por responder (já existe: `matriculas.estado`).
- Sem dado suficiente → não forçar o anel. Cair para o próximo bloco
  mais útil (ex: próxima aula), como o briefing manda.

Visual: círculo grande, vidro sobre o gradiente, número enorme (Numeral
hero) ao centro, label por cima (Caption maiúsculas), legenda por baixo.

---

## 10. Botões

```
Primary      pill, --color-ink de fundo, texto branco, altura 56px
Secondary    pill, transparente, borda 1.5px --color-ink (ou branco
             sobre o hero), texto da mesma cor da borda
Tertiary     sem fundo nem borda, sublinhado, --color-text-secondary
Destructive  pill, texto/borda --color-error (já implementado nesta
             sessão via BotaoAcaoDestruir — reaproveitar a lógica,
             só a forma muda para pill)
```

Um ecrã, uma ação primária. Nunca dois CTAs pretos no mesmo ecrã.

---

## 11. Navegação inferior

Cápsula preta (`--color-ink`), flutuante, **não** cola às bordas do ecrã
— margem lateral de 16–20px e alguma margem inferior. `border-radius`
pill. Sombra `--shadow-flutuante`.

Itens (determinados pelas funcionalidades reais, não pelos da DailyMe):

| Ícone | Destino |
|---|---|
| Casa | Hub / dashboard |
| Calendário | Horário / agenda |
| **+** (destacado, círculo branco) | Ação contextual: pedir aula (aluno) ou marcar presença (professor) |
| Carteira | Mensalidades |
| Perfil | Conta |

5 destinos, não 7–8. O botão central é sempre o mais destacado
(fundo branco sobre a cápsula preta), como na referência.

---

## 12. Motion

```
micro feedback         120–180ms
transições de componente 200–300ms
transições de página     250–350ms
easing                  cubic-bezier(0.22, 1, 0.36, 1)
pressed                 scale(1) → scale(0.97) → scale(1)
conteúdo a aparecer     opacity 0→1 + translateY(8px)→0
bottom sheet            translateY(100%)→0, mesmo easing
```

Respeita sempre `prefers-reduced-motion` (já implementado nesta sessão
em vários componentes — manter o padrão).

---

## 12b. Cores da marca institucional (≠ cores da UI)

Retiradas do **Manual de Normas Gráficas do CCG (2026)**, secção "Cores /
Pantones". Os hex são os do próprio ficheiro vetorial do manual, não
conversões aproximadas de Pantone:

```
--marca-ciano     #00C4DF   Pantone 311 C    o ciano da pincelada
--marca-vermelho  #DC291E   Pantone 485 C    o acento sobre "cultural"
--marca-preto     #231F20   Pantone Black
```

**Estas cores não são cores de interface.** Servem a marca — ecrã de
carregamento, splash, favicon. O ciano institucional é vibrante de mais
para texto corrido e não passa contraste AA sobre branco; a UI continua
na paleta da secção 2 (`--color-primary` e companhia).

Tipografia da identidade: **Frutiger** (45 Light / 55 Roman / 65 Bold /
95 Ultra Bold). Não está em uso na app — não há licença web — e a
secção 3 mantém-se como está. Fica registado para materiais impressos.

## 12c. Ecrã de carregamento

`EcraCarregamento` / `EcraCarregamentoAdiado` (`ecra-carregamento.tsx`),
com o símbolo em `simbolo-ccg.tsx` — o vetor original do manual, inline
para poder herdar `currentColor` e para não depender da rede justamente
quando a rede está lenta.

A animação não é decorativa: sai da frase do manual sobre o símbolo, que
diz que a sua representação em efeito espelho *"simboliza a ideia de que
a cultura reflete a identidade de uma região, funcionando como o seu
espelho e expressão viva"*. Daí a sequência:

```
0–450ms    a pincelada abre a partir do ponto onde o pincel tocou
400–900ms  o reflexo responde-lhe, e não antes
900ms+     os dois respiram em contratempo (2.8s)
sempre     barra indeterminada — o sinal honesto de "ainda a trabalhar"
```

**Onde aparece.** Em toda a app. Cada área tem o seu `loading.tsx` e
passa-lhe uma mensagem que nomeia o destino — "A abrir a secretaria…",
"A abrir o caderno…", "A preparar a escolha…" — em vez do genérico "A
carregar…", porque nomear o que vem torna a espera compreensível. O
`app/loading.tsx` da raiz fica com o arranque e com as rotas sem
`loading.tsx` próprio.

Duas variantes: `cobrirEcra` sobrepõe-se à página; `manterNavegacao`
baixa o z-index e deixa a barra inferior utilizável por baixo, para uma
transição de rota não prender quem quer ir a outro lado.

**O atraso de 400ms vive em CSS**, não em JavaScript — `animation-delay`
com `backwards` em `.ecra-carregamento`. Um splash que pisca durante
120ms deixa o produto pior: vê-se o clarão sem o conseguir ler e fica a
sensação de que a app estremeceu. A primeira versão fazia isto com
`useState` e `setTimeout`, e estava errada: um componente de cliente
devolve `null` no render do servidor, por isso o ecrã nunca entrava no
HTML transmitido em streaming — que é precisamente o caso do arranque.
Em CSS funciona nos dois lados e o componente não precisa de JavaScript
nenhum.

**Armadilha do App Router.** Um `loading.tsx` na raiz não cobre
navegações do lado do cliente entre rotas irmãs: o boundary da raiz é
montado uma vez e o React não volta a mostrar o fallback de um boundary
já montado durante uma transição. Só um segmento novo faz aparecer um
fallback — daí cada área ter o seu.

> **Nota histórica.** Este documento chegou a dizer que `/dashboard`,
> `/admin`, `/aluno` e `/pedir-aula` respondiam com **esqueleto**, para
> se ver o layout a formar-se. Era verdade até o `skeleton.tsx` ser
> retirado e a app passar a tratar a espera no movimento entre páginas
> (`page-transition.tsx`, `navigation-feedback.tsx`) com este ecrã por
> cima. **Não há esqueletos na app.**

---

## 13. Componentes a construir/refatorar

Reaproveitar o que já existe desta sessão sempre que possível, só
mudando tokens (forma pill, cores novas):

| Componente | Estado |
|---|---|
| `BotaoPrimario` / `BotaoSecundario` / `LigacaoTerciaria` | existem — mudar para pill + `--color-ink` |
| `BotaoAcaoDestruir` (Radix AlertDialog) | existe — só forma muda |
| `EmptyState` | existe — restilizar, copy já boa |
| ~~`Skeleton`~~ | retirado — a espera passou a ser o `EcraCarregamento` (secção 12c) |
| `Breadcrumbs` | existe — repensar se ainda faz sentido com bottom nav (pode passar a redundante em mobile) |
| `CartaoLink` / `Cartao` | existem — adaptar a "Card" da secção 8 |
| **`HeroSection`** | novo — gradiente + anel de progresso |
| **`AppShell`** | novo — estrutura hero + content surface + bottom nav |
| **`BottomNavigation`** | novo |
| **`AnelProgresso`** | novo |
| **`BottomSheet`** (Radix Dialog, variante "sheet") | novo — reaproveita o `ModalShell` já criado, muda só a animação de entrada (vertical, não fade+scale) e o `border-radius` (só cantos superiores) |
| `Chip` | novo — para o seletor de dia da semana e tags |
| `Avatar` | novo — fotos de professores/alunos |

---

## 14. O que NÃO muda

- Lógica de negócio, Server Actions, RLS, autenticação, rotas.
- Interface em português de Portugal.
- Nomes de domínio (`CartaoLink`, `matriculas`, etc.).
- As correções de acessibilidade e os componentes da Fase 1–8 anterior
  (Radix, focus-visible, EmptyState, skip-link) — a base técnica
  mantém-se, muda a pele.

---

## 15. Próximo passo

Este documento é só o design system. Antes de tocar em código:
confirmar que esta direção está aprovada, depois seguir o mesmo processo
faseado já usado nesta sessão (fundação → navegação → core workflows →
secundários → estados → motion → acessibilidade → QA), desta vez a
partir destes tokens novos.
