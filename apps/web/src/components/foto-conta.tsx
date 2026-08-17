'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { useFormStatus } from 'react-dom'

export function FotoConta({
  action,
  fotoUrl,
  nome,
}: {
  action: (formData: FormData) => void
  fotoUrl: string | null
  nome: string
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [preview, setPreview] = useState<string | null>(fotoUrl)

  function aoEscolherFicheiro(evento: ChangeEvent<HTMLInputElement>) {
    const ficheiro = evento.target.files?.[0]
    if (!ficheiro) return

    // Mostra a foto escolhida já, sem esperar pelo carregamento — o
    // formulário submete-se sozinho logo a seguir.
    setPreview(URL.createObjectURL(ficheiro))
    formRef.current?.requestSubmit()
  }

  return (
    <form ref={formRef} action={action} className="flex items-center gap-4">
      {preview ? (
        // width/height explícitos: sem eles o browser não reserva o
        // espaço e a página salta quando a pré-visualização chega. 80 =
        // h-20/w-20.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt={nome}
          width={80}
          height={80}
          className="h-20 w-20 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-foreground/10 text-xs text-foreground/50">
          Sem foto
        </div>
      )}
      <BotaoCarregarFoto onChange={aoEscolherFicheiro} />
    </form>
  )
}

function BotaoCarregarFoto({
  onChange,
}: {
  onChange: (evento: ChangeEvent<HTMLInputElement>) => void
}) {
  const { pending } = useFormStatus()

  return (
    <label className={`botao-foto${pending ? ' a-carregar' : ''}`}>
      {pending && <span className="botao-spinner" aria-hidden="true" />}
      {pending ? 'A carregar…' : 'Carregar foto'}
      <input
        type="file"
        name="foto"
        accept="image/*"
        onChange={onChange}
        disabled={pending}
        className="sr-only"
      />
    </label>
  )
}
