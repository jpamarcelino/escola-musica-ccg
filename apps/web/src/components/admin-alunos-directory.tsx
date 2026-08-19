'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

export type AlunoDiretorio = {
  id: string
  nome: string
  dataNascimento: string | null
  email: string | null
  telefone: string | null
  matriculas: {
    estado: string
    canceladaEm: string | null
    instrumento: string | null
    professor: string | null
    horario: string | null
  }[]
}

// Os três grupos por que a secretaria olha para esta lista.
//
// "Sem matrícula" existe porque um aluno que cancela deixa de ter aulas
// mas não deixa de existir: continua na conta da família, com o
// histórico todo, e pode voltar a inscrever-se. Antes da migração 0029 a
// matrícula era apagada e este grupo era indistinguível de quem nunca se
// tinha inscrito.
const GRUPOS = [
  { chave: 'todos', rotulo: 'Todos' },
  { chave: 'com', rotulo: 'Com matrícula' },
  { chave: 'sem', rotulo: 'Sem matrícula' },
] as const

type Grupo = (typeof GRUPOS)[number]['chave']

function temAulas(aluno: AlunoDiretorio): boolean {
  return aluno.matriculas.some((m) => m.estado === 'confirmado')
}

// O que mostrar na coluna do meio. A ordem é a da importância para quem
// atende ao balcão: o que está a decorrer, o que está à espera de
// resposta, e só depois o que terminou.
function situacao(aluno: AlunoDiretorio) {
  const ativa = aluno.matriculas.find((m) => m.estado === 'confirmado')
  if (ativa) return { titulo: ativa.instrumento ?? 'Matriculado', detalhe: ativa.horario ?? 'Sem horário', professor: ativa.professor }

  const pedido = aluno.matriculas.find((m) => m.estado === 'a_escolher')
  if (pedido) return { titulo: pedido.instrumento ?? 'Pedido', detalhe: 'Pedido por responder', professor: pedido.professor }

  const cancelada = aluno.matriculas
    .filter((m) => m.estado === 'cancelado')
    .sort((a, b) => (b.canceladaEm ?? '').localeCompare(a.canceladaEm ?? ''))[0]
  if (cancelada) {
    const quando = cancelada.canceladaEm
      ? new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' }).format(
          new Date(cancelada.canceladaEm)
        )
      : null
    return {
      titulo: 'Sem matrícula',
      detalhe: quando ? `Cancelou ${cancelada.instrumento ?? 'aulas'} a ${quando}` : `Cancelou ${cancelada.instrumento ?? 'aulas'}`,
      professor: cancelada.professor,
    }
  }

  return { titulo: 'Sem matrícula', detalhe: 'Nunca se inscreveu', professor: null }
}

export function AdminAlunosDirectory({ alunos }: { alunos: AlunoDiretorio[] }) {
  const [pesquisa, setPesquisa] = useState('')
  const [grupo, setGrupo] = useState<Grupo>('todos')
  const [ativo, setAtivo] = useState<string | null>(null)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const painelRef = useRef<HTMLElement>(null)
  const filtrados = useMemo(
    () =>
      alunos
        .filter((aluno) =>
          aluno.nome.toLocaleLowerCase('pt-PT').includes(pesquisa.trim().toLocaleLowerCase('pt-PT'))
        )
        .filter((aluno) => (grupo === 'todos' ? true : grupo === 'com' ? temAulas(aluno) : !temAulas(aluno))),
    [alunos, pesquisa, grupo]
  )
  const alunoAtivo = alunos.find((aluno) => aluno.id === ativo) ?? null

  useEffect(() => {
    function teclado(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && ativo) setAtivo(null)
      if (evento.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        evento.preventDefault()
        document.getElementById('pesquisa-admin-alunos')?.focus()
      }
    }
    window.addEventListener('keydown', teclado)
    return () => window.removeEventListener('keydown', teclado)
  }, [ativo])

  function alternarSelecao(id: string) {
    setSelecionados((atuais) => {
      const seguintes = new Set(atuais)
      if (seguintes.has(id)) seguintes.delete(id); else seguintes.add(id)
      return seguintes
    })
  }

  function exportarSelecionados() {
    const linhas = alunos
      .filter((aluno) => selecionados.has(aluno.id))
      .map((aluno) => [aluno.nome, aluno.email ?? '', aluno.telefone ?? ''])
    const escapar = (valor: string) => `"${valor.replaceAll('"', '""')}"`
    const csv = [['Nome', 'Email', 'Telemóvel'], ...linhas]
      .map((linha) => linha.map(escapar).join(';'))
      .join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'alunos-selecionados.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-mesa" data-painel-aberto={Boolean(alunoAtivo)}>
      <header className="admin-mesa-barra">
        {selecionados.size > 0 ? <><strong>{selecionados.size} {selecionados.size === 1 ? 'aluno selecionado' : 'alunos selecionados'}</strong><nav><button type="button" onClick={exportarSelecionados}>Exportar CSV</button><button type="button" onClick={() => setSelecionados(new Set())}>Limpar seleção</button></nav></> : <><label htmlFor="pesquisa-admin-alunos">Pesquisar</label><input id="pesquisa-admin-alunos" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} placeholder="Nome do aluno…"/><kbd>/</kbd><span>{filtrados.length} registos</span></>}
      </header>

      {/* Os separadores só aparecem depois da barra de pesquisa, e não
          antes: quem chega a esta página vem quase sempre à procura de um
          nome. O grupo é para quando se quer a lista, não a pessoa. */}
      <div className="admin-mesa-grupos" role="group" aria-label="Filtrar por situação">
        {GRUPOS.map((g) => {
          const quantos =
            g.chave === 'todos'
              ? alunos.length
              : g.chave === 'com'
                ? alunos.filter(temAulas).length
                : alunos.filter((a) => !temAulas(a)).length
          return (
            <button
              key={g.chave}
              type="button"
              aria-pressed={grupo === g.chave}
              onClick={() => setGrupo(g.chave)}
            >
              {g.rotulo} <span>{quantos}</span>
            </button>
          )
        })}
      </div>

      <section className="admin-mesa-lista" aria-label="Diretório de alunos">
        <div className="admin-mesa-colunas" aria-hidden="true"><span/><span>Aluno</span><span>Situação atual</span><span>Professor</span></div>
        {filtrados.map((aluno) => {
          const agora = situacao(aluno)
          return <div key={aluno.id} className="admin-mesa-linha" data-ativa={ativo === aluno.id}>
            <label><input type="checkbox" checked={selecionados.has(aluno.id)} onChange={() => alternarSelecao(aluno.id)} aria-label={`Selecionar ${aluno.nome}`}/></label>
            <button type="button" onClick={() => setAtivo(aluno.id)}><strong>{aluno.nome}</strong><small>{aluno.email ?? 'Sem email associado'}</small></button>
            <button type="button" onClick={() => setAtivo(aluno.id)}><span>{agora.titulo}</span><small>{agora.detalhe}</small></button>
            <button type="button" onClick={() => setAtivo(aluno.id)}><span>{agora.professor ?? '—'}</span><small>Ver dossier</small></button>
          </div>
        })}
        {filtrados.length === 0 && (
          <p className="admin-mesa-sem-resultados">
            {pesquisa.trim()
              ? `Nenhum aluno corresponde a “${pesquisa}”.`
              : grupo === 'com'
                ? 'Nenhum aluno com matrícula ativa.'
                : 'Nenhum aluno sem matrícula.'}
          </p>
        )}
      </section>

      {alunoAtivo && <aside ref={painelRef} className="admin-dossier" aria-labelledby="admin-dossier-titulo">
        <header><div><small>Dossier de aluno</small><h2 id="admin-dossier-titulo" tabIndex={-1}>{alunoAtivo.nome}</h2></div><button type="button" onClick={() => setAtivo(null)} aria-label="Fechar dossier">×</button></header>
        <section><h3>Situação atual</h3>{alunoAtivo.matriculas.length ? alunoAtivo.matriculas.map((matricula, indice) => <div key={indice} className="admin-dossier-registo" data-estado={matricula.estado}><strong>{matricula.instrumento}</strong><span>{matricula.professor ?? 'Professor por atribuir'}</span><small>{matricula.estado === 'cancelado' ? (matricula.canceladaEm ? `Cancelada a ${new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(matricula.canceladaEm))}` : 'Cancelada') : matricula.estado === 'a_escolher' ? 'Pedido por responder' : (matricula.horario ?? 'Sem horário')}</small></div>) : <p>Sem matrículas registadas.</p>}</section>
        <section><h3>Contacto</h3><dl><div><dt>Email</dt><dd>{alunoAtivo.email ?? 'Não indicado'}</dd></div><div><dt>Telemóvel</dt><dd>{alunoAtivo.telefone ?? 'Não indicado'}</dd></div><div><dt>Nascimento</dt><dd>{alunoAtivo.dataNascimento ?? 'Não indicado'}</dd></div></dl></section>
        <footer><Link href={`/admin/alunos/${alunoAtivo.id}`}>Abrir dossier completo</Link><span>Esc para fechar</span></footer>
      </aside>}
    </div>
  )
}
