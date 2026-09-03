# Redesenho das 4 homes — apps/mobile

Contexto: repo jpamarcelino/escola-musica-ccg, branch `correcoes-app-telemovel`,
monorepo Expo em `apps/mobile`. O design está aprovado e existe como maqueta
HTML (`Homes estilo 3b.dc.html` no projeto de design, turnos 5 = claro e 7 =
escuro). Não inventes valores: estão todos em `handoff/tema.ts`.

## O que muda

1. **Tipografia** — Fraunces sai. Manrope em tudo (400/600/800), IBM Plex Mono
   só em horas, datas e números. Nunca mono em texto corrido, nunca etiquetas em
   caixa alta.
2. **Tema duplo** — claro e escuro. Criar `lib/tema-contexto.tsx` com
   `useTema()` a devolver `claro` ou `escuro` conforme `useColorScheme()`, com
   preferência manual guardada em AsyncStorage (mesmo padrão de `lib/modo.tsx`).
   `cores` deixa de ser importado direto pelos ecrãs.
3. **Barra de navegação** — passa de `tabBar` por defeito a cápsula escura
   flutuante (`BarraCapsula` em `componentes/ccg.tsx`), com a pincelada num
   disco centrado meio dentro da barra e risco ciano de 2px no separador ativo.
   A cápsula é escura nos DOIS temas.
4. **Home pública (`app/descobrir.tsx`)** — reescrita: imagem `marmore-fundo`
   com gradiente e o título por cima, três números da escola, as três escolas
   como chips, três fichas de professor sorteadas de `listarProfessores` (roda a
   cada 6s ou a cada entrada no ecrã) e um só botão, "Pedir uma aula".
   A marca vai no topo: pincelada ciano e "Centro Cultural da Guarda" na MESMA
   linha.
5. **Homes de encarregado, professor e admin (`app/(app)/index.tsx`,
   `app/(app)/admin.tsx`)** — mesma informação de hoje, nova hierarquia: o que
   está a decorrer ganha um cartão com contorno ciano, hora grande em mono,
   barra de progresso e ação directa; o que precisa de resposta é um cartão
   vermelho; o resto são linhas de 18px de raio. Sem etiquetas em caixa alta.

## Regras que não se negociam

- Cores só de `lib/tema.ts`; se faltar uma, acrescenta-se lá.
- Alvos de toque nunca abaixo de 44px.
- Painéis encostados ao fundo levam sempre gradiente (`PainelAcao`), senão
  cortam a lista a meio.
- A pincelada é SVG inline pintável, nunca `<Image>` de PNG.
- Números e nomes na maqueta são de exemplo — ligar a `@ccg/data`.

## Tarefas

1. Instalar `@expo-google-fonts/manrope`, `@expo-google-fonts/ibm-plex-mono`,
   `expo-linear-gradient`, `react-native-svg`; carregar as fontes no
   `app/_layout.tsx`.
2. Substituir `lib/tema.ts` pelo de `handoff/tema.ts` e criar
   `lib/tema-contexto.tsx`.
3. Criar `componentes/ccg.tsx` a partir de `handoff/ccg.tsx` e colar o `d` do
   path de `public/simbolo-ccg.svg` na constante `CAMINHO_SIMBOLO`.
4. Ligar `BarraCapsula` em `app/(app)/_layout.tsx` via
   `tabBar={(p) => <BarraCapsula {...p} />}`, mantendo os `href: null` que já
   existem (é o que impede a navegação para separadores fora do papel).
5. Reescrever os quatro ecrãs, um commit por ecrã.
6. Verificar em iOS e Android, claro e escuro, e com texto ampliado.

## Onde vais tropeçar

- Não há `filter` nem `backdrop-filter` em RN: o disco da pincelada é uma View
  com `borderRadius` e o SVG pintado por `fill`; a cápsula é opaca.
- Gradientes só com `expo-linear-gradient`.
- `box-shadow` é `shadowColor/Opacity/Radius/Offset` no iOS e `elevation` no
  Android — os dois estão no StyleSheet.
- `gap` funciona em RN 0.71+; confirma a versão antes de o usares em massa.
