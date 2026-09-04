// Para onde o /auth/confirm pode reencaminhar depois de validar um link.
//
// Vive num ficheiro proprio para poder ser testado: dentro da rota era
// logica privada que so se exercitava com um token valido, e um token
// valido depende de haver email a sair. Aqui e uma funcao pura.
//
// O `next` vem da propria morada, ou seja, de fora. Sem esta verificacao
// bastava altera-lo para levar quem clicasse a outro sitio — com o
// agravante de acontecer logo a seguir a entrar na conta, que e
// precisamente quando a pessoa esta mais disposta a escrever uma password
// onde lhe pedirem.
//
// `//` e `/\` ficam de fora porque os browsers leem os dois como o
// principio de um endereco noutro dominio.
export const DESTINO_PREDEFINIDO = '/dashboard'

export function destinoSeguro(bruto: string | null | undefined): string {
  if (!bruto) return DESTINO_PREDEFINIDO
  if (!bruto.startsWith('/')) return DESTINO_PREDEFINIDO
  if (bruto.startsWith('//') || bruto.startsWith('/\\')) return DESTINO_PREDEFINIDO
  return bruto
}
