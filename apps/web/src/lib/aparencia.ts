// A preferência de aparência da app: Claro, Escuro ou Sistema.
//
// Vive no browser e não na base de dados de propósito. É uma escolha do
// APARELHO, não da conta: a mesma pessoa pode querer escuro no telemóvel
// à noite e claro no computador da secretaria. Guardá-la no perfil
// obrigaria os dois a concordar.
//

export const CHAVE_APARENCIA = 'ccg-aparencia'

// A cor que o sistema operativo pinta à volta da página: a faixa das
// horas e da bateria no iPhone quando a app corre do ecrã principal, e a
// barra do browser no resto. Não é decoração — sem ela, o topo do ecrã
// fica preto por baixo de uma página que já não é preta, e o desenho
// parece acabar a meio.
//
// No escuro não é o `--dark-bg` puro: o topo das páginas leva um banho
// azul, e a faixa tem de o acompanhar ou vê-se a emenda.
export const COR_TEMA: Record<'claro' | 'escuro', string> = {
  claro: '#26619c',
  escuro: '#182029',
}

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
  const tema = resolverAparencia(escolha)
  raiz.dataset.aparencia = escolha
  raiz.dataset.tema = tema
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_TEMA[tema])
}
