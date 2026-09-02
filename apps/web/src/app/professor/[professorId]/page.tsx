import { RodapeLegal } from '@/components/rodape-legal'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VoltarAtras } from '@/components/voltar-atras'

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
    <div className="pinterest-publico-pagina">
      <main id="conteudo-principal" className="ficha-professor">
        <VoltarAtras destino={destinoVoltar} className="ficha-professor-voltar" rotulo="Voltar" />

        <section className="ficha-professor-identidade">
          <span className="ficha-professor-retrato">
            {ficha.foto_url ? (
              <Image
                src={ficha.foto_url}
                alt={`Retrato de ${ficha.nome}`}
                width={192}
                height={192}
              />
            ) : (
              <span className="ficha-professor-inicial" aria-hidden="true">
                {ficha.nome.trim().charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <div>
            <p>{escola ?? 'Centro Cultural da Guarda'}</p>
            <h1>{ficha.nome}</h1>
          </div>
        </section>

        {ficha.disciplinas.length > 0 && (
          <ul className="ficha-professor-disciplinas" aria-label="Disciplinas que ensina">
            {ficha.disciplinas.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}

        <section className="ficha-professor-seccao">
          <h2>Apresentação</h2>
          {ficha.bio ? (
            <article className="ficha-professor-bio">{ficha.bio}</article>
          ) : (
            <p className="ficha-professor-sem-bio">
              Este professor ainda não escreveu uma apresentação. As disciplinas que
              ensina estão acima.
            </p>
          )}
        </section>
      </main>
      <RodapeLegal />
    </div>
  )
}
