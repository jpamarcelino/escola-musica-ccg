import { SkeletonCabecalho, SkeletonLista } from '@/components/skeleton'

export default function Loading() {
  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <SkeletonCabecalho />
        <SkeletonLista linhas={5} />
      </div>
    </main>
  )
}
