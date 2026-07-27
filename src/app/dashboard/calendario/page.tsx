import { BackButton } from '@/components/back-button'

export default function CalendarioEscolarProfessorPage() {
  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/dashboard" />
          <h1 className="text-2xl font-semibold text-foreground">Calendário Escolar</h1>
        </div>
        <p className="text-sm text-foreground/60">Em breve.</p>
      </div>
    </main>
  )
}
