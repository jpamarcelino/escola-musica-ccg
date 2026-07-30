'use client'

import { useActionState, useEffect, useState } from 'react'
import { PasswordInput } from '@/components/password-input'
import {
  loginModal,
  registoModal,
  criarAlunoDependenteModal,
  listarMeusAlunos,
} from '@/lib/actions/pedido-publico'

type Aluno = { id: string; nome: string }

// Popup mostrado ao clicar "Enviar pedido" sem sessão iniciada — entra ou
// cria conta, depois escolhe/cria o perfil de aluno, e devolve o alunoId
// escolhido (onConcluido) para o formulário de pedido continuar sozinho,
// sem o utilizador ter de repetir a seleção de horários/mensagem.
export function ModalContaPedido({
  onConcluido,
  onFechar,
}: {
  onConcluido: (alunoId: string) => void
  onFechar: () => void
}) {
  const [ecra, setEcra] = useState<'login' | 'registo' | 'aluno'>('login')
  const [aRecolherAlunos, setARecolherAlunos] = useState(false)
  const [alunos, setAlunos] = useState<Aluno[]>([])

  const [estadoLogin, acaoLogin, loginPendente] = useActionState(loginModal, undefined)
  const [estadoRegisto, acaoRegisto, registoPendente] = useActionState(registoModal, undefined)

  useEffect(() => {
    if (estadoLogin?.sucesso || estadoRegisto?.sucesso) {
      setARecolherAlunos(true)
      listarMeusAlunos().then((lista) => {
        setAlunos(lista)
        setARecolherAlunos(false)
        if (lista.length === 1) {
          onConcluido(lista[0].id)
        } else {
          setEcra('aluno')
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoLogin?.sucesso, estadoRegisto?.sucesso])

  const hoje = new Date().toISOString().slice(0, 10)

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal-caixa space-y-4" onClick={(e) => e.stopPropagation()}>
        {ecra === 'login' && (
          <>
            <h1 className="text-xl font-semibold">Entrar na Conta CCG</h1>
            <form action={acaoLogin} className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="mcp-email" className="block text-sm font-medium">
                  Email
                </label>
                <input
                  id="mcp-email"
                  name="email"
                  type="email"
                  required
                  className="w-full rounded border border-foreground/20 bg-background px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="mcp-password" className="block text-sm font-medium">
                  Password
                </label>
                <PasswordInput
                  id="mcp-password"
                  name="password"
                  autoComplete="current-password"
                  className="w-full rounded border border-foreground/20 bg-background px-3 py-2"
                />
              </div>
              {estadoLogin?.error && <p className="text-sm text-red-600">{estadoLogin.error}</p>}
              <button
                type="submit"
                disabled={loginPendente}
                className="w-full rounded bg-brand text-white hover:bg-brand-hover py-2 disabled:opacity-50"
              >
                {loginPendente ? 'A entrar...' : 'Entrar'}
              </button>
            </form>
            <p className="text-sm text-center">
              Ainda não tens conta?{' '}
              <button type="button" className="underline" onClick={() => setEcra('registo')}>
                Criar Conta CCG
              </button>
            </p>
          </>
        )}

        {ecra === 'registo' && (
          <>
            <h1 className="text-xl font-semibold">Criar Conta CCG</h1>
            <form action={acaoRegisto} className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="mcp-nome" className="block text-sm font-medium">
                  Nome
                </label>
                <input
                  id="mcp-nome"
                  name="nome"
                  required
                  className="w-full rounded border border-foreground/20 bg-background px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="mcp-telefone" className="block text-sm font-medium">
                  Número de telemóvel
                </label>
                <input
                  id="mcp-telefone"
                  name="telefone"
                  type="tel"
                  autoComplete="tel"
                  required
                  className="w-full rounded border border-foreground/20 bg-background px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="mcp-dataNascimento" className="block text-sm font-medium">
                  A tua data de nascimento
                </label>
                <input
                  id="mcp-dataNascimento"
                  name="dataNascimento"
                  type="date"
                  required
                  max={hoje}
                  className="w-full rounded border border-foreground/20 bg-background px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="mcp-registo-email" className="block text-sm font-medium">
                  Email
                </label>
                <input
                  id="mcp-registo-email"
                  name="email"
                  type="email"
                  required
                  className="w-full rounded border border-foreground/20 bg-background px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="mcp-registo-password" className="block text-sm font-medium">
                  Password
                </label>
                <PasswordInput
                  id="mcp-registo-password"
                  name="password"
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full rounded border border-foreground/20 bg-background px-3 py-2"
                />
              </div>
              {estadoRegisto?.error && (
                <p className="text-sm text-red-600">{estadoRegisto.error}</p>
              )}
              <button
                type="submit"
                disabled={registoPendente}
                className="w-full rounded bg-brand text-white hover:bg-brand-hover py-2 disabled:opacity-50"
              >
                {registoPendente ? 'A criar conta...' : 'Criar conta'}
              </button>
            </form>
            <p className="text-sm text-center">
              Já tens conta?{' '}
              <button type="button" className="underline" onClick={() => setEcra('login')}>
                Entrar
              </button>
            </p>
          </>
        )}

        {ecra === 'aluno' && (
          <EscolherAluno
            alunos={alunos}
            aRecolherAlunos={aRecolherAlunos}
            onEscolher={onConcluido}
          />
        )}
      </div>
    </div>
  )
}

// Usado quando quem clica "Enviar pedido" já tem sessão iniciada — salta
// os ecrãs de login/registo e vai direto à escolha/criação do aluno.
export function ModalEscolherAluno({
  onConcluido,
  onFechar,
}: {
  onConcluido: (alunoId: string) => void
  onFechar: () => void
}) {
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [aRecolherAlunos, setARecolherAlunos] = useState(true)

  useEffect(() => {
    listarMeusAlunos().then((lista) => {
      setAlunos(lista)
      setARecolherAlunos(false)
      if (lista.length === 1) {
        onConcluido(lista[0].id)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal-caixa space-y-4" onClick={(e) => e.stopPropagation()}>
        <EscolherAluno
          alunos={alunos}
          aRecolherAlunos={aRecolherAlunos}
          onEscolher={onConcluido}
        />
      </div>
    </div>
  )
}

function EscolherAluno({
  alunos,
  aRecolherAlunos,
  onEscolher,
}: {
  alunos: Aluno[]
  aRecolherAlunos: boolean
  onEscolher: (alunoId: string) => void
}) {
  const [aCriar, setACriar] = useState(alunos.length === 0)
  const [estado, acao, pendente] = useActionState(criarAlunoDependenteModal, undefined)

  useEffect(() => {
    if (estado?.alunoId) {
      onEscolher(estado.alunoId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado?.alunoId])

  // "alunos" só fica definitivo quando aRecolherAlunos passa a false — só
  // aí é que faz sentido decidir se começa na lista ou já no formulário de
  // criação (o valor inicial de useState via alunos.length via cima seria
  // sempre 0, porque a lista ainda estava vazia nesse primeiro render).
  useEffect(() => {
    if (!aRecolherAlunos) setACriar(alunos.length === 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aRecolherAlunos])

  if (aRecolherAlunos) {
    return <p className="text-sm text-foreground/60">A verificar a tua conta...</p>
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Para qual aluno é o pedido?</h1>

      {!aCriar && alunos.length > 0 && (
        <div className="space-y-2">
          {alunos.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onEscolher(a.id)}
              className="block w-full rounded border border-foreground/20 px-4 py-2 text-left hover:bg-foreground/5"
            >
              {a.nome}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setACriar(true)}
            className="block w-full rounded border border-dashed border-foreground/20 px-4 py-2 text-left text-foreground/60 hover:bg-foreground/5"
          >
            + Criar novo perfil de aluno
          </button>
        </div>
      )}

      {aCriar && (
        <form action={acao} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="mcp-aluno-nome" className="block text-sm font-medium">
              Nome do aluno
            </label>
            <input
              id="mcp-aluno-nome"
              name="nome"
              required
              className="w-full rounded border border-foreground/20 bg-background px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="mcp-aluno-dataNascimento" className="block text-sm font-medium">
              Data de nascimento
            </label>
            <input
              id="mcp-aluno-dataNascimento"
              name="dataNascimento"
              type="date"
              className="w-full rounded border border-foreground/20 bg-background px-3 py-2"
            />
          </div>
          {estado?.error && <p className="text-sm text-red-600">{estado.error}</p>}
          <button
            type="submit"
            disabled={pendente}
            className="w-full rounded bg-brand text-white hover:bg-brand-hover py-2 disabled:opacity-50"
          >
            {pendente ? 'A criar...' : 'Continuar'}
          </button>
          {alunos.length > 0 && (
            <button
              type="button"
              onClick={() => setACriar(false)}
              className="w-full text-sm underline text-foreground/60"
            >
              Voltar à lista de alunos
            </button>
          )}
        </form>
      )}
    </>
  )
}
