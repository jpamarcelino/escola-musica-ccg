// Formatação de valores em euros — um único sítio.
//
// Antes havia duas convenções em simultâneo: `${v.toFixed(2)}€` na
// administração (que dá "12.50€", com ponto) e
// `${v.toFixed(2).replace('.', ',')} €` no painel do professor (que dá
// "12,50 €"). Em português o separador decimal é a vírgula, e o
// `toFixed` devolve sempre ponto — a primeira forma estava errada. Em
// ecrãs de dinheiro, ver a mesma quantia escrita de duas maneiras
// dentro da mesma app lê-se como erro de cálculo.
//
// A app já usa `Intl.DateTimeFormat` para datas; isto é o equivalente
// para dinheiro, e trata sozinho do separador, do símbolo e da sua
// posição.
const FORMATADOR = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
})

// "12,50 €"
export function euros(valor: number): string {
  return FORMATADOR.format(valor)
}

// Para quando o valor pode não existir: uma mensalidade sem valor
// definido não é zero euros, é uma ausência — e deve dizê-lo por
// palavras em vez de mostrar "0,00 €", que seria falso.
export function eurosOuTexto(valor: number | null | undefined, alternativa: string): string {
  return valor === null || valor === undefined ? alternativa : FORMATADOR.format(valor)
}

// Só o número, sem símbolo — para dentro de <input type="number">, onde
// o símbolo e o espaço não podem entrar. Mantém o ponto decimal porque
// é isso que o input espera como valor.
export function eurosParaInput(valor: number): string {
  return valor.toFixed(2)
}
