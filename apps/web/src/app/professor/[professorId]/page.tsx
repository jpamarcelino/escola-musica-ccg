import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RodapeVitrine } from '@/components/rodape-vitrine'

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

  // O nome parte-se em duas linhas quando tem duas palavras, como no
  // desenho: um nome inteiro numa linha só encolhe a tipografia até
  // deixar de ter presença.
  const partes = ficha.nome.trim().split(/\s+/)
  const nomeEmDuasLinhas =
    partes.length > 1 ? [partes[0], partes.slice(1).join(' ')] : [ficha.nome]

  return (
    <main id="conteudo-principal" className="v-pagina">
      <div className="v-folha">
        <div className="v-topo">
          <Link href={destinoVoltar} className="v-voltar" aria-label="Voltar">
            ‹
          </Link>
        </div>

        <div className="v-ficha-cabecalho">
          <p className="v-sobretitulo">{escola ?? 'Centro Cultural da Guarda'}</p>
          <h1>
            {nomeEmDuasLinhas.map((linha, i) => (
              <span key={linha}>
                {i > 0 && <br />}
                {linha}
              </span>
            ))}
          </h1>
          <div className="v-traco" />
          {ficha.disciplinas.length > 0 && (
            <p className="v-ficha-disciplinas">{ficha.disciplinas.join(' · ')}</p>
          )}
        </div>

        {ficha.foto_url && (
          <div className="v-retrato">
            <Image
              src={ficha.foto_url}
              alt={`Retrato de ${ficha.nome}`}
              width={640}
              height={800}
              sizes="(max-width: 460px) 100vw, 400px"
            />
          </div>
        )}

        <div className="v-bio">
          <p className="v-sobretitulo">01 Apresentação</p>
          {ficha.bio ? (
            // A bio é escrita pelo professor num campo de texto: os
            // parágrafos são quebras de linha, não HTML.
            ficha.bio
              .split(/\n{2,}/)
              .map((paragrafo, i) => <p key={i}>{paragrafo}</p>)
          ) : (
            <p style={{ color: 'var(--v-tinta-suave)' }}>
              Ainda não há uma apresentação escrita deste professor.
            </p>
          )}
        </div>

        <div className="v-ficha-nota">
          <p>
            A ficha não mostra contactos. Para falar com o professor, fala com a secretaria do
            Centro Cultural da Guarda.
          </p>
        </div>

        <RodapeVitrine />
      </div>
    </main>
  )
}
