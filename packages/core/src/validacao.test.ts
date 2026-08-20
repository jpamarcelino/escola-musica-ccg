import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MENSAGEM_CAMPOS_EM_FALTA,
  validarDataNascimento,
  validarEmail,
  validarNome,
  validarObrigatorios,
  validarPassword,
  validarRegisto,
  validarTelefone,
  validarNIF,
  normalizarNIF,
} from './validacao'

afterEach(() => {
  vi.useRealTimers()
})

describe('validarObrigatorios', () => {
  it('aceita quando estão todos preenchidos', () => {
    expect(validarObrigatorios('a', 'b')).toBeNull()
  })

  it('recusa vazios, nulos e indefinidos', () => {
    expect(validarObrigatorios('a', '')).toBe(MENSAGEM_CAMPOS_EM_FALTA)
    expect(validarObrigatorios(null, 'b')).toBe(MENSAGEM_CAMPOS_EM_FALTA)
    expect(validarObrigatorios(undefined)).toBe(MENSAGEM_CAMPOS_EM_FALTA)
  })

  // Um campo com espaços não está preenchido. Sem isto, um nome " " passava
  // e criava um perfil sem nome visível.
  it('recusa um campo que só tem espaços', () => {
    expect(validarObrigatorios('   ')).toBe(MENSAGEM_CAMPOS_EM_FALTA)
  })
})

describe('validarPassword', () => {
  it('aceita seis caracteres', () => {
    expect(validarPassword('abcdef')).toBeNull()
  })

  it('recusa cinco', () => {
    expect(validarPassword('abcde')).toContain('pelo menos 6')
  })

  // Espaços contam como caracteres — não se apara a password, porque
  // apará-la mudaria a password que a pessoa escolheu.
  it('conta os espaços como caracteres', () => {
    expect(validarPassword('a b c ')).toBeNull()
  })

  it('trata a password vazia como campo em falta', () => {
    expect(validarPassword('')).toBe(MENSAGEM_CAMPOS_EM_FALTA)
  })
})

describe('validarTelefone', () => {
  it('aceita nove algarismos', () => {
    expect(validarTelefone('912345678')).toBeNull()
  })

  // O que interessa são os algarismos. Recusar por causa da pontuação é
  // fazer a pessoa adivinhar o formato que a app quer.
  it('ignora espaços, traços, parênteses e o indicativo', () => {
    expect(validarTelefone('912 345 678')).toBeNull()
    expect(validarTelefone('912-345-678')).toBeNull()
    expect(validarTelefone('+351 912 345 678')).toBeNull()
    expect(validarTelefone('(351) 912345678')).toBeNull()
  })

  it('recusa oito algarismos', () => {
    expect(validarTelefone('91234567')).toContain('telemóvel')
  })

  it('recusa um campo só com pontuação', () => {
    expect(validarTelefone('--- --- ---')).toContain('telemóvel')
  })
})

describe('validarDataNascimento', () => {
  it('aceita uma data normal', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 17))
    expect(validarDataNascimento('2000-01-01')).toBeNull()
  })

  it('recusa um formato que não seja AAAA-MM-DD', () => {
    expect(validarDataNascimento('01/01/2000')).toContain('data de nascimento')
    expect(validarDataNascimento('')).toContain('data de nascimento')
  })

  it('recusa uma data impossível', () => {
    expect(validarDataNascimento('2000-13-45')).toBe('Essa data de nascimento não é válida.')
  })

  it('recusa uma data no futuro', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 17))
    expect(validarDataNascimento('2027-01-01')).toContain('no futuro')
  })

  it('recusa mais de 120 anos, que é quase sempre erro no ano', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 17))
    expect(validarDataNascimento('1890-01-01')).toContain('Confirma')
  })

  // A mesma regra serve para quem se regista e para quem inscreve um
  // filho; o que muda é de quem a frase fala.
  it('fala na segunda pessoa a quem se regista, e não a quem inscreve', () => {
    expect(validarDataNascimento('x', 'propria')).toBe('Indica a tua data de nascimento.')
    expect(validarDataNascimento('x', 'aluno')).toBe('Indica a data de nascimento.')
  })
})

describe('validarEmail', () => {
  it('aceita endereços comuns', () => {
    expect(validarEmail('nome@exemplo.pt')).toBeNull()
    expect(validarEmail('nome.apelido+etiqueta@sub.exemplo.co.uk')).toBeNull()
  })

  it('recusa o que não tem arroba nem domínio', () => {
    expect(validarEmail('nome')).toContain('email válido')
    expect(validarEmail('nome@exemplo')).toContain('email válido')
    expect(validarEmail('nome @exemplo.pt')).toContain('email válido')
  })

  it('trata o vazio como campo em falta', () => {
    expect(validarEmail('  ')).toBe(MENSAGEM_CAMPOS_EM_FALTA)
  })
})

describe('validarNome', () => {
  it('aceita um nome', () => {
    expect(validarNome('Ana')).toBeNull()
  })

  it('recusa uma letra só', () => {
    expect(validarNome('A')).toContain('nome completo')
  })
})

describe('validarRegisto', () => {
  const bons = {
    nome: 'Ana Costa',
    email: 'ana@exemplo.pt',
    password: 'segredo1',
    telefone: '912345678',
    dataNascimento: '1990-05-20',
  }

  it('aceita um registo completo', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 17))
    expect(validarRegisto(bons)).toBeNull()
  })

  // A ordem decide qual é o erro que a pessoa vê primeiro, e é a mesma
  // que a web já tinha. Com dois campos errados, ganha o de cima.
  it('mostra o campo em falta antes da password curta', () => {
    expect(validarRegisto({ ...bons, nome: '', password: '123' })).toBe(
      MENSAGEM_CAMPOS_EM_FALTA
    )
  })

  it('mostra a password curta antes do telefone errado', () => {
    expect(validarRegisto({ ...bons, password: '123', telefone: '1' })).toContain(
      'pelo menos 6'
    )
  })

  it('mostra o telefone antes da data', () => {
    expect(validarRegisto({ ...bons, telefone: '1', dataNascimento: 'x' })).toContain(
      'telemóvel'
    )
  })

  // A web nunca verificou o formato do email — aceita o que lá estiver e
  // deixa o Supabase recusar. Este teste fixa esse comportamento, para
  // que adoptar as validações partilhadas não mude a web sem querer.
  it('não recusa um email mal formado, tal como a web', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 17))
    expect(validarRegisto({ ...bons, email: 'isto-nao-e-um-email' })).toBeNull()
  })
})

describe('validarNIF', () => {
  it('aceita NIFs com dígito de controlo certo', () => {
    expect(validarNIF('501442600')).toBeNull()
    expect(validarNIF('123456789')).toBeNull()
  })

  it('ignora espaços e pontuação', () => {
    expect(validarNIF('123 456 789')).toBeNull()
    expect(validarNIF('123-456-789')).toBeNull()
  })

  it('recusa o dígito de controlo errado', () => {
    expect(validarNIF('123456780')).toBe('Esse NIF não é válido. Confirma os algarismos.')
  })

  it('recusa comprimentos que não sejam nove', () => {
    expect(validarNIF('12345678')).toBe('O NIF tem de ter nove algarismos.')
    expect(validarNIF('1234567890')).toBe('O NIF tem de ter nove algarismos.')
  })

  it('trata o vazio como campo por preencher', () => {
    expect(validarNIF('')).toBe(MENSAGEM_CAMPOS_EM_FALTA)
  })
})

describe('normalizarNIF', () => {
  it('guarda só os algarismos', () => {
    expect(normalizarNIF('123 456 789')).toBe('123456789')
  })
})
