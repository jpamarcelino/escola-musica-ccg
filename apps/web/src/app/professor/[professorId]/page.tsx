import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type FichaPublica = {
  professor_id: string
  nome: string
  foto_url: string | null
  bio: string | null
  programa: string | null
  disciplinas: string[]
}

// A ficha de um professor, aberta pelo "i" dos cartões de escolha.
//
// É pública de propósito: o wizard de pedir aula também o é (0022), e um
// "i" que levasse a um ecrã de login a meio da exploração era pior do que
// não haver "i" nenhum. Não mostra email nem telefone — quem quiser falar
// com o professor fala com a secretaria.
export default async function FichaProfessorPage({
  params,
  searchParams,
}: {
  params: Promise<{ professorId: string }>
  searchParams: Promise<{ voltar?: string }>
}) {
  const { professorId } = await params
  const { voltar } = await searchParams

  const supabase = await createClient()
  const { data } = await supabase.rpc('professor_publico', { p_professor: professorId })

  const ficha = ((data ?? []) as FichaPublica[])[0]

  if (!ficha) {
    notFound()
  }

  // Só se volta para dentro da própria app. Sem isto, o endereço da ficha
  // podia ser partilhado com um `voltar` para fora e a seta levava a
  // pessoa para outro sítio qualquer.
  const destinoVoltar = voltar && voltar.startsWith('/') && !voltar.startsWith('//') ? voltar : '/'

  const escola =
    ficha.programa === 'musica'
      ? 'Escola de Música'
      : ficha.programa === 'danca'
        ? 'Escola de Dança'
        : null

  return (
    <main id="conteudo-principal" className="partitura-pagina ficha-professor-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href={destinoVoltar} className="partitura-voltar" aria-label="Voltar">
            ←
          </Link>
          <div>
            <p className="partitura-sobretitulo">{escola ?? 'Centro Cultural da Guarda'}</p>
            <h1>{ficha.nome}</h1>
            {ficha.disciplinas.length > 0 && <p>{ficha.disciplinas.join(' · ')}</p>}
          </div>
        </header>

        {ficha.foto_url && (
          <div className="ficha-professor-retrato">
            <Image
              src={ficha.foto_url}
              alt={`Retrato de ${ficha.nome}`}
              width={640}
              height={640}
              sizes="(max-width: 700px) 100vw, 420px"
            />
          </div>
        )}

        {ficha.bio ? (
          <article className="ficha-professor-bio">{ficha.bio}</article>
        ) : (
          <p className="ficha-professor-sem-bio">
            Ainda não há uma apresentação escrita deste professor.
          </p>
        )}
      </div>
    </main>
  )
}
