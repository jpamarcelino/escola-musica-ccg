import Link from 'next/link'
import type { CSSProperties } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/lib/actions/auth'
import { cancelarPedido } from '@/lib/actions/aluno'
import { OptionCard } from '@/components/option-card'
import { formatarSala } from '@/lib/sala'

type Matricula = {
  id: number
  estado: string
  instrumentos: { nome: string } | null
  profiles: { nome: string } | null
  horarios: {
    dia_semana: string
    hora_inicio: string
    hora_fim: string
    salas: { nome: string; piso: number | null; numero: number | null } | null
  } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, tipo, admin, programa')
    .eq('id', user.id)
    .single()

  let matriculas: Matricula[] = []
  if (profile?.tipo === 'aluno') {
    const { data } = await supabase
      .from('matriculas')
      .select(
        'id, estado, instrumentos(nome), profiles!matriculas_professor_id_fkey(nome), horarios(dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero))'
      )
      .eq('aluno_id', user.id)
      .order('criado_em', { ascending: false })
    matriculas = (data ?? []) as unknown as Matricula[]
  }

  let pedidosPendentes = 0
  if (profile?.tipo === 'professor') {
    const { count } = await supabase
      .from('matriculas')
      .select('id', { count: 'exact', head: true })
      .eq('professor_id', user.id)
      .eq('estado', 'a_escolher')
    pedidosPendentes = count ?? 0
  }

  const largo = profile?.tipo === 'professor'

  return (
    <main className="flex-1 flex justify-center p-6">
      <div
        className={
          largo
            ? 'w-full max-w-2xl space-y-6'
            : 'w-full max-w-sm space-y-4 text-center'
        }
      >
        <div
          className={`entrada-esquerda ${largo ? 'text-left' : ''}`}
          style={{ '--card-index': 0 } as CSSProperties}
        >
          <h1 className="text-2xl">
            <span className="saudacao">Bem-vindo,</span>{' '}
            <span className="font-semibold text-foreground">{profile?.nome}</span>
          </h1>
          <p className="text-sm text-foreground/60">
            Estás autenticado como <strong>{profile?.tipo}</strong>
            {profile?.programa &&
              ` — Escola de ${profile.programa === 'musica' ? 'Música' : 'Dança'}`}
            .
          </p>
          {profile?.admin && (
            <Link href="/admin" className="text-sm underline">
              Visão geral (diretor)
            </Link>
          )}
        </div>

        {profile?.tipo === 'aluno' && (
          <div className="space-y-4 text-left">
            {matriculas.length === 0 && (
              <p
                className="entrada-esquerda text-sm text-foreground/60"
                style={{ '--card-index': 1 } as CSSProperties}
              >
                Ainda não pediste nenhuma aula.
              </p>
            )}
            {matriculas.map((matricula, idx) => (
              <div
                key={matricula.id}
                className="entrada-esquerda space-y-3 rounded border border-foreground/15 p-4"
                style={{ '--card-index': idx + 1 } as CSSProperties}
              >
                {matricula.estado === 'a_escolher' && (
                  <>
                    <p className="text-sm">
                      Pedido enviado para{' '}
                      <strong>{matricula.profiles?.nome}</strong> (
                      {matricula.instrumentos?.nome}). A aguardar que o
                      professor escolha o horário final.
                    </p>
                    <form action={cancelarPedido}>
                      <input
                        type="hidden"
                        name="matriculaId"
                        value={matricula.id}
                      />
                      <button
                        type="submit"
                        className="w-full rounded border border-red-600/40 py-2 text-sm text-red-600 hover:bg-red-600/5"
                      >
                        Cancelar pedido
                      </button>
                    </form>
                  </>
                )}
                {matricula.estado === 'confirmado' && matricula.horarios && (
                  <p className="text-sm">
                    Aula confirmada com <strong>{matricula.profiles?.nome}</strong>{' '}
                    ({matricula.instrumentos?.nome}): {matricula.horarios.dia_semana}
                    , {matricula.horarios.hora_inicio.slice(0, 5)}–
                    {matricula.horarios.hora_fim.slice(0, 5)}
                    {formatarSala(matricula.horarios.salas) &&
                      ` — ${formatarSala(matricula.horarios.salas)}`}
                    .
                  </p>
                )}
              </div>
            ))}
            <Link
              href="/aluno/pedido"
              className="botao-cartao entrada-esquerda"
              style={{ '--card-index': matriculas.length + 1 } as CSSProperties}
            >
              Pedir aula
            </Link>
          </div>
        )}

        {profile?.tipo === 'professor' && (
          <div className="hub-stack">
            <OptionCard
              href="/dashboard/conta"
              nome="Conta"
              wide
              index={1}
            />
            <OptionCard
              href="/dashboard/pedidos"
              nome="Pedidos de Aula"
              wide
              index={2}
              badge={pedidosPendentes}
            />
            <OptionCard
              href="/dashboard/presencas"
              nome="Presenças"
              wide
              index={3}
            />
            <OptionCard
              href="/dashboard/horarios"
              nome="Gestão de Horários"
              wide
              index={4}
            />
            <OptionCard
              href="/dashboard/agenda"
              nome="Horários e Alunos"
              wide
              index={5}
            />
          </div>
        )}

        <form action={logout} className={largo ? '' : undefined}>
          <button
            type="submit"
            className="rounded border border-foreground/20 px-4 py-2"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
  )
}
