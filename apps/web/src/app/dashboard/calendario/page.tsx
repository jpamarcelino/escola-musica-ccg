import { redirect } from 'next/navigation'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { PageHeader } from '@/components/page-header'
import { CalendarioAnoLetivo } from '@/components/calendario-ano-letivo'
import { calendarioDaFamilia, calendarioDoProfessor } from '@/lib/calendario'
import { ehContaCCG } from '@/lib/navegacao'
import { ANO_LETIVO_FIM, ANO_LETIVO_INICIO, formatarDataEscolar } from '@ccg/core'

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
    <main id="conteudo-principal" className="flex-1 flex justify-center p-3 pb-[104px] sm:p-6 sm:pb-[104px]">
      <div className="w-full max-w-4xl space-y-6">
        {/* "Calendário" e não "Calendário do ano letivo": o título do
            PageHeader corta-se numa linha, e num telemóvel o nome longo
            chegava truncado. O ano letivo passa a estar no subtítulo,
            onde cabe inteiro e traz também as datas. */}
        <PageHeader
          voltar="/dashboard/agenda"
          titulo="Calendário"
          subtitulo={`Ano letivo 2026/27 · de ${formatarDataEscolar(ANO_LETIVO_INICIO, { day: 'numeric', month: 'long' })} a ${formatarDataEscolar(ANO_LETIVO_FIM, { day: 'numeric', month: 'long' })}`}
        />
        <CalendarioAnoLetivo porData={porData} grupos={grupos} />
      </div>
    </main>
  )
}
