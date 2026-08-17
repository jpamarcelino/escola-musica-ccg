// Mensagens de formulário. O DESIGN_SYSTEM.md não tem tokens de erro nem de
// sucesso — as regras negativas da secção 1 pedem discrição, por isso são
// texto colorido com uma barra fina à esquerda, e nunca caixas de fundo
// vermelho. Os dois tons são deduzidos da paleta: o vermelho é quente como
// o "--tinta", o verde é o "--verde" escurecido até dar contraste de leitura.
const COR_ERRO = '#9A3B2E'
const COR_INFO = '#4E7358'

function Barra({ cor, children }: { cor: string; children: React.ReactNode }) {
  return (
    <p
      className="border-l-2 pl-[10px] text-[13px] leading-[1.5]"
      style={{ borderColor: cor, color: cor }}
    >
      {children}
    </p>
  )
}

export function MensagemErro({ children }: { children: React.ReactNode }) {
  return (
    <Barra cor={COR_ERRO}>
      <span role="alert">{children}</span>
    </Barra>
  )
}

export function MensagemInfo({ children }: { children: React.ReactNode }) {
  return (
    <Barra cor={COR_INFO}>
      <span aria-live="polite">{children}</span>
    </Barra>
  )
}

// Contexto neutro — usada nos avisos de convite, que não são erro nem
// sucesso. Superfície recuada, como as caixas de ícone (secção 2).
export function MensagemNota({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="rounded-[12px] px-[12px] py-[10px] text-[13px] leading-[1.5]"
      style={{ backgroundColor: 'var(--color-papel-2)', color: 'var(--color-tinta-suave)' }}
    >
      {children}
    </p>
  )
}
