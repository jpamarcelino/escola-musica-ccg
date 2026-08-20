// Service worker da app. Existe por causa das notificações: sem um
// worker registado, o browser não tem onde entregar uma push quando a
// app está fechada — que é precisamente quando ela serve para alguma
// coisa.
//
// Não faz cache de nada, de propósito. Uma app de marcação de aulas com
// páginas guardadas mostra horários que já mudaram, e um horário errado
// é pior do que um ecrã à espera de rede.

self.addEventListener('install', () => {
  // Entra ao serviço sem esperar que os separadores antigos fechem.
  self.skipWaiting()
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim())
})

self.addEventListener('push', (evento) => {
  // Um payload que não venha em JSON não deita o worker abaixo: mostra-se
  // o genérico, que ainda leva a pessoa aos avisos.
  let dados = {}
  try {
    dados = evento.data ? evento.data.json() : {}
  } catch {
    dados = {}
  }

  const titulo = dados.titulo || 'Centro Cultural da Guarda'
  const opcoes = {
    body: dados.corpo || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    // A `tag` faz a segunda push do mesmo aviso substituir a primeira em
    // vez de empilhar. Sem ela, uma reentrega do serviço de push
    // duplicava o aviso no ecrã.
    tag: dados.tag || 'aviso',
    data: { url: dados.url || '/dashboard/avisos' },
    // Vibra no telemóvel; nos sistemas que não vibram é ignorado.
    vibrate: [80, 40, 80],
  }

  evento.waitUntil(self.registration.showNotification(titulo, opcoes))
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()

  const destino = (evento.notification.data && evento.notification.data.url) || '/dashboard/avisos'

  // Se a app já está aberta, salta para o separador que existe e navega
  // lá dentro — abrir uma segunda janela por cima da primeira é o género
  // de coisa que faz uma pessoa perder o que estava a fazer.
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if ('focus' in janela) {
          janela.navigate(destino).catch(() => {})
          return janela.focus()
        }
      }
      return self.clients.openWindow(destino)
    })
  )
})
