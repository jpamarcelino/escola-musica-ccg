# Escola de Música CCG — aplicação

Aplicação de gestão da Escola de Música do Centro Cultural da
Guarda: pedidos de aula, matrículas, horários, presenças, mensalidades e
recomendações de estudo. Três escolas — Música, Dança e Música para Bebés.

Quatro tipos de utilizador: **encarregado de educação** (e os perfis de aluno
que lhe pertencem), **professor**, **admin** e **super-admin**.

---

## Arranque rápido

Requer Node 20+ (desenvolvido em Node 26).

```bash
npm install
cp .env.example .env.local   # e preencher os valores — ver secção "Configuração"
npm run dev
```

Abre <http://localhost:3000>.

| Comando | O quê |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção (usar antes de publicar) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | verificação de tipos |

## Configuração

Todas as variáveis estão documentadas em [`.env.example`](.env.example). Os
valores reais tiram-se do painel do Supabase (Project Settings → API) e do
Vercel. **Não circulam por email nem por mensagem** — cada pessoa copia-os do
painel a que tem acesso.

Atenção a `SUPABASE_SERVICE_ROLE_KEY`: ignora todas as regras de RLS. Serve só
para scripts locais de seed e limpeza. Nunca em código que vai para produção, e
nunca com prefixo `NEXT_PUBLIC_`.

---

## Stack

- **Next.js 15.5** (App Router) + **React 19** — Server Components por omissão,
  Server Actions para todas as escritas.
- **Supabase** — Postgres, Auth e Storage. A segurança está quase toda em **RLS
  na base de dados**, não no código da aplicação.
- **Tailwind v4** — tokens em `@theme` dentro de `src/app/globals.css`.
- **Vercel** — alojamento e o cron diário definido em `vercel.json`.

Não há biblioteca de componentes (nada de shadcn/MUI): os componentes em
`src/components/` são todos escritos à mão e seguem o `DESIGN_SYSTEM.md`.

## Como está organizado

```
src/
  app/                 rotas (App Router)
    page.tsx           entrada pública: escolha da escola
    pedir-aula/        wizard público — pedir aula sem ter conta
    registo/ login/    autenticação
    dashboard/         área do professor (agenda, presenças, mensalidades…)
    aluno/[alunoId]/   área do encarregado, por perfil de aluno
    admin/             gestão da escola
    api/cron/          job diário de mensalidades
  components/          componentes partilhados (ver DESIGN_SYSTEM.md)
  lib/
    actions/           Server Actions — toda a escrita passa por aqui
    supabase/          clientes (server / client / proxy)
    *.ts               regras de domínio: idades, horários, ano letivo…
supabase/
  migrations/          histórico do esquema, por ordem numérica
  schema.sql           estado atual, para referência
```

## Base de dados

O esquema evolui por migrações numeradas em `supabase/migrations/`. **Cada
alteração é um ficheiro novo** — nunca se edita um já aplicado.

As migrações são aplicadas à mão, no SQL Editor do Supabase. Não há ainda um
processo automático: depois de aplicar, atualizar `supabase/schema.sql`.

Boa parte da lógica de autorização vive em policies de RLS e em funções
`security definer` (`eh_admin()`, `professores_publicos()`, …). Antes de assumir
que uma leitura é possível, convém confirmar a policy — várias tabelas só estão
abertas a `authenticated`, e o wizard público depende de exceções explícitas
criadas na migração `0022`.

## Publicar

```bash
npx vercel --prod --yes
```

O deploy é feito a partir da linha de comandos, não automaticamente a partir do
Git.

> Regra permanente do projeto: **não publicar sem perguntar ao dono do
> projeto.** Mesmo quando a alteração parece inofensiva.

---

## Convenções

- **Interface em português de Portugal.** Nomes de componentes, ficheiros e
  variáveis de domínio também (`CartaoLink`, `SeletorIdade`, `matriculas`).
- **`DESIGN_SYSTEM.md` manda no visual.** Sem gradientes, sem vidro/opalina, sem
  sombras pesadas (só o botão primário tem), ícones sempre de linha com traço
  1.5, um único botão primário por ecrã, alvos de toque de 44px no mínimo,
  720px de largura máxima no desktop.
- Antes de mexer num componente partilhado, verificar quantas páginas o usam —
  alguns (`OptionCard`, `PasswordInput`) aparecem em dezenas de sítios.
- O histórico do Git é a única cópia de segurança do código: commits pequenos e
  com mensagem que explique o *porquê*.
