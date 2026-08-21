import { describe, expect, it } from 'vitest'
import { extrairIdYoutube, miniaturaYoutube, urlDoVideoYoutube } from './youtube'

const ID = 'dQw4w9WgXcQ'

describe('extrairIdYoutube', () => {
  it('aceita o endereço normal', () => {
    expect(extrairIdYoutube(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID)
  })

  it('aceita o link curto do botão Partilhar', () => {
    expect(extrairIdYoutube(`https://youtu.be/${ID}`)).toBe(ID)
  })

  it('aguenta os parâmetros que o Partilhar cola atrás', () => {
    expect(extrairIdYoutube(`https://youtu.be/${ID}?si=abc123&t=90`)).toBe(ID)
    expect(extrairIdYoutube(`https://www.youtube.com/watch?v=${ID}&t=42s&list=PL123`)).toBe(ID)
  })

  it('aceita shorts, embed, live e /v/', () => {
    expect(extrairIdYoutube(`https://www.youtube.com/shorts/${ID}`)).toBe(ID)
    expect(extrairIdYoutube(`https://www.youtube.com/embed/${ID}`)).toBe(ID)
    expect(extrairIdYoutube(`https://www.youtube.com/live/${ID}`)).toBe(ID)
    expect(extrairIdYoutube(`https://www.youtube.com/v/${ID}`)).toBe(ID)
  })

  it('aceita telemóvel, music e nocookie', () => {
    expect(extrairIdYoutube(`https://m.youtube.com/watch?v=${ID}`)).toBe(ID)
    expect(extrairIdYoutube(`https://music.youtube.com/watch?v=${ID}`)).toBe(ID)
    expect(extrairIdYoutube(`https://www.youtube-nocookie.com/embed/${ID}`)).toBe(ID)
  })

  it('aguenta um link sem esquema, como quem copia do telemóvel', () => {
    expect(extrairIdYoutube(`youtu.be/${ID}`)).toBe(ID)
    expect(extrairIdYoutube(`www.youtube.com/watch?v=${ID}`)).toBe(ID)
  })

  it('aguenta espaços à volta', () => {
    expect(extrairIdYoutube(`  https://youtu.be/${ID}  `)).toBe(ID)
  })

  it('aceita o id colado sozinho', () => {
    expect(extrairIdYoutube(ID)).toBe(ID)
  })

  it('recusa o que não é do YouTube', () => {
    expect(extrairIdYoutube('https://vimeo.com/123456789')).toBeNull()
    // Um domínio que só *acaba* em youtube.com não é o YouTube. Sem esta
    // distinção, um endereço como youtube.com.exemplo.pt passava.
    expect(extrairIdYoutube(`https://youtube.com.exemplo.pt/watch?v=${ID}`)).toBeNull()
  })

  it('recusa lixo e vazios', () => {
    expect(extrairIdYoutube('')).toBeNull()
    expect(extrairIdYoutube('   ')).toBeNull()
    expect(extrairIdYoutube('não é um link')).toBeNull()
    expect(extrairIdYoutube('https://www.youtube.com/')).toBeNull()
    // Um canal não é um vídeo.
    expect(extrairIdYoutube('https://www.youtube.com/@RickAstleyYT')).toBeNull()
  })

  it('recusa ids com o tamanho errado', () => {
    expect(extrairIdYoutube('https://youtu.be/abc')).toBeNull()
    expect(extrairIdYoutube('https://youtu.be/dQw4w9WgXcQextra')).toBeNull()
  })
})

describe('endereços derivados', () => {
  it('a miniatura é um endereço direto, sem chave', () => {
    expect(miniaturaYoutube(ID)).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`)
  })

  it('o link do vídeo é a forma canónica', () => {
    expect(urlDoVideoYoutube(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`)
  })
})
