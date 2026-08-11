// Campos de formulário. O DESIGN_SYSTEM.md não os define, por isso seguem
// o espírito do resto: superfície branca com borda "--linha" como os
// cartões, raio de botão (13px), altura de botão (52px) e Inter — nunca
// serifada em interface (secção 1).
//
// "classesCampo" é exportada à parte para os campos que não podem usar o
// <input> daqui, como o PasswordInput, que é partilhado com outros ecrãs e
// tem o seu próprio botão de mostrar/ocultar. Assim o aspeto mantém-se num
// só sítio, mesmo onde a marcação tem de ser diferente.
export const classesCampo =
  'h-[52px] w-full rounded-[13px] border border-[var(--color-linha)] bg-white px-[14px] text-[15px] text-[var(--color-tinta)] outline-none transition-colors placeholder:text-[var(--color-tinta-suave)] focus:border-[var(--color-azul-logo)]'

export function Rotulo({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[12.5px] font-medium"
      style={{ color: 'var(--color-tinta-suave)' }}
    >
      {children}
    </label>
  )
}

// Rótulo + campo. Recebe o campo como filho para servir tanto o <input>
// normal como o PasswordInput.
export function Campo({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-[6px]">
      <Rotulo htmlFor={id}>{label}</Rotulo>
      {children}
    </div>
  )
}

export function CampoTexto({
  id,
  name,
  label,
  type = 'text',
  required = true,
  autoComplete,
  max,
  defaultValue,
}: {
  id: string
  name: string
  label: string
  type?: string
  required?: boolean
  autoComplete?: string
  max?: string
  defaultValue?: string
}) {
  return (
    <Campo id={id} label={label}>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        max={max}
        defaultValue={defaultValue}
        className={classesCampo}
      />
    </Campo>
  )
}
