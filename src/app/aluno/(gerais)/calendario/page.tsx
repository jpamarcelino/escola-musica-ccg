import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { BotaoSecundario } from '@/components/botao-secundario'

// O calendário do ano letivo ainda não existe — as interrupções e as
// pausas estão só na cabeça da secretaria. Até existir, esta página
// dizia "Em breve." e mais nada, o que deixava quem cá chegasse sem
// perceber se a app estava avariada.
//
// Passa a explicar o que vai aparecer aqui e a encaminhar para o que já
// há hoje: a agenda da família, que é a pergunta que traz as pessoas a um
// calendário.
//
// O botão apontava ao primeiro aluno da conta, escolhido por ordem de
// criação. Numa família com dois filhos abria sempre o mesmo, sem dizer
// porquê — e a agenda de família mostra os dois de uma vez, que era o que
// a pessoa queria ver.
export default function CalendarioEscolarPage() {
  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader voltar="/dashboard" titulo="Calendário Escolar" />
        <EmptyState
          titulo="Ainda não há calendário publicado"
          descricao="Quando a escola publicar o ano letivo, é aqui que ficam as interrupções, as pausas e as datas de audição. Até lá, a agenda já mostra as aulas marcadas."
          acao={<BotaoSecundario href="/dashboard/agenda">Ver a agenda</BotaoSecundario>}
        />
      </div>
    </main>
  )
}
