// Tirar o identificador de um link do YouTube.
//
// O mesmo vídeo tem meia dúzia de endereços — youtu.be, /watch?v=,
// /shorts/, /embed/, /live/, com parâmetros de tempo (&t=90) e de
// campanha (?si=...) colados atrás. O que o professor cola é o que o
// botão "Partilhar" lhe deu, e isso varia com o sítio de onde partilhou.
//
// Guardamos só o id de 11 caracteres. Sem isto, o mesmo vídeo ficava
// gravado de quatro maneiras diferentes e não havia forma de os comparar.

const ID = /^[A-Za-z0-9_-]{11}$/

// Os caminhos em que o id vem a seguir ao nome: youtu.be/ID,
// /shorts/ID, /embed/ID, /live/ID, /v/ID.
const CAMINHOS = ['shorts', 'embed', 'live', 'v']

export function extrairIdYoutube(entrada: string): string | null {
  const texto = entrada.trim()
  if (texto === '') return null

  // Alguém que cole só o id — acontece, e recusá-lo seria pedantismo.
  if (ID.test(texto)) return texto

  let url: URL
  try {
    // Sem esquema, `new URL` recusa. Colar "youtu.be/xxxx" é o caso comum
    // de quem copia da barra de endereço do telemóvel.
    url = new URL(/^https?:\/\//i.test(texto) ? texto : `https://${texto}`)
  } catch {
    return null
  }

  const anfitriao = url.hostname.toLowerCase().replace(/^www\./, '')
  const partes = url.pathname.split('/').filter(Boolean)

  if (anfitriao === 'youtu.be') {
    return partes[0] && ID.test(partes[0]) ? partes[0] : null
  }

  if (
    anfitriao !== 'youtube.com' &&
    anfitriao !== 'm.youtube.com' &&
    anfitriao !== 'music.youtube.com' &&
    anfitriao !== 'youtube-nocookie.com'
  ) {
    return null
  }

  const v = url.searchParams.get('v')
  if (v && ID.test(v)) return v

  if (partes.length >= 2 && CAMINHOS.includes(partes[0]) && ID.test(partes[1])) {
    return partes[1]
  }

  return null
}

// A miniatura. É um endereço público e direto — não precisa de chave nem
// de pedido à API, e funciona com vídeos não listados.
//
// `hqdefault` e não `maxresdefault`: o de resolução máxima só existe se o
// vídeo foi carregado com resolução suficiente, e devolve 404 nos outros.
// Uma imagem partida no caderno do aluno é pior do que uma imagem de 480
// de largura, que é mais do que o dobro do espaço que tem no ecrã.
export function miniaturaYoutube(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

export function urlDoVideoYoutube(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`
}
