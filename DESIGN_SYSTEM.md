# Design System — Centro Cultural da Guarda

Documento de referência visual. Qualquer alteração de UI deve seguir estas
regras. Não alterar lógica, Supabase, routing ou estrutura de dados.

---

## 1. Filosofia

Instituição cultural, não SaaS. Limpo e legível, mas com carácter.

A identidade nasce do logótipo: uma **pincelada azul feita à mão** combinada
com **maiúsculas serifadas espaçadas** ("C E N T R O") e uma manuscrita
gestual. Ou seja: **formal e feito à mão ao mesmo tempo**. Todas as decisões
visuais devem puxar por esse par.

Regras negativas (importantes):
- Sem gradientes em botões, cartões ou fundos.
- Sem efeito "vidro"/opala/skeuomorfismo.
- Sem fundos de mármore ou texturas fotográficas.
- Sem sombras pesadas. Sombra só no botão primário.
- Sem serifada em botões, inputs ou texto de interface.

---

## 2. Cores

Extraídas do logótipo real (`#78AEDE` é o azul da pincelada).

```
--azul-logo    #78AEDE   pincelada, detalhes decorativos, barra de cartão
--azul         #3D7FB8   itálicos de destaque, setas, links
--azul-fundo   #1B4F7A   títulos, botão primário, ícones de linha
--tinta        #241F1C   texto principal (preto quente, nunca #000)
--tinta-suave  #6B615A   texto secundário, descrições
--papel        #FBF8F3   fundo da aplicação
--papel-2      #F3EDE4   fundo de ícones, superfícies recuadas
--linha        #E4DACC   bordas, separadores
--dourado      #A8763A   acento pontual (Dança, distintivos)
--verde        #7FA98C   acento pontual (Música para Bebés)
```

Superfícies de cartão: `#FFFFFF` com borda `--linha`.

Uso do dourado/verde: apenas como barra lateral de 3px ou distintivo.
Nunca como fundo de área grande.

### Tailwind v4 — bloco `@theme` para `globals.css`

Fundir com os tokens existentes, não substituir o ficheiro.

```css
@theme {
  --color-azul-logo:   #78AEDE;
  --color-azul:        #3D7FB8;
  --color-azul-fundo:  #1B4F7A;
  --color-tinta:       #241F1C;
  --color-tinta-suave: #6B615A;
  --color-papel:       #FBF8F3;
  --color-papel-2:     #F3EDE4;
  --color-linha:       #E4DACC;
  --color-dourado:     #A8763A;
  --color-verde:       #7FA98C;

  --font-display: "Fraunces", ui-serif, serif;
  --font-sans:    "Inter", ui-sans-serif, system-ui, sans-serif;

  --radius-cartao: 18px;
  --radius-botao:  13px;
  --radius-icone:  12px;
}
```

---

## 3. Tipografia

Duas famílias, papéis rígidos.

**Fraunces** (serifada) — apenas títulos, nomes de secção e nomes de escola.
**Inter** (sans) — todo o resto: botões, inputs, descrições, rótulos, dados.

| Uso                    | Família  | Tamanho | Peso | Notas                          |
|------------------------|----------|---------|------|--------------------------------|
| H1 (hero)              | Fraunces | 33px    | 600  | line-height 1.12, tracking -.018em |
| H1 — parte destacada   | Fraunces | 33px    | 500  | itálico, cor `--azul`          |
| H2 / título de página  | Fraunces | 22px    | 600  | line-height 1.2                |
| Nome de cartão         | Fraunces | 16.5px  | 600  | line-height 1.2                |
| Corpo / lead           | Inter    | 15px    | 400  | line-height 1.6, `--tinta-suave` |
| Descrição de cartão    | Inter    | 12.5px  | 400  | `--tinta-suave`                |
| Botão                  | Inter    | 15.5px  | 600  |                                |
| Rótulo maiúsculas      | Inter    | 9.5px   | 500  | tracking .16em, uppercase      |

O **rótulo em maiúsculas espaçadas** é o eco tipográfico do "C E N T R O" do
logótipo. Usar para subtítulos de secção e etiquetas. Não abusar.

---

## 4. Espaçamento

Escala: `4 / 8 / 11 / 14 / 22 / 26 / 38`

- Margem lateral do ecrã (mobile): **22px**
- Espaço entre cartões numa lista: **11px**
- Padding interno de cartão: **15px 16px**
- Espaço entre blocos de conteúdo: **26px**

---

## 5. Raios

```
Cartões           18px
Botões            13px
Caixa de ícone    12px
Distintivos       5px
```

---

## 6. Componentes

### Botão primário
Fundo `--azul-fundo`, texto branco, altura 52px, raio 13px, Inter 600 15.5px.
Única sombra permitida na app: `0 7px 18px rgba(27,79,122,.26)`.

### Botão secundário
Transparente, texto `--azul-fundo`, borda 1.5px `--azul-fundo`. Mesma altura.

### Ligação terciária
Sem fundo nem borda. `--tinta-suave`, Inter 500 14px, sublinhado com
`text-underline-offset: 3px`.

**Um só botão primário por ecrã.** Se houver três ações, são
primário / secundário / ligação — nunca três com o mesmo peso.

### Cartão de escola (lista)
Linha horizontal: caixa de ícone → texto → seta.
- Fundo branco, borda 1px `--linha`, raio 18px, padding 15px 16px.
- Barra vertical de **3px** encostada à esquerda, a cor identifica a escola:
  Música `--azul-logo`, Dança `--dourado`, Bebés `--verde`.
- Caixa de ícone: 46×46px, fundo `--papel-2`, raio 12px, ícone 26px de linha
  a `--azul-fundo` com `stroke-width` 1.5.
- Hover: borda passa a `--azul-logo` e `translateY(-1px)`.
- O título não quebra linha (`white-space: nowrap`).

### Distintivo ("Novidade")
Inline, a seguir ao título, na mesma linha.
Inter 600 8px, tracking .1em, uppercase.
Texto `#6C4A1E`, fundo `#F2E3CD`, borda 1px `#E2CDAE`, raio 5px,
padding 2.5px 5px 2px.

### Ícones
Sempre **de linha**, nunca preenchidos. `stroke-width` 1.5, extremidades
arredondadas, cor `--azul-fundo`.
Os ícones de instrumentos que já existem na app estão corretos — manter esse
estilo em tudo o resto.

---

## 7. Textura e o traço da marca

**Grão de papel:** camada de ruído SVG sobre o fundo da aplicação,
`opacity: .16`, `mix-blend-mode: multiply`, `pointer-events: none`.
É o que impede o aspeto de vetor liso gerado por máquina. Aplicar uma vez no
layout raiz, não por página.

```css
background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E");
```

**Pincelada:** o ficheiro `public/pincelada-ccg.png` é o traço do logótipo
recortado com fundo transparente. Usar em grande, cortado pela margem,
`opacity: .30`, rodado cerca de -14°, atrás do conteúdo.

Usar **uma só vez por ecrã**, e apenas em ecrãs de entrada (landing, hubs).
Nunca em formulários, listas ou tabelas.

---

## 8. Cabeçalho

Logótipo real (`public/logo.png`, altura 38px) + nome em Fraunces 600
14.5px + subtítulo em maiúsculas espaçadas 9.5px `--tinta-suave`.
Separador: 1px `--linha` com margem lateral de 22px.

Nunca substituir o logótipo por um símbolo desenhado.

---

## 9. Mobile e desktop

Mobile-first. O layout base é o de 390px de largura.

- Largura máxima de conteúdo em desktop: **720px**, centrado.
- A partir de `md`, as listas de cartões passam a grelha de 2 colunas.
- O grão e a pincelada mantêm-se iguais; não aumentar a opacidade em ecrãs
  grandes.
- Alvos de toque com pelo menos 44px de altura.

---

## 10. Estado atual

Definido e aprovado: **página inicial** (`/`).

Por desenhar, a aplicar depois com estas mesmas regras: `/registo`, `/login`,
`/pedir-aula` (wizard), `/dashboard`, `/aluno/[alunoId]`, horário,
calendário, materiais (metrónomo) e notificações.

O metrónomo está atualmente sem qualquer estilo do sistema — é o ecrã mais
desalinhado e deve ser dos primeiros a migrar.
