import { Rotulo } from '@/components/campo-formulario'

// O campo dos seis algarismos.
//
// Uma caixa só, e não seis caixinhas separadas. As seis caixinhas ficam
// bonitas numa imagem e são um alçapão na vida real: colar o código de
// uma vez raramente funciona, o apagar salta para a caixa anterior de
// formas que ninguém acerta à primeira, e os leitores de ecrã anunciam
// seis campos sem nome onde há uma coisa só para escrever. Uma caixa
// larga, com os algarismos espaçados, faz o mesmo trabalho sem nada
// disso.
//
// `autoComplete="one-time-code"` é o que faz o iOS e o Android
// oferecerem o código por cima do teclado assim que ele chega — sem
// isto, a pessoa tem de sair da app, decorar seis algarismos e voltar.
// `inputMode="numeric"` traz o teclado dos números no telemóvel.
export function CampoCodigo({
  id = 'codigo',
  label = 'Código de seis algarismos',
  defaultValue,
}: {
  id?: string
  label?: string
  defaultValue?: string
}) {
  return (
    <div className="space-y-[6px]">
      <Rotulo htmlFor={id}>{label}</Rotulo>
      <input
        id={id}
        name="codigo"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        // Sem `pattern` nem `maxLength` a apertar: o servidor tira o que
        // não é algarismo antes de validar, e um campo que se recusa a
        // aceitar o que a pessoa colou (com um espaço no meio, como o
        // email costuma trazer) é pior do que um que aceita e limpa.
        autoFocus
        placeholder="000000"
        defaultValue={defaultValue}
        aria-describedby={`${id}-ajuda`}
        className="campo-codigo"
      />
      <p id={`${id}-ajuda`} className="campo-codigo-ajuda">
        Está no email que te enviámos. Vê também o spam.
      </p>
    </div>
  )
}
