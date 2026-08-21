# O que acontece quando uma conta é apagada

Auditoria tabela a tabela de `apagar_propria_conta()` (migração 0013),
feita para o pacote jurídico. Serve para responder a uma pergunta simples:
**o que a app promete corresponde ao que a base faz?**

A função faz uma coisa só — `delete from auth.users where id = auth.uid()`.
Tudo o resto acontece por cascata das chaves estrangeiras. É isso que esta
tabela desmonta.

## Desaparece

| Tabela | Como | Porquê |
|---|---|---|
| `auth.users` | apagado | é o alvo |
| `profiles` | cascata | dados de conta: nome, email, telefone, NIF |
| `perfis_escola` | cascata | tipo, escola, admin, biografia |
| `alunos` | cascata por `encarregado_id` | os perfis que a conta geria |
| `matriculas` | cascata por `aluno_id` | inscrições ativas e históricas |
| `notificacoes` | cascata | avisos da conta |
| `push_subscricoes` | cascata | dispositivos |
| `aceitacoes_legais` | cascata (0052) | prova de aceitação |
| `materiais_alunos` | cascata (0048) | ligações a material recebido |

## Fica

| Tabela | Como | Fundamento | Prazo previsto na Política |
|---|---|---|---|
| `presencas` | `aluno_id`/`professor_id` → null, `matricula_id` → null | registo da prestação do serviço; os nomes de aluno e disciplina ficam desnormalizados na linha (0013) | 5 anos após o final do vínculo |
| `mensalidades` | ver abaixo | obrigação contabilística e fiscal | 10 anos civis (art. 52.º CIVA) |
| `historico_mensalidades` | idem | idem | 10 anos |
| `materiais` | fica com `professor_id` | é do professor, não do aluno | — |

## Três lacunas, por ordem de gravidade

**1. As mensalidades podem desaparecer com a conta.** `presencas` foi
tratada em 0013 — largou a chave estrangeira e passou a guardar
`aluno_id`, `professor_id` e `instrumento_nome` na própria linha. As
mensalidades **não** receberam o mesmo tratamento. Se `mensalidades`
tiver `aluno_id` com `on delete cascade`, apagar a conta apaga registos
contabilísticos que a lei manda guardar 10 anos — e a Política promete
que ficam.

*Confirmar antes de qualquer apagamento em produção.* Se a cascata
existir, é um bloqueador: corrige-se com o mesmo padrão de 0013
(desnormalizar o nome, largar a FK) antes de alguém apagar a conta.

**2. Não há anonimização, só apagamento ou nada.** As presenças ficam com
os identificadores a null, o que é anonimização de facto — mas o nome do
aluno fica em texto na linha. Para o efeito pretendido (saber quantas
aulas houve) o nome não é preciso. Fica por decidir se se apaga o nome ao
fim do prazo ou se se mantém.

**3. Nenhum prazo é executado.** A Política promete 12 meses, 2 anos, 5
anos e 10 anos conforme a categoria. **Não existe nenhuma rotina que
apague seja o que for ao fim de prazo nenhum.** Ver `docs/CONSERVACAO.md`.

## O que NÃO se deve fazer

Corrigir isto apagando dados. A conclusão desta auditoria não é "apagar o
que sobra" — é "confirmar a cascata das mensalidades e alinhar o texto com
o comportamento". O texto de interface já foi alinhado (`TEXTOS_LEGAIS.apagarConta`):
diz que alguns registos podem ser conservados, e é verdade.
