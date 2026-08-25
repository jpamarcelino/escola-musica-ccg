// A preferência de aparência da app: Claro, Escuro ou Sistema.
//
// Vive no browser e não na base de dados de propósito. É uma escolha do
// APARELHO, não da conta: a mesma pessoa pode querer escuro no telemóvel
// à noite e claro no computador da secretaria. Guardá-la no perfil
// obrigaria os dois a concordar.
//
// Nota: por agora a app ainda só tem paleta clara. A escolha fica
// guardada e o atributo é escrito no <html>, mas nenhuma regra de CSS o
// lê ainda — quando o tema escuro existir, basta escrever as regras
// contra `[data-tema="escuro"]` e tudo o que está aqui passa a pintar.

export const CHAVE_APARENCIA = 'ccg-aparencia'

export type Aparencia = 'claro' | 'escuro' | 'sistema'

export const APARENCIAS: { valor: Aparencia; rotulo: string }[] = [
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
  { valor: 'sistema', rotulo: 'Sistema' },
]

export const APARENCIA_PREDEFINIDA: Aparencia = 'sistema'

export function ehAparencia(valor: unknown): valor is Aparencia {
  return valor === 'claro' || valor === 'escuro' || valor === 'sistema'
}

// O que a escolha significa AGORA. "sistema" depende do que o aparelho
// diz neste momento, e isso pode mudar sem a app ser recarregada.
export function resolverAparencia(escolha: Aparencia): 'claro' | 'escuro' {
  if (escolha !== 'sistema') return escolha
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

export function lerAparencia(): Aparencia {
  try {
    const guardada = window.localStorage.getItem(CHAVE_APARENCIA)
    return ehAparencia(guardada) ? guardada : APARENCIA_PREDEFINIDA
  } catch {
    // Safari em navegação privada rejeita o localStorage. Sem preferência
    // guardada a app continua a funcionar — usa a predefinição.
    return APARENCIA_PREDEFINIDA
  }
}

export function guardarAparencia(escolha: Aparencia): void {
  try {
    window.localStorage.setItem(CHAVE_APARENCIA, escolha)
  } catch {
    // Idem: não poder guardar não pode rebentar a página.
  }
}

// Escreve no <html> o que está em vigor. Dois atributos, não um:
// `data-tema` é o resultado (o que o CSS há de ler) e `data-aparencia` é
// a escolha da pessoa (o que o seletor há de mostrar marcado).
export function aplicarAparencia(escolha: Aparencia): void {
  const raiz = document.documentElement
  raiz.dataset.aparencia = escolha
  raiz.dataset.tema = resolverAparencia(escolha)
}
