import { describe, expect, it } from 'vitest'
import { TEXTOS_LEGAIS, IDADE_MINIMA_CONTA } from './textos-legais'

describe('textos legais', () => {
  it('a Política de Privacidade nunca é apresentada como consentimento', () => {
    // O documento é explícito: "Não usar «Aceito» salvo se existir um
    // consentimento novo, separado e realmente necessário."
    expect(TEXTOS_LEGAIS.privacidadeInformativo.toLowerCase()).not.toContain('aceito')
    expect(TEXTOS_LEGAIS.privacidadeInformativo.toLowerCase()).not.toContain('consinto')
    expect(TEXTOS_LEGAIS.privacidadeAtualizada.toLowerCase()).not.toContain('aceito')
    expect(TEXTOS_LEGAIS.privacidadeAtualizada.toLowerCase()).not.toContain('aceitar')
  })

  it('só os Termos usam linguagem de aceitação', () => {
    expect(TEXTOS_LEGAIS.aceitarTermos).toContain('aceito')
    expect(TEXTOS_LEGAIS.aceitarTermos).toContain('Termos de Utilização')
  })

  it('o texto de apagamento não promete um apagamento total', () => {
    // A versão móvel dizia que desaparecia tudo "sem cópia". A base
    // conserva presenças e mensalidades — e o texto tem de o dizer.
    const t = TEXTOS_LEGAIS.apagarConta
    expect(t).toContain('podem ser conservados')
    expect(t).toContain('pagamentos')
    expect(t).not.toMatch(/sem cópia/i)
    expect(t).not.toMatch(/todo o histórico/i)
  })

  it('o aviso de idade diz o que fazer para inscrever um menor', () => {
    expect(TEXTOS_LEGAIS.avisoIdade).toContain('18 anos')
    expect(TEXTOS_LEGAIS.avisoIdade).toContain('encarregado')
  })

  it('a idade mínima da conta é 18', () => {
    expect(IDADE_MINIMA_CONTA).toBe(18)
  })
})
