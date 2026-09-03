import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LinhaLista, GrupoLista, TituloSeccao } from '@/components/lista'
import { Distintivo } from '@/components/distintivo'
import { EmptyState } from '@/components/empty-state'
import { VoltarAtras } from '@/components/voltar-atras'
import { ChevronLeft, CircleCheckBig } from 'lucide-react'

type Professor = {
  id: string
  nome: string
}

type MatriculaResumo = {
  id: number
  professor_id: string
  valor_mensal: number | null
}

type MensalidadeResumo = {
  matricula_id: number
  pago: boolean
}

export default async function ConfirmarMensalidadesPage() {
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

  const { data: professoresData } = await supabase
    .from('perfis_escola')
    .select('id, profiles(nome)')
    .eq('tipo', 'professor')
    .order('nome', { referencedTable: 'profiles' })
  const professores = (
    (professoresData ?? []) as unknown as { id: string; profiles: { nome: string } | null }[]
  ).map((p) => ({
    id: p.id,
    nome: p.profiles?.nome ?? '',
  })) as Professor[]

  const { data: matriculasData } = await supabase
    .from('matriculas')
    .select('id, professor_id, valor_mensal')
    .eq('estado', 'confirmado')
  const matriculas = (matriculasData ?? []) as unknown as MatriculaResumo[]

  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = agora.getMonth() + 1

  const matriculaIds = matriculas.map((m) => m.id)
  const { data: mensalidadesData } =
    matriculaIds.length > 0
      ? await supabase
          .from('mensalidades')
          .select('matricula_id, pago')
          .eq('ano', ano)
          .eq('mes', mes)
          .in('matricula_id', matriculaIds)
      : { data: [] }
  const pagoPorMatricula = new Map(
    ((mensalidadesData ?? []) as MensalidadeResumo[]).map((m) => [m.matricula_id, m.pago])
  )

  const porConfirmarPorProfessor = new Map<string, number>()
  for (const m of matriculas) {
    const pago = pagoPorMatricula.get(m.id) ?? false
    if (pago) continue
    porConfirmarPorProfessor.set(
      m.professor_id,
      (porConfirmarPorProfessor.get(m.professor_id) ?? 0) + 1
    )
  }

  const comPendencias = professores.filter((p) => (porConfirmarPorProfessor.get(p.id) ?? 0) > 0)
  const emDia = professores.filter((p) => (porConfirmarPorProfessor.get(p.id) ?? 0) === 0)

  return (
    <main id="conteudo-principal" className="admin-financeiro admin-financeiro-diretorio">
      <div className="admin-financeiro-folha">
        <header className="admin-financeiro-cabecalho"><VoltarAtras destino="/admin/pagamentos" className="admin-financeiro-voltar" rotulo="Voltar a mensalidades"><ChevronLeft size={22} /></VoltarAtras><div><h1>Por confirmar</h1><p>{porConfirmarPorProfessor.size} {porConfirmarPorProfessor.size === 1 ? 'professor com pagamentos pendentes' : 'professores com pagamentos pendentes'}</p></div><span className="admin-financeiro-marca"><CircleCheckBig size={22} /></span></header>

        {professores.length === 0 ? (
          <EmptyState titulo="Ainda não há professores registados" />
        ) : (
          /* A página chama-se "Por confirmar" e listava os 15 professores
             pela ordem da base de dados — os 5 com pendências ficavam
             espalhados entre 10 que não pediam nada. Ninguém sai da lista,
             porque a secretaria também precisa de abrir quem está em dia
             (para corrigir um valor, ver o histórico); mas quem precisa de
             atenção vem primeiro e sob um título que o diz. */
          <div className="admin-diretorio">
            {comPendencias.length > 0 && (
              <>
                <TituloSeccao contagem={comPendencias.length}>A precisar de confirmação</TituloSeccao>
                <GrupoLista>
                  {comPendencias.map((professor) => (
                    <LinhaLista
                      key={professor.id}
                      href={`/admin/pagamentos/confirmar/${professor.id}`}
                      titulo={professor.nome}
                      direita={<Distintivo>{porConfirmarPorProfessor.get(professor.id)}</Distintivo>}
                    />
                  ))}
                </GrupoLista>
              </>
            )}
            {emDia.length > 0 && (
              <>
                <TituloSeccao contagem={emDia.length}>Em dia</TituloSeccao>
                <GrupoLista>
                  {emDia.map((professor) => (
                    <LinhaLista
                      key={professor.id}
                      href={`/admin/pagamentos/confirmar/${professor.id}`}
                      titulo={professor.nome}
                    />
                  ))}
                </GrupoLista>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
