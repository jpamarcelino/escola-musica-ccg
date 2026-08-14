import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LinhaLista, GrupoLista } from '@/components/lista'
import { SubmitButton } from '@/components/submit-button'
import { definirAdesaoRecomendacao } from '@/lib/actions/recomendacoes'

export default async function AdminProfessorPage({
  params,
}: {
  params: Promise<{ professorId: string }>
}) {
  const { professorId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfilAtual } = await supabase
    .from('perfis_escola')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  const { data: professorPerfilData } = await supabase
    .from('perfis_escola')
    .select('adere_recomendacao, adesao_recomendacao_em, profiles(nome)')
    .eq('id', professorId)
    .eq('tipo', 'professor')
    .maybeSingle()

  const professorPerfil = professorPerfilData as unknown as {
    adere_recomendacao: boolean
    adesao_recomendacao_em: string | null
    profiles: { nome: string } | null
  } | null

  if (!professorPerfil) {
    notFound()
  }

  const professorData = { nome: professorPerfil.profiles?.nome ?? '' }

  return (
    <main id="conteudo-principal" className="partitura-pagina admin-professor-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho"><Link href="/admin/professores" className="partitura-voltar" aria-label="Voltar ao diretório de professores">←</Link><div><p className="partitura-sobretitulo">Ficha de professor</p><h1>{professorData.nome}</h1><p>{professorPerfil.adere_recomendacao ? 'Aderente ao Programa de Recomendação' : 'Gestão de conta e atividade letiva'}</p></div></header>

        <div className="admin-professor-atalhos"><GrupoLista>
          <LinhaLista href={`/admin/professores/${professorId}/conta`} titulo="Conta" />
          <LinhaLista href={`/admin/professores/${professorId}/alunos`} titulo="Alunos" />
          <LinhaLista href={`/admin/professores/${professorId}/horario`} titulo="Horário" />
        </GrupoLista></div>

        <section className="admin-professor-programa">
          <h2 className="secao-titulo">Programa de Recomendação</h2>
          <div className="space-y-3 rounded-[13px] border border-[var(--color-linha)] p-3">
            <p className="text-sm text-foreground/70">
              {professorPerfil.adere_recomendacao ? (
                <>
                  Aderiu ao Programa
                  {professorPerfil.adesao_recomendacao_em &&
                    ` em ${professorPerfil.adesao_recomendacao_em.slice(0, 10)}`}
                  . Os seus alunos podem recomendar novos alunos e receber uma mensalidade
                  gratuita, suportada em partes iguais por ele e pelo CCG.
                </>
              ) : (
                <>
                  Ainda não aderiu. A adesão é livre e voluntária (Art. 3.º) e formaliza-se por
                  escrito — marca aqui depois de receberes a declaração.
                </>
              )}
            </p>
            <form action={definirAdesaoRecomendacao}>
              <input type="hidden" name="professorId" value={professorId} />
              <input
                type="hidden"
                name="adere"
                value={professorPerfil.adere_recomendacao ? 'false' : 'true'}
              />
              <SubmitButton
                textoAGuardar="A guardar..."
                className="rounded-[13px] border border-[var(--color-linha)] px-3 py-2 text-[14px] font-medium text-[var(--color-azul-fundo)]"
              >
                {professorPerfil.adere_recomendacao ? 'Retirar adesão' : 'Marcar como aderente'}
              </SubmitButton>
            </form>
            {professorPerfil.adere_recomendacao && (
              <p className="text-xs text-foreground/50">
                Retirar a adesão não afeta benefícios já atribuídos — esses só se anulam um a
                um, na respetiva recomendação.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
