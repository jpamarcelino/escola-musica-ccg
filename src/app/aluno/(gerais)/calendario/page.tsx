import { PageHeader } from '@/components/page-header'

export default function CalendarioEscolarPage() {
  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader voltar="/dashboard" titulo="Calendário Escolar" />
        <p className="text-sm text-foreground/60">Em breve.</p>
      </div>
    </main>
  )
}
