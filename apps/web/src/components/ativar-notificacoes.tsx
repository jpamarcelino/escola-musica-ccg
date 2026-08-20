'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { guardarSubscricao, apagarSubscricao } from '@/lib/actions/push'

type Estado =
  | 'a-verificar'
  | 'sem-suporte'
  | 'precisa-instalar'
  | 'desligadas'
  | 'ligadas'
  | 'bloqueadas'

// A chave pública VAPID chega do browser como texto em base64url; a API
// de subscrição quer bytes.
function chaveParaBytes(base64: string): ArrayBuffer {
  const preenchido = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const normal = preenchido.replace(/-/g, '+').replace(/_/g, '/')
  const bruto = atob(normal)
  // Um ArrayBuffer e não um Uint8Array: o tipo de `applicationServerKey`
  // exige um buffer com dono, e um Uint8Array pode estar assente em
  // memória partilhada.
  const bytes = new Uint8Array(bruto.length)
  for (let i = 0; i < bruto.length; i += 1) bytes[i] = bruto.charCodeAt(i)
  return bytes.buffer
}

// Um nome que a pessoa reconheça na lista de aparelhos. Não é rigoroso
// nem precisa de ser: serve para distinguir "o telemóvel" do "computador
// da secretaria".
function descreverAparelho(): string {
  const ua = navigator.userAgent
  const sistema = /iPhone|iPad/.test(ua)
    ? 'iPhone'
    : /Android/.test(ua)
      ? 'Android'
      : /Mac/.test(ua)
        ? 'Mac'
        : /Windows/.test(ua)
          ? 'Windows'
          : 'Aparelho'
  const browser = /CriOS|Chrome/.test(ua)
    ? 'Chrome'
    : /Firefox/.test(ua)
      ? 'Firefox'
      : /Safari/.test(ua)
        ? 'Safari'
        : 'browser'
  return `${sistema} · ${browser}`
}

function ehIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // O iPad recente diz-se um Mac; o toque no ecrã denuncia-o.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function estaInstalada(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // O Safari do iOS não implementa o display-mode; tem esta bandeira.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// "Ativar notificações", uma vez por aparelho.
//
// Nunca pede a permissão sozinho: um pedido de notificações que aparece
// sem se perceber porquê é quase sempre recusado, e uma recusa no
// browser não se desfaz de dentro da app — a pessoa tem de ir às
// definições do sistema. Por isso a permissão só é pedida depois de um
// toque deliberado num botão que diz o que vai acontecer.
export function AtivarNotificacoes({
  chavePublica,
  endpointsGuardados,
}: {
  chavePublica: string
  endpointsGuardados: string[]
}) {
  const [estado, setEstado] = useState<Estado>('a-verificar')
  const [erro, setErro] = useState<string | null>(null)
  const [aTratar, iniciar] = useTransition()

  useEffect(() => {
    let vivo = true

    async function verificar() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        // No iOS isto acontece enquanto a app corre no Safari: a API só
        // existe depois de instalada no ecrã principal.
        if (vivo) setEstado(ehIOS() && !estaInstalada() ? 'precisa-instalar' : 'sem-suporte')
        return
      }

      if (ehIOS() && !estaInstalada()) {
        if (vivo) setEstado('precisa-instalar')
        return
      }

      if (Notification.permission === 'denied') {
        if (vivo) setEstado('bloqueadas')
        return
      }

      const registo = await navigator.serviceWorker.register('/sw.js')
      const subscricao = await registo.pushManager.getSubscription()

      if (!vivo) return

      // "Ligadas" só quando o browser TEM subscrição e o servidor a
      // conhece. Se uma das duas faltar, o botão volta a aparecer — é o
      // que resolve o caso de alguém ter apagado o aparelho noutro sítio.
      setEstado(
        subscricao && endpointsGuardados.includes(subscricao.endpoint) ? 'ligadas' : 'desligadas'
      )
    }

    verificar().catch(() => {
      if (vivo) setEstado('sem-suporte')
    })

    return () => {
      vivo = false
    }
  }, [endpointsGuardados])

  function ligar() {
    setErro(null)
    iniciar(async () => {
      try {
        const permissao = await Notification.requestPermission()
        if (permissao !== 'granted') {
          setEstado(permissao === 'denied' ? 'bloqueadas' : 'desligadas')
          return
        }

        const registo = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready

        const subscricao =
          (await registo.pushManager.getSubscription()) ??
          (await registo.pushManager.subscribe({
            // Sem isto, os browsers recusam-se a subscrever: uma push
            // silenciosa é a que serve para seguir pessoas.
            userVisibleOnly: true,
            applicationServerKey: chaveParaBytes(chavePublica),
          }))

        const json = subscricao.toJSON()
        const dados = new FormData()
        dados.set('endpoint', subscricao.endpoint)
        dados.set('p256dh', json.keys?.p256dh ?? '')
        dados.set('auth', json.keys?.auth ?? '')
        dados.set('descricao', descreverAparelho())

        const resultado = await guardarSubscricao({}, dados)
        if (resultado.erro) {
          setErro(resultado.erro)
          return
        }
        setEstado('ligadas')
      } catch {
        setErro('Não foi possível ligar as notificações neste aparelho.')
      }
    })
  }

  function desligar() {
    setErro(null)
    iniciar(async () => {
      try {
        const registo = await navigator.serviceWorker.getRegistration()
        const subscricao = await registo?.pushManager.getSubscription()

        if (subscricao) {
          const dados = new FormData()
          dados.set('endpoint', subscricao.endpoint)
          await apagarSubscricao({}, dados)
          // Só depois de o servidor esquecer é que o browser esquece: ao
          // contrário, uma falha a meio deixava o servidor a mandar
          // pushes para um endpoint que já ninguém ouve.
          await subscricao.unsubscribe()
        }

        setEstado('desligadas')
      } catch {
        setErro('Não foi possível desligar neste aparelho.')
      }
    })
  }

  return (
    <div className="space-y-2">
      {estado === 'a-verificar' && (
        <p className="text-sm text-foreground/60">A verificar este aparelho…</p>
      )}

      {estado === 'sem-suporte' && (
        <p className="text-sm text-foreground/60">
          Este browser não recebe notificações. Experimenta o Chrome, o Safari ou o Firefox
          atualizados.
        </p>
      )}

      {estado === 'precisa-instalar' && (
        <>
          <p className="text-sm text-foreground/70">
            No iPhone e no iPad, as notificações só funcionam com a app instalada no ecrã
            principal. É rápido: Partilhar → &quot;Adicionar ao ecrã principal&quot;.
          </p>
          <Link href="/instalar" className="agenda-ligacao-calendario">
            Como instalar
          </Link>
        </>
      )}

      {estado === 'bloqueadas' && (
        <p className="text-sm text-foreground/70">
          As notificações estão bloqueadas para este site nas definições do browser. Tens de as
          desbloquear aí — a app não o consegue fazer por ti.
        </p>
      )}

      {estado === 'desligadas' && (
        <>
          <p className="text-sm text-foreground/70">
            Recebes no telemóvel os mesmos avisos que aparecem aqui: aulas confirmadas,
            desmarcações, propostas de horário e mensalidades.
          </p>
          <button
            type="button"
            onClick={ligar}
            disabled={aTratar}
            className="flex h-[52px] w-full items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] border-[var(--color-ink)] text-[15px] font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-raised)] disabled:opacity-50 motion-reduce:transition-none sm:w-auto sm:px-7"
          >
            {aTratar ? 'A ligar…' : 'Ativar notificações'}
          </button>
        </>
      )}

      {estado === 'ligadas' && (
        <>
          <p className="text-sm text-foreground/70">
            Ligadas neste aparelho. Podes ativar noutros — cada um recebe.
          </p>
          <button
            type="button"
            onClick={desligar}
            disabled={aTratar}
            className="inline-flex min-h-[44px] items-center text-[14px] font-medium underline [text-underline-offset:3px] disabled:opacity-50"
            style={{ color: 'var(--color-azul-texto)' }}
          >
            {aTratar ? 'A desligar…' : 'Desligar neste aparelho'}
          </button>
        </>
      )}

      {erro && <p className="text-sm text-[var(--color-error)]">{erro}</p>}
    </div>
  )
}
