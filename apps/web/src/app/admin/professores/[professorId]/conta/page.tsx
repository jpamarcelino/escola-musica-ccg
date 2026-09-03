import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type ProfessorPerfil = {
  nome: string
  email: string | null
  telefone: string | null
  programa: PerfisEscolaPrograma | null
  admin: boolean
}

type InstrumentoProfessor = {
  instrumentos: { nome: string } | null
  especialidade: string | null
}

export default async function AdminProfessorContaPage({
  params,
  searchParams,
}: {
  params: Promise<{ professorId: string }>
  searchParams: Promise<{ erro?: string; guardado?: string }>
}) {
  const { professorId } = await params
  const { erro, guardado } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const papel = await papelDoAdmin(supabase, user.id)

  if (!papel.admin) {
    redirect('/dashboard')
  }

  // A direção vê a ficha toda e não escreve nada nela.
  const podeMexer = ehSecretaria(papel)

  const { data: professorPerfilData } = await supabase
    .from('perfis_escola')
    .select('programa, admin, bio, profiles(nome, email, telefone, foto_url)')
    .eq('id', professorId)
    .eq('tipo', 'professor')
    .maybeSingle()

  const professorPerfil = professorPerfilData as {
    programa: PerfisEscolaPrograma | null
    admin: boolean
    bio: string | null
    profiles: {
      nome: string
      email: string | null
      telefone: string | null
      foto_url: string | null
    } | null
  } | null

  if (!professorPerfil) {
    notFound()
  }

  const professor: ProfessorPerfil = {
    nome: professorPerfil.profiles?.nome ?? '',
    email: professorPerfil.profiles?.email ?? null,
    telefone: professorPerfil.profiles?.telefone ?? null,
    programa: professorPerfil.programa,
    admin: professorPerfil.admin,
  }

  const { data: instrumentosData } = await supabase
    .from('professor_instrumentos')
    .select('instrumentos(nome), especialidade')
    .eq('professor_id', professorId)
  const instrumentos = (instrumentosData ?? []) as unknown as InstrumentoProfessor[]

  return (
    <main id="conteudo-principal" className="partitura-pagina admin-subficha-pagina pinterest-admin-professor-conta">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho"><VoltarAtras destino={`/admin/professores/${professorId}`} className="partitura-voltar" rotulo="Voltar à ficha do professor">←</VoltarAtras><div><p className="partitura-sobretitulo">Conta · {professor.admin ? 'Administrador' : 'Professor'}</p><h1>{professor.nome}</h1><p>Dados de contacto, escola e disciplinas.</p></div></header>

        <div className="admin-dados-registo">
          <p className="lista-item-sub">
            Escola:{' '}
            {professor.programa === 'musica'
              ? 'Música'
              : professor.programa === 'danca'
                ? 'Dança'
                : 'sem escola'}
          </p>
          {professor.email && <p className="lista-item-sub">Email: {professor.email}</p>}
          {professor.telefone && (
            <p className="lista-item-sub">Telemóvel: {professor.telefone}</p>
          )}
          <p className="lista-item-sub">
            {instrumentos.length > 0
              ? instrumentos
                  .map((i) => i.instrumentos?.nome + (i.especialidade ? ` (${i.especialidade})` : ''))
                  .join(', ')
              : 'Sem disciplinas definidas'}
          </p>
        </div>

        {/* A ficha que o público vê ao carregar no "i" dos cartões de
            escolha de professor. Está aqui, e não na conta do próprio,
            porque a foto e a apresentação representam a escola a quem
            ainda não é aluno. */}
        <section className="admin-ficha-publica">
          <h2 className="secao-titulo">Ficha pública</h2>
          <p>
            O que aparece a quem está a escolher professor. Sem contactos — quem quiser falar
            com ele fala com a secretaria.
          </p>

          {erro && <MensagemErro>{erro}</MensagemErro>}
          {guardado && <MensagemInfo>Ficha guardada.</MensagemInfo>}

          <form action={guardarFichaProfessor} className="space-y-[16px]">
            <input type="hidden" name="professorId" value={professorId} />
            <fieldset disabled={!podeMexer} className="contents">

            <div className="admin-ficha-foto">
              {professorPerfil.profiles?.foto_url ? (
                <Image
                  src={professorPerfil.profiles.foto_url}
                  alt={`Retrato de ${professor.nome}`}
                  width={96}
                  height={96}
                />
              ) : (
                <span aria-hidden="true">Sem foto</span>
              )}
              <div>
                <Rotulo htmlFor="foto">Substituir a foto</Rotulo>
                <input id="foto" name="foto" type="file" accept="image/*" className={classesCampo} />
              </div>
            </div>

            <div>
              <Rotulo htmlFor="bio">Apresentação</Rotulo>
              <textarea
                id="bio"
                name="bio"
                defaultValue={professorPerfil.bio ?? ''}
                className={classesCampo}
                maxLength={1200}
                rows={7}
                placeholder="Formação, percurso, o que gosta de ensinar…"
              />
            </div>

            </fieldset>
            {podeMexer && (
              <SubmitButton textoAGuardar="A guardar…" className="recomendacao-submeter">
                Guardar ficha
              </SubmitButton>
            )}
          </form>
        </section>
      </div>
    </main>
  )
}
import Image from 'next/image'
import type { PerfisEscolaPrograma } from '@ccg/types'
import { guardarFichaProfessor } from '@/lib/actions/ficha-professor'
import { classesCampo, Rotulo } from '@/components/campo-formulario'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'
import { SubmitButton } from '@/components/submit-button'
import { VoltarAtras } from '@/components/voltar-atras'
import { ehSecretaria, papelDoAdmin } from '@/lib/permissoes'
