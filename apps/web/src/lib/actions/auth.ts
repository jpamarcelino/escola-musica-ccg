'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { normalizarNIF, validarNIF, validarPassword, validarRegisto } from '@ccg/core'

async function origem() {
  const headersList = await headers()
  const host = headersList.get('host')
  const protocolo = host?.startsWith('localhost') ? 'http' : 'https'
  return `${protocolo}://${host}`
}

// Os valores que a pessoa escreveu, devolvidos com o erro.
//
// O React 19 limpa os campos de um formulário quando a acção termina.
// Num registo com seis campos, isso transformava um engano num
// algarismo do NIF em escrever tudo outra vez — e é exatamente no
// momento em que a pessoa já está irritada que a app lhe pede mais
// trabalho.
//
// A password não vem cá: é o único campo que o browser volta a preencher
// sozinho (gestores de password) e o único que não deve andar a saltar
// entre o servidor e o ecrã mais vezes do que as necessárias.
export type ValoresRegisto = {
  nome?: string
  telefone?: string
  nif?: string
  email?: string
  // As declarações voltam com o erro, para não se perderem quando outro
  // campo falha. Uma checkbox que se desmarca sozinha faz a pessoa
  // aceitar duas vezes sem perceber porquê.
  aceitaTermos?: boolean
  declaraMaioridade?: boolean
}

export type AuthState =
  | { error?: string; info?: string; valores?: ValoresRegisto }
  | undefined

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const nome = String(formData.get('nome') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const telefone = String(formData.get('telefone') ?? '').trim()
  // Declarações do formulário. A data de nascimento do titular deixou de
  // ser pedida — ver validarRegisto e a migração 0025.
  const aceitaTermos = formData.get('aceitaTermos') === 'on'
  const declaraMaioridade = formData.get('declaraMaioridade') === 'on'
  // Só os algarismos, para a coluna nunca guardar "123 456 789" e
  // "123456789" como se fossem NIFs diferentes.
  const nif = normalizarNIF(String(formData.get('nif') ?? ''))
  // Presente só quando se vem de um link de convite (professor, admin ou
  // migração de um perfil de aluno) — o próprio código é revalidado no
  // servidor pelo trigger handle_new_user, nunca confiado por si só.
  const conviteCodigo = String(formData.get('conviteCodigo') ?? '').trim() || null

  // As mesmas regras que a app móvel usa, no mesmo ficheiro: campos
  // obrigatórios, password, telefone e as duas declarações, por esta
  // ordem. Tudo o que a pessoa escreveu volta com o erro, para os campos
  // serem repostos.
  const valores = { nome, telefone, nif, email, aceitaTermos, declaraMaioridade }

  const erro = validarRegisto({
    nome,
    email,
    password,
    telefone,
    aceitaTermos,
    declaraMaioridade,
    nif,
  })
  if (erro) {
    return { error: erro, valores }
  }

  const supabase = await createClient()

  // A versão dos Termos que está EM VIGOR, lida da base. O formulário não
  // a envia e não podia: uma versão vinda do cliente é uma versão que o
  // cliente escolheu, e prova de aceitação assim não prova nada.
  const { data: docTermos } = await supabase
    .from('documentos_legais')
    .select('versao')
    .eq('tipo', 'termos')
    .eq('ativo', true)
    .maybeSingle()

  const versaoTermos = docTermos?.versao ?? null

  if (!versaoTermos) {
    // Sem Termos publicados não se criam contas. É uma situação de
    // configuração — alguém desativou a versão em vigor sem publicar
    // outra — e deixar passar registos sem aceitação era pior.
    return {
      error: 'Não é possível criar conta neste momento. Contacta a secretaria.',
      valores,
    }
  }

  // Duas perguntas à base de dados antes de criar seja o que for.
  //
  // O email já era recusado, mas só pelo Supabase e em inglês. O
  // telemóvel não era recusado por ninguém — e duas contas com o mesmo
  // número é a secretaria a ligar para a pessoa errada.
  const [{ data: emailUsado }, { data: telefoneUsado }] = await Promise.all([
    supabase.rpc('email_ja_registado', { p_email: email }),
    supabase.rpc('telefone_ja_registado', { p_telefone: telefone }),
  ])

  if (emailUsado) {
    return {
      error: 'Já existe uma conta com este email. Entra em vez de criar conta nova.',
      valores,
    }
  }

  if (telefoneUsado) {
    return {
      error: 'Já existe uma conta com este número de telemóvel.',
      valores,
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nome,
        telefone,
        nif,
        convite_codigo: conviteCodigo,
        // A versão dos Termos vem do SERVIDOR, não do formulário: é lida
        // acima da base, e o trigger handle_new_user volta a confirmá-la
        // contra a versão em vigor antes de registar a aceitação. Assim a
        // prova fica guardada mesmo com confirmação de email ativa, em
        // que ainda não há sessão para chamar registar_aceitacao.
        termos_versao: versaoTermos,
      },
    },
  })

  if (error) {
    return { error: error.message, valores }
  }

  // Se a confirmação de email estiver ativa no Supabase, ainda não há
  // sessão nesta fase: a conta existe, mas só se entra depois de provar
  // que o email é mesmo desta pessoa. Segue-se para o ecrã do código.
  if (!data.session) {
    await guardarEmailPorConfirmar(email)
    redirect('/confirmar-email')
  }

  redirect('/dashboard')
}

// O email que está à espera de confirmação, entre o registo e o código.
//
// Num cookie e não na URL: é um dado pessoal, e uma morada com o email
// dentro fica no histórico do browser, nos registos do servidor e em
// qualquer sítio por onde a ligação seja partilhada. Aqui não sai do
// aparelho — `httpOnly` para nem o JavaScript da própria página lhe
// chegar, e meia hora de validade, que é mais do que o código dura.
const COOKIE_POR_CONFIRMAR = 'ccg-email-por-confirmar'

async function guardarEmailPorConfirmar(email: string) {
  const armazem = await cookies()
  armazem.set(COOKIE_POR_CONFIRMAR, email, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 30,
  })
}

export async function emailPorConfirmar(): Promise<string | null> {
  const armazem = await cookies()
  return armazem.get(COOKIE_POR_CONFIRMAR)?.value ?? null
}

async function esquecerEmailPorConfirmar() {
  const armazem = await cookies()
  armazem.delete(COOKIE_POR_CONFIRMAR)
}

// Seis dígitos, nem mais nem menos. A pessoa cola o código do email e
// vem quase sempre com espaços à volta; tirar o que não é algarismo
// evita o erro mais parvo desta página.
function limparCodigo(bruto: string) {
  return bruto.replace(/\D/g, '').slice(0, 6)
}

export async function confirmarEmail(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const codigo = limparCodigo(String(formData.get('codigo') ?? ''))
  // O email vem do cookie. Se a pessoa fechou o separador e voltou mais
  // tarde, o cookie pode já não estar cá — nesse caso ela escreve-o, e é
  // por isso que o campo existe no formulário.
  const email = (await emailPorConfirmar()) ?? String(formData.get('email') ?? '').trim()

  if (!email) {
    return { error: 'Escreve o email com que criaste a conta.' }
  }
  if (codigo.length !== 6) {
    return { error: 'O código tem seis algarismos.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: codigo,
    type: 'signup',
  })

  if (error) {
    return {
      error: 'Código errado ou já expirado. Confere o email ou pede um novo código.',
      valores: { email },
    }
  }

  await esquecerEmailPorConfirmar()
  redirect('/dashboard')
}

export async function reenviarCodigoRegisto(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = (await emailPorConfirmar()) ?? String(formData.get('email') ?? '').trim()

  if (!email) {
    return { error: 'Escreve o email com que criaste a conta.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({ type: 'signup', email })

  if (error) {
    return { error: 'Não foi possível enviar outro código. Tenta daqui a pouco.' }
  }

  await guardarEmailPorConfirmar(email)
  return { info: 'Enviámos outro código. Pode demorar um minuto a chegar.' }
}

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Preenche todos os campos.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email ou password incorretos.' }
  }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function pedirRecuperacaoPassword(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()

  if (!email) {
    return { error: 'Introduz o teu email.' }
  }

  const supabase = await createClient()
  // O mesmo pedido de sempre. O que muda é o email que sai dele: assim
  // que o modelo no Supabase incluir o `{{ .Token }}`, esta chamada
  // passa a mandar um código de seis algarismos além do link. O
  // `redirectTo` fica, para quem preferir clicar.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origem()}/auth/confirm?next=/redefinir-password`,
  })

  if (error) {
    return { error: 'Não foi possível enviar o email. Tenta novamente.' }
  }

  // Guarda-se o email para a página seguinte não o voltar a pedir. Note-se
  // que se chega aqui mesmo quando a conta não existe: a mensagem é
  // deliberadamente vaga e o percurso é o mesmo nos dois casos, para esta
  // página não servir para descobrir quem tem conta na escola.
  await guardarEmailPorConfirmar(email)
  redirect('/redefinir-password')
}

// Repor a password por dois caminhos, na mesma página.
//
// Quem clicou no link do email chega aqui já com sessão (o /auth/confirm
// trocou o código por uma) e só tem de escrever a password nova. Quem
// veio pelo código escreve os seis algarismos, e é o `verifyOtp` que lhe
// dá a sessão antes de a password ser mudada.
//
// Os dois existem de propósito. O link parte com facilidade — clientes
// de email que o pré-visitam e o gastam, apps que o abrem num browser
// interno sem os cookies do outro. O código atravessa tudo isso porque
// é a pessoa que o transporta.
export async function atualizarPassword(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = String(formData.get('password') ?? '')
  const codigo = limparCodigo(String(formData.get('codigo') ?? ''))

  const erroPassword = validarPassword(password)
  if (erroPassword) {
    return { error: erroPassword }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const email = (await emailPorConfirmar()) ?? String(formData.get('email') ?? '').trim()

    if (!email) {
      return { error: 'Escreve o email da tua conta.' }
    }
    if (codigo.length !== 6) {
      return { error: 'O código tem seis algarismos.' }
    }

    const { error: erroCodigo } = await supabase.auth.verifyOtp({
      email,
      token: codigo,
      type: 'recovery',
    })

    if (erroCodigo) {
      return {
        error: 'Código errado ou já expirado. Pede um novo email de recuperação.',
        valores: { email },
      }
    }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: 'Não foi possível atualizar a password. Tenta novamente.' }
  }

  await esquecerEmailPorConfirmar()
  redirect('/dashboard')
}

// As contas criadas antes do NIF passar a ser pedido ficaram sem ele, e
// a secretaria precisa dele para faturar. Sem um sítio onde o escrever,
// a única saída era criar outra conta.
export async function atualizarNifConta(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const nif = normalizarNIF(String(formData.get('nif') ?? ''))

  const erro = validarNIF(nif)
  if (erro) {
    return { error: erro }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.from('profiles').update({ nif }).eq('id', user.id)

  if (error) {
    return { error: 'Não foi possível guardar o NIF. Tenta novamente.' }
  }

  revalidatePath('/dashboard/conta')
  revalidatePath('/admin/alunos')

  return { info: 'NIF guardado.' }
}

export async function atualizarNomeConta(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const nome = String(formData.get('nome') ?? '').trim()

  if (!nome) {
    return { error: 'O nome não pode ficar vazio.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.from('profiles').update({ nome }).eq('id', user.id)

  if (error) {
    return { error: 'Não foi possível atualizar o nome. Tenta novamente.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/conta')
  revalidatePath('/admin')
  revalidatePath('/admin/conta')

  return { info: 'Nome atualizado.' }
}

export async function atualizarEmailConta(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()

  if (!email) {
    return { error: 'Indica o novo email.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfil } = await supabase
    .from('perfis_escola')
    .select('tipo')
    .eq('id', user.id)
    .single()

  // Só as Contas CCG podem mudar o próprio email por aqui — professores e
  // admins pedem à direção, para já. (Os perfis de aluno não têm email
  // próprio: quem tem login é sempre a conta que os gere.)
  if (perfil?.tipo !== 'conta') {
    return { error: 'Não tens permissão para alterar o email.' }
  }

  const { error } = await supabase.auth.updateUser({ email })

  if (error) {
    return { error: 'Não foi possível atualizar o email. Tenta novamente.' }
  }

  // Não atualizamos profiles.email já aqui: o Supabase só troca o email de
  // autenticação depois de confirmado por link (enviado para o email
  // antigo e/ou novo, consoante a configuração do projeto) — escrever já
  // o valor novo deixava profiles.email a mostrar um email que ainda não
  // dá para usar no login, uma mentira até à confirmação (ou para sempre,
  // se nunca for confirmado).
  return {
    info: 'Enviámos um link de confirmação para o novo email. O email só muda depois de confirmares.',
  }
}

export async function atualizarPasswordConta(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const passwordAtual = String(formData.get('passwordAtual') ?? '')
  const passwordNova = String(formData.get('passwordNova') ?? '')
  const passwordNovaRepetir = String(formData.get('passwordNovaRepetir') ?? '')

  if (!passwordAtual || !passwordNova || !passwordNovaRepetir) {
    return { error: 'Preenche todos os campos.' }
  }
  if (passwordNova.length < 6) {
    return { error: 'A nova password deve ter pelo menos 6 caracteres.' }
  }
  if (passwordNova !== passwordNovaRepetir) {
    return { error: 'As passwords novas não coincidem.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login')
  }

  // Confirma a password atual voltando a autenticar antes de a trocar —
  // evita que alguém com uma sessão aberta (ex: telemóvel destrancado)
  // mude a password sem a saber.
  const { error: erroAtual } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: passwordAtual,
  })

  if (erroAtual) {
    return { error: 'A password atual está incorreta.' }
  }

  const { error } = await supabase.auth.updateUser({ password: passwordNova })

  if (error) {
    return { error: 'Não foi possível atualizar a password. Tenta novamente.' }
  }

  return { info: 'Password atualizada.' }
}

export async function apagarConta() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('perfis_escola')
    .select('tipo')
    .eq('id', user.id)
    .single()
  // Fora da administração, apagar a conta vive na página seguinte à
  // Conta — é para lá que o erro tem de voltar, senão a mensagem aparece
  // num ecrã onde já não há botão nenhum para tentar outra vez.
  const contaHref = profile?.tipo === 'admin' ? '/admin/conta' : '/dashboard/conta/avancado'

  // Apaga a conta através de uma função da BD (a app só tem a anon key,
  // que não pode apagar de auth.users diretamente). Isto cascateia até
  // profiles, matrículas, disponibilidades e horários — o histórico de
  // presenças e mensalidades fica guardado (ver migrações 0008 e 0013).
  const { error } = await supabase.rpc('apagar_propria_conta')

  if (error) {
    redirect(`${contaHref}?erro=${encodeURIComponent('Não foi possível apagar a conta. Tenta novamente.')}`)
  }

  await supabase.auth.signOut()
  redirect('/login')
}

// Um super admin não pode apagar a conta como qualquer outra: se o
// fizesse sem escolher sucessor, ninguém mais conseguia gerir admins
// depois (a proteção contra auto-promoção bloqueia toda a gente). Por
// isso exige-se, além da password (a app não pode confiar só num popup
// para uma conta com este poder), escolher outro admin para passar a ser
// super admin antes de apagar.
export async function apagarContaSuperAdmin(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const novoSuperAdminId = String(formData.get('novoSuperAdminId') ?? '')
  const password = String(formData.get('password') ?? '')

  if (!novoSuperAdminId) {
    return { error: 'Escolhe quem fica como novo super admin.' }
  }
  if (!password) {
    return { error: 'Introduz a tua password para confirmar.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('perfis_escola')
    .select('super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.super_admin) {
    return { error: 'Só um super admin pode usar esta opção.' }
  }

  const { data: sucessor } = await supabase
    .from('perfis_escola')
    .select('id')
    .eq('id', novoSuperAdminId)
    .eq('admin', true)
    .neq('id', user.id)
    .maybeSingle()

  if (!sucessor) {
    return { error: 'Escolhe um administrador válido para suceder.' }
  }

  const { error: erroPassword } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  })

  if (erroPassword) {
    return { error: 'A password está incorreta.' }
  }

  const { error: erroSucessor } = await supabase
    .from('perfis_escola')
    .update({ super_admin: true })
    .eq('id', novoSuperAdminId)

  if (erroSucessor) {
    return { error: 'Não foi possível passar o super admin. Tenta novamente.' }
  }

  const { error: erroApagar } = await supabase.rpc('apagar_propria_conta')

  if (erroApagar) {
    return { error: 'Não foi possível apagar a conta. Tenta novamente.' }
  }

  await supabase.auth.signOut()
  redirect('/login')
}
