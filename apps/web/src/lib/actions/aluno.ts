'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { calcularIdade, elegivelParaDisciplina } from '@ccg/core'

export async function escolherDisponibilidades(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const alunoId = String(formData.get('alunoId') ?? '')
  const instrumentoId = String(formData.get('instrumentoId') ?? '')
  const professorId = String(formData.get('professorId') ?? '')
  const horarioIds = formData.getAll('horarios').map(String)
  const mensagem = String(formData.get('mensagem') ?? '').trim().slice(0, 500)
  // Presente só quando o pedido vem do wizard público (/pedir-aula) — nesse
  // caso os erros voltam para lá, não para /aluno/[alunoId]/pedido.
  const origem = String(formData.get('origem') ?? '')
  const programa = String(formData.get('programa') ?? '')
  const idade = String(formData.get('idade') ?? '')
  // Programa de Recomendação: quem chega pode dizer que foi recomendado.
  // É texto livre e por confirmar — ver a migração 0026 e o comentário
  // mais abaixo, onde se grava.
  const recomendadoPor = String(formData.get('recomendadoPor') ?? '').trim().slice(0, 120)
  const recomendadoModalidade = String(formData.get('recomendadoModalidade') ?? '')
    .trim()
    .slice(0, 80)

  function voltarComErro(mensagemErro: string): never {
    // O wizard público precisa de "programa" e "idade" no caminho de volta:
    // sem eles a página não sabe que escola é, e devolvia a pessoa ao
    // pop-up da idade — perdendo tudo o que já tinha escolhido.
    const base =
      origem === 'wizard-publico'
        ? `/pedir-aula?programa=${programa}&idade=${idade}&instrumento=${instrumentoId}&professor=${professorId}`
        : `/aluno/${alunoId}/pedido?instrumento=${instrumentoId}&professor=${professorId}`
    redirect(`${base}&erro=${encodeURIComponent(mensagemErro)}`)
  }

  if (!alunoId || !instrumentoId || !professorId) {
    redirect('/dashboard')
  }
  // O aluno tem de escolher pelo menos um horário OU deixar uma mensagem —
  // nunca os dois em branco, mas qualquer um dos dois chega.
  if (horarioIds.length === 0 && !mensagem) {
    voltarComErro('Seleciona pelo menos um horário ou escreve uma mensagem.')
  }

  // Nunca confiar apenas no ecrã (que só esconde/desativa o cartão) — é
  // esta verificação, feita no servidor com a idade guardada na base de
  // dados, que impede de facto o pedido de disciplinas fora da idade do
  // aluno, mesmo que o pedido chegue diretamente a este endpoint. Também
  // confirma aqui que este aluno é mesmo gerido por quem está autenticado
  // (a RLS já impediria o insert, mas o erro fica mais claro assim).
  const [{ data: aluno }, { data: instrumentoPedido }, { data: professorPerfil }] =
    await Promise.all([
      supabase
        .from('alunos')
        .select('nome, data_nascimento')
        .eq('id', alunoId)
        .eq('encarregado_id', user.id)
        .maybeSingle(),
      supabase
        .from('instrumentos')
        .select('nome, programa')
        .eq('id', Number(instrumentoId))
        .single(),
      // Se o professor adere ao Programa decide-se aqui, no servidor, e
      // não pelo que o formulário disser: o ecrã só esconde a pergunta,
      // e um pedido forjado chegaria na mesma a este ponto.
      supabase
        .from('perfis_escola')
        .select('adere_recomendacao')
        .eq('id', professorId)
        .eq('tipo', 'professor')
        .maybeSingle(),
    ])

  if (!aluno) {
    redirect('/dashboard')
  }

  if (
    !instrumentoPedido ||
    !elegivelParaDisciplina(
      calcularIdade(aluno.data_nascimento),
      instrumentoPedido.programa,
      instrumentoPedido.nome
    )
  ) {
    voltarComErro('Esta disciplina não está disponível para a idade do aluno.')
  }

  const { data: matriculaExistente } = await supabase
    .from('matriculas')
    .select('id')
    .eq('aluno_id', alunoId)
    .eq('instrumento_id', Number(instrumentoId))
    .in('estado', ['a_escolher', 'confirmado'])
    .maybeSingle()

  if (matriculaExistente) {
    voltarComErro('Já existe um pedido ou uma aula confirmada nesta disciplina.')
  }

  const { data: matricula, error: matriculaError } = await supabase
    .from('matriculas')
    .insert({
      aluno_id: alunoId,
      professor_id: professorId,
      instrumento_id: Number(instrumentoId),
      mensagem: mensagem || null,
    })
    .select('id')
    .single()

  if (matriculaError?.code === '23505') {
    voltarComErro('Já existe um pedido ou uma aula confirmada nesta disciplina.')
  }

  if (matriculaError || !matricula) {
    voltarComErro('Não foi possível criar o pedido. Tenta novamente.')
  }

  // Só há disponibilidades a guardar se o aluno tiver marcado algum horário
  // — um pedido só com mensagem não tem nenhuma.
  if (horarioIds.length > 0) {
    const { error: disponibilidadesError } = await supabase
      .from('disponibilidades_selecionadas')
      .insert(
        horarioIds.map((horarioId) => ({
          matricula_id: matricula.id,
          horario_id: Number(horarioId),
        }))
      )

    if (disponibilidadesError) {
      voltarComErro('Não foi possível guardar as disponibilidades. Tenta novamente.')
    }
  }

  // A indicação de quem recomendou entra depois da matrícula, porque é
  // dela que depende (ver 0026). Falhar aqui não desfaz o pedido: a aula
  // pedida vale por si, e a recomendação recupera-se com uma conversa na
  // secretaria — desfazer um pedido válido por causa disto seria trocar
  // um problema pequeno por um grande.
  if (recomendadoPor && professorPerfil?.adere_recomendacao) {
    await supabase.from('indicacoes_recomendacao').insert({
      matricula_id: matricula.id,
      novo_aluno_id: alunoId,
      novo_aluno_nome: aluno.nome,
      professor_id: professorId,
      recomendador_nome_indicado: recomendadoPor,
      modalidade_indicada: recomendadoModalidade || null,
    })
  }

  redirect('/dashboard')
}

export async function cancelarPedido(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const matriculaId = String(formData.get('matriculaId') ?? '')

  await supabase
    .from('matriculas')
    .delete()
    .eq('id', matriculaId)
    .eq('estado', 'a_escolher')

  revalidatePath('/dashboard')
}

export async function cancelarMatricula(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const matriculaId = String(formData.get('matriculaId') ?? '')

  // Uma chamada à base de dados, e não um delete: cancelar guarda a
  // matrícula em 'cancelado', liberta e bloqueia o horário, avisa o
  // professor e avisa a secretaria. São efeitos que têm de acontecer
  // juntos, e por isso vivem todos na função (migração 0029).
  await supabase.rpc('cancelar_matricula', { p_matricula_id: Number(matriculaId) })

  revalidatePath('/dashboard')
  // O botão passou a viver aqui, e esta ação não navega para lado nenhum
  // — sem isto a lista ficava a mostrar a matrícula que se acabou de
  // cancelar até alguém recarregar a página à mão.
  revalidatePath('/dashboard/conta/avancado')
  revalidatePath('/dashboard/avisos')
}

// Desmarcar uma aula futura, do lado da família.
//
// Toda a regra vive na função da base de dados (migração 0032): que só
// música tem reposições, que faltam 24 horas, que a data tem de cair no
// dia do horário, e que a aula fica no livro de presenças como falta com
// aviso. Aqui só se passa o recado e se diz o que correu mal.
export async function desmarcarAula(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const matriculaId = Number(formData.get('matriculaId') ?? 0)
  const data = String(formData.get('data') ?? '')
  const alunoId = String(formData.get('alunoId') ?? '')

  const { error } = await supabase.rpc('desmarcar_aula', {
    p_matricula_id: matriculaId,
    p_data: data,
  })

  if (error) {
    // A função devolve mensagens escritas para quem as vai ler ("As aulas
    // só podem ser desmarcadas até 24 horas antes."), por isso passam
    // diretas em vez de virarem um "algo correu mal".
    redirect(
      `/aluno/${alunoId}/horario?erro=${encodeURIComponent(error.message || 'Não foi possível desmarcar a aula.')}`
    )
  }

  revalidatePath(`/aluno/${alunoId}/horario`)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/agenda')
  revalidatePath('/dashboard/avisos')
  redirect(`/aluno/${alunoId}/horario?desmarcada=1`)
}

// Tira um perfil de aluno da conta. Não o apaga: por trás dele estão
// presenças, mensalidades e o Programa de Recomendação, todos com este
// id — apagar a linha deixava o histórico da escola com buracos.
//
// Arquivar arrasta o cancelamento das aulas atrás de si, pelo mesmo
// caminho de sempre (avisos ao professor e à secretaria, horário
// libertado). Quem decide isso é a função da base de dados, e não esta
// ação: ver a migração 0030.
export async function arquivarAluno(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const alunoId = String(formData.get('alunoId') ?? '')

  await supabase.rpc('arquivar_aluno', { p_aluno_id: alunoId })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/alunos')
  revalidatePath('/dashboard/conta/avancado')
  revalidatePath('/dashboard/avisos')
}

// Cria um perfil de aluno para a Conta CCG autenticada. O aluno pode ser
// um dependente (um filho, sem login próprio) ou o próprio titular, quando
// quem se inscreve é um adulto que vai ele mesmo às aulas — é a diferença
// entre deixar propria_conta_id a null ou preenchê-lo.
//
// Substitui criarAlunoDependente, que só criava dependentes e voltava à
// Home. O registo deixou de criar um aluno automaticamente (migração
// 0025), por isso este é agora o único caminho para uma conta ter alunos.
export async function criarAluno(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const nome = String(formData.get('nome') ?? '').trim()
  const dataNascimento = String(formData.get('dataNascimento') ?? '').trim()
  const ehProprio = formData.get('ehProprio') === 'sim'

  function voltarComErro(mensagem: string): never {
    redirect(`/dashboard/alunos?erro=${encodeURIComponent(mensagem)}`)
  }

  if (!nome) {
    voltarComErro('Indica o nome do aluno.')
  }
  // Exigida para alunos novos (as linhas antigas podem tê-la a null e
  // continuam válidas): sem ela, o filtro por idade deixa passar todas as
  // disciplinas, e alguém acabaria inscrito numa turma que não lhe serve.
  if (!dataNascimento) {
    voltarComErro('Indica a data de nascimento do aluno.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
    voltarComErro('Data de nascimento inválida.')
  }
  if (dataNascimento > new Date().toISOString().slice(0, 10)) {
    voltarComErro('A data de nascimento não pode ser no futuro.')
  }

  // Só pode haver um aluno que seja o próprio titular. A base de dados
  // também o garante (índice único em propria_conta_id), mas verificar
  // aqui permite explicar porquê em vez de devolver um erro cru.
  if (ehProprio) {
    const { data: jaExiste } = await supabase
      .from('alunos')
      .select('id')
      .eq('propria_conta_id', user.id)
      .maybeSingle()

    if (jaExiste) {
      voltarComErro('Já tens um perfil de aluno em teu nome. Cria os restantes como dependentes.')
    }
  }

  const { error } = await supabase.from('alunos').insert({
    encarregado_id: user.id,
    // Nunca vem do formulário: é sempre a conta autenticada, senão dava
    // para reclamar como "próprio" um perfil de outra pessoa.
    propria_conta_id: ehProprio ? user.id : null,
    nome,
    data_nascimento: dataNascimento,
  })

  if (error) {
    voltarComErro('Não foi possível criar o perfil de aluno. Tenta novamente.')
  }

  revalidatePath('/dashboard/alunos')
  revalidatePath('/dashboard')
  redirect('/dashboard/alunos')
}
