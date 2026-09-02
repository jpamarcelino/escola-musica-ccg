import { redirect } from 'next/navigation'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { CalendarioAnoLetivo } from '@/components/calendario-ano-letivo'
import { calendarioDaFamilia, calendarioDoProfessor } from '@/lib/calendario'
import { ehContaCCG } from '@/lib/navegacao'
import { ANO_LETIVO_FIM, ANO_LETIVO_INICIO, formatarDataEscolar } from '@ccg/core'
import { VoltarAtras } from '@/components/voltar-atras'

// O calendário do ano letivo, o mesmo para as famílias e para os
// professores. É a mesma página e não duas porque é o mesmo calendário —
// o que muda são as aulas marcadas por cima dele, e essas vêm de quem
// está a ver.
export default async function CalendarioPage() {
  const { supabase, user, profile } = await getSchoolProfileContext()

  if (!user) {
    redirect('/login')
  }

  const professor = profile?.tipo === 'professor'
  if (!professor && !ehContaCCG(profile?.tipo)) {
    redirect('/dashboard')
  }

  const { porData, grupos } = professor
    ? await calendarioDoProfessor(supabase, user.id)
    : await calendarioDaFamilia(supabase, user.id)

  return (
    <main id="conteudo-principal" className="pinterest-calendario">
      <div className="pinterest-calendario-folha">
        <header className="pinterest-calendario-cabecalho">
          <VoltarAtras destino="/dashboard/agenda" className="pinterest-calendario-voltar" rotulo="Voltar à agenda" />
          <div>
            {/* "Calendário" e não "Calendário do ano letivo": num
                telemóvel o nome longo parte-se em duas linhas e empurra
                tudo. O ano letivo fica no subtítulo, onde cabe inteiro e
                traz também as datas. */}
            <h1>Calendário</h1>
            <p>
              {`Ano letivo 2026/27 · de ${formatarDataEscolar(ANO_LETIVO_INICIO, { day: 'numeric', month: 'long' })} a ${formatarDataEscolar(ANO_LETIVO_FIM, { day: 'numeric', month: 'long' })}`}
            </p>
          </div>
        </header>
        <CalendarioAnoLetivo porData={porData} grupos={grupos} />
      </div>
    </main>
  )
}
