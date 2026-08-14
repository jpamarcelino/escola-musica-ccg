import { SkeletonCabecalho, SkeletonLista } from '@/components/skeleton'

export default function Loading() {
  return (
    <main className="flex-1 flex flex-col px-[22px] py-[26px] items-center">
      <div className="w-full max-w-[420px] space-y-[26px]">
        <SkeletonCabecalho />
        <SkeletonLista linhas={3} />
      </div>
    </main>
  )
}
