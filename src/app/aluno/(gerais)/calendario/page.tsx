import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { BotaoSecundario } from '@/components/botao-secundario'

// O calendário do ano letivo ainda não existe — as interrupções e as
// pausas estão só na cabeça da secretaria. Até existir, esta página
// dizia "Em breve." e mais nada, o que deixava quem cá chegasse sem
// perceber se a app estava avariada.
//
// Passa a explicar o que vai aparecer aqui e a encaminhar para o que já
// há hoje: o horário semanal do filho, que é a pergunta que traz as
// pessoas a um calendário.
export default async function CalendarioEscolarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // O primeiro filho da conta serve de destino — é o mesmo critério que
  // a navegação inferior usa quando ainda não há filho escolhido.
  const { data: alunos } = await supabase
    .from('alunos')
    .select('id, nome')
    .eq('encarregado_id', user.id)
    .order('criado_em')
    .limit(1)
  const aluno = alunos?.[0]

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader voltar="/dashboard" titulo="Calendário Escolar" />
        <EmptyState
          titulo="Ainda não há calendário publicado"
          descricao="Quando a escola publicar o ano letivo, é aqui que ficam as interrupções, as pausas e as datas de audição. Até lá, o horário semanal já mostra as aulas marcadas."
          acao={
            aluno ? (
              <BotaoSecundario href={`/aluno/${aluno.id}/horario`}>
                Ver o horário {aluno.nome ? `de ${aluno.nome.split(' ')[0]}` : ''}
              </BotaoSecundario>
            ) : undefined
          }
        />
      </div>
    </main>
  )
}
