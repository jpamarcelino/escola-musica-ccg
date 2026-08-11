// Fundo de papel com grão (DESIGN_SYSTEM.md, secções 2 e 7). Sem pincelada:
// a secção 7 reserva-a para ecrãs de entrada e proíbe-a em formulários.
//
// O grão está aqui repetido a partir da página inicial. Quando houver mais
// ecrãs migrados, a inicial deve passar a usar este mesmo componente e a
// cópia desaparece.
const GRAO =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E\")"

export function FundoPapel({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="relative flex flex-1 flex-col items-center justify-center px-[22px] py-[26px]"
      style={{
        backgroundColor: 'var(--color-papel)',
        color: 'var(--color-tinta)',
        fontFamily: 'var(--font-inter)',
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: GRAO, opacity: 0.16, mixBlendMode: 'multiply' }}
      />
      <div className="relative w-full max-w-[420px]">{children}</div>
    </main>
  )
}
