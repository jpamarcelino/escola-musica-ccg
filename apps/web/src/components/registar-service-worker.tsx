'use client'

import { useEffect } from 'react'

// Regista o service worker em todas as páginas.
//
// Podia ficar só no ecrã onde se ligam as notificações — é lá que ele é
// registado pela primeira vez. Mas então uma versão nova do `sw.js` só
// chegaria a quem voltasse a esse ecrã, e quem ligou as notificações há
// três meses ficava com o worker antigo a tratar das pushes.
//
// Não renderiza nada e não bloqueia nada: corre depois da página estar
// montada, e uma falha aqui não é visível para ninguém — sem worker, a
// app continua a funcionar, só não recebe pushes.
export function RegistarServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  return null
}
