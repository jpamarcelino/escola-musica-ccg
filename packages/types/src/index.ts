// Vocabulário de estados da base de dados, em TypeScript.
//
// As colunas de estado do Postgres são `text` com uma constraint CHECK,
// não tipos enum. Do lado da aplicação chegavam como `string`, e um
// `estado: 'confimado'` compilava sem queixa — o erro só aparecia quando
// o Postgres recusava a escrita, em produção, a meio de uma operação de
// alguém. Estas uniões trazem essa verificação para o editor.
//
// O ficheiro estados.gerado.ts é gerado a partir do esquema e das
// migrações; não se edita à mão. Há um teste que repete a extração e
// falha se ficar desatualizado.
//
// O que NÃO está aqui: as formas das linhas devolvidas por cada query.
// Cada página seleciona as colunas de que precisa, e essas projeções são
// diferentes por bom motivo — seis páginas declaram um tipo `Matricula`
// e as seis são projeções distintas, não cópias. Unificá-las num tipo só
// obrigaria todas a carregar colunas que não usam. Quando houver acesso
// à geração de tipos do Supabase, as formas base das tabelas entram aqui
// e as projeções passam a derivar delas com Pick.

export * from './estados.gerado'
