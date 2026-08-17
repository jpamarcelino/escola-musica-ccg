// Distintivo do DESIGN_SYSTEM.md (secção 6): inline, a seguir ao título e
// na mesma linha. As cores são literais e não tokens porque são exclusivas
// deste elemento — não há mais nada na app com este par de castanhos.
export function Distintivo({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="shrink-0 rounded-[5px] border px-[5px] pb-[2px] pt-[2.5px] text-[8px] font-semibold uppercase tracking-[0.1em]"
      style={{
        color: '#6C4A1E',
        backgroundColor: '#F2E3CD',
        borderColor: '#E2CDAE',
      }}
    >
      {children}
    </span>
  )
}
