'use client'

import { useActionState, useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { PasswordInput } from '@/components/password-input'
import { classesCampo } from '@/components/campo-formulario'
import { MensagemErro } from '@/components/mensagem'
import { BotaoPrimario } from '@/components/botao-primario'
import {
  loginModal,
  registoModal,
  criarAlunoDependenteModal,
  listarMeusAlunos,
} from '@/lib/actions/pedido-publico'

type Aluno = { id: string; nome: string }

// Casca partilhada pelos dois popups deste ficheiro — Radix Dialog em vez
// de <div onClick> à mão: dá focus-trap, tecla Esc e um botão de fechar
// visível de graça, coisas que a versão anterior não tinha (um utilizador
// de teclado ficava preso lá dentro, sem saída).
function ModalShell({
  onFechar,
  children,
}: {
  onFechar: () => void
  children: React.ReactNode
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(aberto) => {
        if (!aberto) onFechar()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-fundo" />
        {/* modal-caixa não está aninhada dentro de modal-fundo aqui (o
            Dialog do Radix renderiza Overlay e Content como irmãos), por
            isso a centragem flex do overlay não chega até aqui — repete-se
            com position fixed + transform (ver botao-acao-destruir.tsx). */}
        <Dialog.Content
          className="modal-caixa fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 space-y-4"
        >
          <Dialog.Close
            aria-label="Fechar"
            className="absolute right-[14px] top-[14px] rounded-[8px] p-[4px] transition-colors hover:bg-[var(--color-papel-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-azul)]"
            style={{ color: 'var(--color-tinta-suave)' }}
          >
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

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
      // Depois de um registo novo, a conta já vem com um "aluno" próprio
      // auto-criado (a própria pessoa) — mas nem sempre é para ela que é o
      // pedido (ex: um encarregado a criar conta para inscrever um filho).
      // Por isso, só se salta logo para o pedido quando é um LOGIN numa
      // conta já existente com exatamente um aluno — aí sim é uma escolha
      // já feita antes por quem está a usar a conta.
      const veioDeLogin = !!estadoLogin?.sucesso
      setARecolherAlunos(true)
      listarMeusAlunos().then((lista) => {
        setAlunos(lista)
        setARecolherAlunos(false)
        if (veioDeLogin && lista.length === 1) {
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
    <ModalShell onFechar={onFechar}>
      {ecra === 'login' && (
        <>
          <Dialog.Title asChild>
            <h1
              className="text-[22px] font-semibold leading-[1.2]"
              style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-azul-fundo)' }}
            >Entrar na Conta CCG</h1>
          </Dialog.Title>
          <form action={acaoLogin} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="mcp-email" className="block text-[12.5px] font-medium"
                style={{ color: 'var(--color-tinta-suave)' }}>
                Email
              </label>
              <input
                id="mcp-email"
                name="email"
                type="email"
                required
                className={classesCampo}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="mcp-password" className="block text-[12.5px] font-medium"
                style={{ color: 'var(--color-tinta-suave)' }}>
                Password
              </label>
              <PasswordInput
                id="mcp-password"
                name="password"
                autoComplete="current-password"
                className={classesCampo}
              />
            </div>
            {estadoLogin?.error && <MensagemErro>{estadoLogin.error}</MensagemErro>}
            <BotaoPrimario disabled={loginPendente}>{loginPendente ? 'A entrar...' : 'Entrar'}
            </BotaoPrimario>
          </form>
          <p className="text-center text-[14px]" style={{ color: 'var(--color-tinta-suave)' }}>
            Ainda não tens conta?{' '}
            <button type="button" className="underline" onClick={() => setEcra('registo')}>
              Criar Conta CCG
            </button>
          </p>
        </>
      )}

      {ecra === 'registo' && (
        <>
          <Dialog.Title asChild>
            <h1
              className="text-[22px] font-semibold leading-[1.2]"
              style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-azul-fundo)' }}
            >Criar Conta CCG</h1>
          </Dialog.Title>
          <form action={acaoRegisto} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="mcp-nome" className="block text-[12.5px] font-medium"
                style={{ color: 'var(--color-tinta-suave)' }}>
                Nome
              </label>
              <input
                id="mcp-nome"
                name="nome"
                required
                className={classesCampo}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="mcp-telefone" className="block text-[12.5px] font-medium"
                style={{ color: 'var(--color-tinta-suave)' }}>
                Número de telemóvel
              </label>
              <input
                id="mcp-telefone"
                name="telefone"
                type="tel"
                autoComplete="tel"
                required
                className={classesCampo}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="mcp-dataNascimento" className="block text-[12.5px] font-medium"
                style={{ color: 'var(--color-tinta-suave)' }}>
                A tua data de nascimento
              </label>
              <input
                id="mcp-dataNascimento"
                name="dataNascimento"
                type="date"
                required
                max={hoje}
                className={classesCampo}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="mcp-registo-email" className="block text-[12.5px] font-medium"
                style={{ color: 'var(--color-tinta-suave)' }}>
                Email
              </label>
              <input
                id="mcp-registo-email"
                name="email"
                type="email"
                required
                className={classesCampo}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="mcp-registo-password" className="block text-[12.5px] font-medium"
                style={{ color: 'var(--color-tinta-suave)' }}>
                Password
              </label>
              <PasswordInput
                id="mcp-registo-password"
                name="password"
                minLength={6}
                autoComplete="new-password"
                className={classesCampo}
              />
            </div>
            {estadoRegisto?.error && (
              <MensagemErro>{estadoRegisto.error}</MensagemErro>
            )}
            <BotaoPrimario disabled={registoPendente}>{registoPendente ? 'A criar conta...' : 'Criar conta'}
            </BotaoPrimario>
          </form>
          <p className="text-center text-[14px]" style={{ color: 'var(--color-tinta-suave)' }}>
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
    </ModalShell>
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
    <ModalShell onFechar={onFechar}>
      <EscolherAluno
        alunos={alunos}
        aRecolherAlunos={aRecolherAlunos}
        onEscolher={onConcluido}
      />
    </ModalShell>
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
    return (
      <>
        <Dialog.Title className="sr-only">A verificar a tua conta</Dialog.Title>
        <p className="text-sm text-foreground/60">A verificar a tua conta...</p>
      </>
    )
  }

  return (
    <>
      <Dialog.Title asChild>
        <h1
                className="text-[22px] font-semibold leading-[1.2]"
                style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-azul-fundo)' }}
              >Para qual aluno é o pedido?</h1>
      </Dialog.Title>

      {!aCriar && alunos.length > 0 && (
        <div className="space-y-2">
          {alunos.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onEscolher(a.id)}
              className="block w-full rounded-[13px] border border-[var(--color-linha)] bg-white px-[14px] py-[12px] text-left text-[15px] transition-colors hover:border-[var(--color-azul-logo)]"
            >
              {a.nome}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setACriar(true)}
            className="block w-full rounded-[13px] border border-dashed border-[var(--color-linha)] px-[14px] py-[12px] text-left text-[15px] text-[var(--color-tinta-suave)] transition-colors hover:border-[var(--color-azul-logo)]"
          >
            + Criar novo perfil de aluno
          </button>
        </div>
      )}

      {aCriar && (
        <form action={acao} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="mcp-aluno-nome" className="block text-[12.5px] font-medium"
                  style={{ color: 'var(--color-tinta-suave)' }}>
              Nome do aluno
            </label>
            <input
              id="mcp-aluno-nome"
              name="nome"
              required
              className={classesCampo}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="mcp-aluno-dataNascimento" className="block text-[12.5px] font-medium"
                  style={{ color: 'var(--color-tinta-suave)' }}>
              Data de nascimento
            </label>
            <input
              id="mcp-aluno-dataNascimento"
              name="dataNascimento"
              type="date"
              className={classesCampo}
            />
          </div>
          {estado?.error && <MensagemErro>{estado.error}</MensagemErro>}
          <BotaoPrimario disabled={pendente}>{pendente ? 'A criar...' : 'Continuar'}
          </BotaoPrimario>
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
