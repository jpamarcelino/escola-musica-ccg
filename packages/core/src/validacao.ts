import { calcularIdade } from './idade'

// As regras que decidem se o que alguém escreveu num formulário serve.
//
// Estavam repetidas pelas Server Actions da web: "Preenche todos os
// campos" seis vezes, a regra da password três, as da data de nascimento
// três, duas e duas. E já tinham começado a divergir — a mesma situação
// tinha duas mensagens diferentes, "Data de nascimento inválida" num
// sítio e "Essa data de nascimento não é válida" noutro.
//
// Com a app móvel a escrever também, isso passava de incómodo a
// problema: as duas frentes podiam aceitar coisas diferentes. Aqui é uma
// regra só, testada, com uma mensagem só.
//
// Cada função devolve a mensagem de erro ou `null` quando está bem. É
// mais direto de ler do que um objeto com `valido: true`, e encadeia-se:
//
//     const erro = validarPassword(p) ?? validarTelefone(t)
//     if (erro) return { error: erro }

export type Erro = string | null

export const MENSAGEM_CAMPOS_EM_FALTA = 'Preenche todos os campos.'

export function validarObrigatorios(...valores: (string | null | undefined)[]): Erro {
  return valores.some((v) => !v || !v.trim()) ? MENSAGEM_CAMPOS_EM_FALTA : null
}

// Seis caracteres é o mínimo que o Supabase aceita por omissão. Não é uma
// password forte, e não é aqui que isso se resolve — mudar este número
// sem mudar a definição do projeto no Supabase daria um erro do servidor
// em vez de uma mensagem em português.
export const PASSWORD_MINIMO = 6

export function validarPassword(password: string): Erro {
  if (!password) return MENSAGEM_CAMPOS_EM_FALTA
  if (password.length < PASSWORD_MINIMO) {
    return `A password deve ter pelo menos ${PASSWORD_MINIMO} caracteres.`
  }
  return null
}

// Conta os algarismos e ignora tudo o resto: quem escreve "+351 912 345
// 678" ou "912-345-678" está a dar um número válido, e recusá-lo por
// causa da pontuação é fazer a pessoa adivinhar o formato.
export const TELEFONE_MINIMO_DIGITOS = 9

export function validarTelefone(telefone: string): Erro {
  const digitos = telefone.replace(/[^0-9]/g, '')
  return digitos.length < TELEFONE_MINIMO_DIGITOS
    ? 'Indica um número de telemóvel válido.'
    : null
}

// O NIF tem nove algarismos e um dígito de controlo — o último é a
// verificação dos oito primeiros. Validar a soma aqui apanha o engano de
// teclado no momento em que ele acontece, em vez de ir dar a uma fatura
// recusada pelas Finanças semanas depois.
//
// Guarda-se e compara-se só os algarismos: quem escreve "123 456 789"
// está a dar um NIF válido, e recusá-lo pela pontuação é fazer a pessoa
// adivinhar o formato.
export function normalizarNIF(nif: string): string {
  return nif.replace(/[^0-9]/g, '')
}

export function validarNIF(nif: string): Erro {
  const digitos = normalizarNIF(nif)

  if (!digitos) return MENSAGEM_CAMPOS_EM_FALTA
  if (digitos.length !== 9) return 'O NIF tem de ter nove algarismos.'

  // Módulo 11: cada algarismo pesa a sua posição, de 9 a 2.
  let soma = 0
  for (let i = 0; i < 8; i += 1) {
    soma += Number(digitos[i]) * (9 - i)
  }
  const resto = soma % 11
  // Restos 0 e 1 dão dígito de controlo 0 — a fórmula 11 - resto daria
  // 11 ou 10, que não são algarismos.
  const controlo = resto < 2 ? 0 : 11 - resto

  return controlo === Number(digitos[8]) ? null : 'Esse NIF não é válido. Confirma os algarismos.'
}

// `dono` muda a frase entre "a tua data de nascimento" e "a data de
// nascimento" — a mesma regra serve para quem se regista e para quem
// inscreve um filho, e a frase tem de saber de quem fala.
export function validarDataNascimento(
  data: string,
  dono: 'propria' | 'aluno' = 'propria'
): Erro {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return dono === 'propria'
      ? 'Indica a tua data de nascimento.'
      : 'Indica a data de nascimento.'
  }

  const idade = calcularIdade(data)
  if (idade === null) return 'Essa data de nascimento não é válida.'
  if (idade < 0) return 'A data de nascimento não pode ser no futuro.'
  // 120 anos não é um limite de dignidade — é a fronteira a partir da
  // qual é muito mais provável ser um erro de escrita no ano.
  if (idade > 120) return 'Confirma a data de nascimento.'

  return null
}

export function validarEmail(email: string): Erro {
  const limpo = email.trim()
  if (!limpo) return MENSAGEM_CAMPOS_EM_FALTA
  // Verificação deliberadamente frouxa. A validação a sério de um email é
  // mandar-lhe uma mensagem, e é o que o Supabase faz a seguir; apertar
  // aqui só serve para recusar endereços válidos que não cabem no padrão.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) {
    return 'Indica um email válido.'
  }
  return null
}

// Letras, espaços, hífenes e apóstrofos. Nada mais.
//
// A lista de letras inclui acentos e cedilha (\p{L} com a flag unicode),
// porque um nome português sem "ç" e sem "ã" não é um nome. Ficam de
// fora algarismos e pontuação: quem escreve "Maria123" ou "Maria!" está
// a enganar-se, e o nome vai parar a uma pauta, a uma fatura e a um
// certificado.
const NOME_PERMITIDO = /^[\p{L}\p{M}'\u2019\- ]+$/u

export function validarNome(nome: string): Erro {
  const limpo = nome.trim()
  if (!limpo) return MENSAGEM_CAMPOS_EM_FALTA
  if (limpo.length < 2) return 'Indica o nome completo.'
  if (/\d/.test(limpo)) return 'O nome não pode ter números.'
  if (!NOME_PERMITIDO.test(limpo)) {
    return 'O nome só pode ter letras, espaços, hífenes e apóstrofos.'
  }
  return null
}

// O conjunto que o registo precisa, pela ordem em que a web já o fazia —
// primeiro o que falta, depois a password, depois o contacto, e só no fim
// a data. A ordem decide qual é o erro que a pessoa vê primeiro.
//
// O nome e o email passaram a entrar aqui. Antes, um "Maria123" ou um
// email sem arroba só eram travados mais à frente — o email pelo
// Supabase, com uma mensagem em inglês, e o nome por ninguém.
export function validarRegisto(dados: {
  nome: string
  email: string
  password: string
  telefone: string
  dataNascimento: string
  // Opcional na assinatura, obrigatório quando vem: a app móvel ainda
  // não pede NIF, e passar a rejeitar lá os registos sem ele seria
  // partir o registo na app sem lá ter posto o campo.
  nif?: string
}): Erro {
  return (
    validarObrigatorios(dados.nome, dados.email, dados.password) ??
    validarNome(dados.nome) ??
    validarEmail(dados.email) ??
    validarPassword(dados.password) ??
    validarTelefone(dados.telefone) ??
    validarDataNascimento(dados.dataNascimento, 'propria') ??
    (dados.nif === undefined ? null : validarNIF(dados.nif))
  )
}
