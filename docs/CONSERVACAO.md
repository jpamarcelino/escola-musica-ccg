# Conservação de dados: o que a Política promete e o que o sistema faz

A Política de Privacidade v1.0, secção 10, fixa oito prazos. Este
documento compara-os com o comportamento real e propõe um plano.

**Conclusão em uma linha: nenhum dos oito prazos é executado. Não existe
nenhuma rotina de eliminação por antiguidade em lado nenhum.**

| Categoria | Prazo prometido | O que o sistema faz hoje | Lacuna |
|---|---|---|---|
| Pedidos não confirmados | 12 meses após último contacto | ficam para sempre; só saem se alguém cancelar à mão | **total** |
| Conta e contactos | 2 anos após encerramento | apagados de imediato no encerramento | mais restritivo do que o prometido — não é incumprimento |
| Perfis, matrículas, horários, presenças | 5 anos após o vínculo | ficam indefinidamente | **total** |
| Mensalidades, faturas, contabilidade | 10 anos civis | ficam — mas ver a lacuna 1 de `APAGAMENTO_DE_CONTA.md` | **risco no sentido inverso**: podem sair cedo demais |
| Mensagens e notificações | 2 anos | ficam indefinidamente | **total** |
| Recomendações e benefícios | 5 anos / 10 anos | ficam indefinidamente | **total** |
| Registos técnicos e de segurança | 12 meses | geridos pelo Supabase, ciclo por confirmar | **por confirmar** |
| Prova de consentimentos | 5 anos após retirada | sai com a conta, por cascata | mais restritivo — aceitável |

## Porque não implementei já

Uma rotina de retenção é código que apaga dados reais por antiguidade. É a
classe de código onde um erro não se corrige: um `delete` com o intervalo
errado não tem "desfazer". Escrever isso na mesma passagem em que se
mexeu no registo, nos Termos e na navegação seria juntar risco a risco.

## Plano proposto

**Fase 1 — medir, sem apagar.** Uma função `inventario_retencao()` que
devolve, por categoria, quantas linhas já passaram o prazo. Só contagens,
sem dados pessoais no resultado. Corre-se durante semanas e vê-se se os
números fazem sentido.

**Fase 2 — apagar uma categoria, à mão.** Começar pelos *pedidos não
confirmados* (matrículas em `a_escolher` com mais de 12 meses): é a
categoria mais inofensiva — nunca foram matrículas, não têm presenças nem
mensalidades atrás. Com `dry_run` por omissão a `true`, contagens antes e
depois, e execução manual.

**Fase 3 — anonimizar em vez de apagar**, onde apagar prejudique registos
legítimos. As presenças de um aluno que saiu há 6 anos interessam à escola
como número, não como pessoa: tirar o nome preserva a estatística e
cumpre o prazo.

**Fase 4 — só então, cron.** E mesmo aí com o mesmo `dry_run` disponível.

## Regras para qualquer rotina futura

- `dry_run boolean default true`. Quem quiser apagar tem de o escrever.
- Seleção explícita por categoria e data. Nunca "tudo o que for antigo".
- Contagens antes e depois, devolvidas a quem chamou.
- Registos sem dados pessoais — contagens, não nomes.
- Anonimização como alternativa ao apagamento.
- Testes e execuções manuais antes de entrar no cron diário.

**Antes disto, há uma decisão da Direção por tomar:** os prazos da secção
10 foram propostos no pacote jurídico, não aprovados. Implementar uma
rotina sobre prazos que ainda podem mudar é construir sobre areia.
