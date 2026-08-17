'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

export type AlunoDiretorio = {
  id: string
  nome: string
  dataNascimento: string | null
  email: string | null
  telefone: string | null
  matriculas: { estado: string; instrumento: string | null; professor: string | null; horario: string | null }[]
}

export function AdminAlunosDirectory({ alunos }: { alunos: AlunoDiretorio[] }) {
  const [pesquisa, setPesquisa] = useState('')
  const [ativo, setAtivo] = useState<string | null>(null)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const painelRef = useRef<HTMLElement>(null)
  const filtrados = useMemo(() => alunos.filter((aluno) => aluno.nome.toLocaleLowerCase('pt-PT').includes(pesquisa.trim().toLocaleLowerCase('pt-PT'))), [alunos, pesquisa])
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

      <section className="admin-mesa-lista" aria-label="Diretório de alunos">
        <div className="admin-mesa-colunas" aria-hidden="true"><span/><span>Aluno</span><span>Situação atual</span><span>Professor</span></div>
        {filtrados.map((aluno) => {
          const matricula = aluno.matriculas.find((item) => item.estado === 'confirmado') ?? aluno.matriculas[0]
          return <div key={aluno.id} className="admin-mesa-linha" data-ativa={ativo === aluno.id}>
            <label><input type="checkbox" checked={selecionados.has(aluno.id)} onChange={() => alternarSelecao(aluno.id)} aria-label={`Selecionar ${aluno.nome}`}/></label>
            <button type="button" onClick={() => setAtivo(aluno.id)}><strong>{aluno.nome}</strong><small>{aluno.email ?? 'Sem email associado'}</small></button>
            <button type="button" onClick={() => setAtivo(aluno.id)}><span>{matricula?.instrumento ?? 'Sem matrícula'}</span><small>{matricula?.horario ?? matricula?.estado ?? 'Sem atividade'}</small></button>
            <button type="button" onClick={() => setAtivo(aluno.id)}><span>{matricula?.professor ?? '—'}</span><small>Ver dossier</small></button>
          </div>
        })}
        {filtrados.length === 0 && <p className="admin-mesa-sem-resultados">Nenhum aluno corresponde a “{pesquisa}”.</p>}
      </section>

      {alunoAtivo && <aside ref={painelRef} className="admin-dossier" aria-labelledby="admin-dossier-titulo">
        <header><div><small>Dossier de aluno</small><h2 id="admin-dossier-titulo" tabIndex={-1}>{alunoAtivo.nome}</h2></div><button type="button" onClick={() => setAtivo(null)} aria-label="Fechar dossier">×</button></header>
        <section><h3>Situação atual</h3>{alunoAtivo.matriculas.length ? alunoAtivo.matriculas.map((matricula, indice) => <div key={indice} className="admin-dossier-registo"><strong>{matricula.instrumento}</strong><span>{matricula.professor ?? 'Professor por atribuir'}</span><small>{matricula.horario ?? matricula.estado}</small></div>) : <p>Sem matrículas registadas.</p>}</section>
        <section><h3>Contacto</h3><dl><div><dt>Email</dt><dd>{alunoAtivo.email ?? 'Não indicado'}</dd></div><div><dt>Telemóvel</dt><dd>{alunoAtivo.telefone ?? 'Não indicado'}</dd></div><div><dt>Nascimento</dt><dd>{alunoAtivo.dataNascimento ?? 'Não indicado'}</dd></div></dl></section>
        <footer><Link href={`/admin/alunos/${alunoAtivo.id}`}>Abrir dossier completo</Link><span>Esc para fechar</span></footer>
      </aside>}
    </div>
  )
}
