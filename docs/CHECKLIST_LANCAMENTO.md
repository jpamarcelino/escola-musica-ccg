# Checklist antes do lançamento público

Bloqueadores a vermelho. Nenhum deles é código — são decisões e operações
que ninguém pode tomar por si.

## 🔴 Bloqueiam o lançamento

### 1. Livro de Reclamações Eletrónico
O CCG **não está registado** como operador. Enquanto
`LIVRO_RECLAMACOES_URL` em `apps/web/src/lib/legal/entidade.ts` for `null`,
a app não mostra ligação nenhuma e diz que o livro eletrónico fica
disponível depois do registo.

- [ ] Concluir o registo em livroreclamacoes.pt
- [ ] Pôr o URL específico do operador na constante
- [ ] Confirmar que a ligação aparece no rodapé, em `/legal` e na Informação Legal

**Não publicar uma ligação genérica.** Dá a entender que se pode reclamar
ali do CCG; o visitante clica, não encontra a entidade, e conclui que a
escola se está a esconder.

### 2. Contas demo com password conhecida
Existem contas de teste cujas credenciais estão em `.env.local` e foram
usadas em desenvolvimento.

- [ ] Inventariar todas as contas de teste (`teste`, `testeadmin`, `testeprof`, `Utilizador Teste`, `teste+aluno@…`)
- [ ] Apagar ou trocar a password de cada uma
- [ ] Confirmar que nenhuma tem `perfis_escola.admin = true`

### 3. Conta de QA com privilégios
- [ ] Localizar "Teste Admin (Claude QA)" e "Teste Encarregado Fase2b (Claude QA)"
- [ ] Retirar privilégios administrativos
- [ ] Apagar a conta depois de confirmado que não é referenciada

### 4. MFA para administradores
O Supabase Auth suporta MFA por TOTP; **não está ativo**.

- [ ] Ativar MFA no projeto
- [ ] Exigir a todos os `perfis_escola.admin = true`
- [ ] Exigir ao super admin

Uma conta de administração vê a escola inteira: alunos menores, moradas,
contactos, situação financeira. Password sozinha não chega.

### 5. Aprovação dos Termos pela Direção
Os Termos v1.0 contêm dois pontos que o próprio pacote marca como
**VALIDAÇÃO NECESSÁRIA** e que **não podem ser publicados sem decisão**:

- [ ] **Faltas e reposições** (secção 9): confirmar o prazo de 30 dias, a distinção Música/Dança e a ausência de limite anual
- [ ] **Desistência** (secção 11): fixar se existe pré-aviso e como se trata o mês em curso — não publicar uma penalização não aprovada

### 6. Supabase e Vercel
- [ ] Confirmar a região de alojamento
- [ ] Obter e arquivar os contratos de tratamento de dados (DPA)
- [ ] Listar subprocessadores
- [ ] Confirmar o ciclo real de backups e de logs (a Política diz 12 meses)

## 🟡 Antes de abrir ao público, mas não bloqueiam a app

- [ ] Registo interno de atividades de tratamento (art. 30.º)
- [ ] Matriz de acessos por função
- [ ] Procedimento escrito para pedidos de direitos (art. 12.º–22.º)
- [ ] Plano de resposta a incidentes (art. 33.º–34.º)
- [ ] Rever contas existentes de menores de 18 anos
- [ ] Decidir os prazos de conservação e implementar a Fase 1 de `CONSERVACAO.md`
- [ ] Confirmar a cascata das mensalidades (lacuna 1 de `APAGAMENTO_DE_CONTA.md`)

## 🟢 Já feito

- [x] Quatro documentos publicados em `/legal/*`, sem sessão
- [x] Ligações no rodapé público e na área de Conta
- [x] Aceitação versionada dos Termos, com prova por versão
- [x] Portão bloqueante para contas sem aceitação, com saída
- [x] Aviso não bloqueante para a Política atualizada
- [x] Data de nascimento fora do registo do titular
- [x] Declaração de maioridade no registo
- [x] Declaração de legitimidade no perfil de aluno
- [x] Texto de apagamento igual na web e na app móvel, e verdadeiro
- [x] CNIACC publicado

## Regra permanente: analytics, pixels e SDKs

A Política de Cookies afirma que a app **não usa analytics nem
publicidade**. Isso é verdade hoje e é uma afirmação verificável.

**Antes de adicionar qualquer script de terceiros** — Google Analytics,
Meta Pixel, Hotjar, Sentry com replay de sessão, um SDK de chat — é
obrigatório:

1. Avaliar se é estritamente necessário ao serviço. Quase nunca é.
2. Se não for, construir um mecanismo de consentimento **prévio**, com
   aceitar e rejeitar igualmente fáceis.
3. Atualizar a Política de Cookies e subir a versão.
4. Não carregar o script antes de haver consentimento.

Um banner de cookies para cookies estritamente necessários é ruído: não
há nada a consentir, e pedir consentimento para o que não precisa dele
ensina as pessoas a carregar em "aceitar" sem ler.
