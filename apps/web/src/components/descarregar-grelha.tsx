'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'

export type AulaGrelha = {
  dia: string
  // Horas em cru, como vêm da base de dados ("10:00:00"), porque é delas
  // que sai a posição do bloco. A etiqueta vem à parte, já escrita pelo
  // servidor: o formato do CCG é "10h" e "10h45", e um "10h" dado a
  // parser de posições devolve NaN — foi assim que a primeira folha saiu
  // com a grelha desenhada e nenhuma aula lá dentro.
  inicio: string
  fim: string
  etiqueta: string
  titulo: string
  detalhe: string
}

// Descarregar a grelha semanal como imagem.
//
// A grelha é desenhada de novo num canvas e não fotografada do ecrã. Uma
// fotografia do DOM (html2canvas e afins) traz o que o telemóvel mostra:
// as colunas que couberam, cortadas onde a lista rolava, à largura do
// aparelho de quem carregou no botão. É exatamente a distorção que não
// pode acontecer num horário que vai ser impresso e afixado.
//
// Desenhada de raiz, a folha tem sempre a semana toda, colunas da mesma
// largura, e o mesmo aspeto venha de um iPhone SE ou de um portátil.
// PNG e não PDF: não traz biblioteca nenhuma, abre em qualquer lado,
// envia-se no WhatsApp e imprime-se bem aos 2x a que é gerada.
const COLUNA = 168
const REGUA = 66
const CABECALHO = 118
// 84 e nao 76: uma aula de 45 minutos fica com 57 px, o que chega para as
// tres linhas (hora, disciplina, aluno). Aos 76 px so cabiam duas, e num
// horario de professor o nome do aluno nao e o detalhe dispensavel.
const LINHA_HORA = 84
const MARGEM = 28
const ESCALA = 2

const TINTA = '#17191c'
const SUAVE = '#7b8188'
const RISCO = '#e6e9ed'
const AZUL = '#1b4f7a'
const AZUL_FUNDO = '#e7f1fa'
const AZUL_RISCO = '#d7e5f2'

// Aceita "10:00", "10:00:00", "10h" e "10h45". Não é indecisão sobre o
// formato: é a garantia de que uma folha nunca mais sai vazia se alguém
// mudar o que lhe é passado.
function minutos(hora: string): number {
  const m = hora.match(/^(\d{1,2})\s*[:h]\s*(\d{1,2})?/)
  if (!m) return Number.NaN
  return Number(m[1]) * 60 + Number(m[2] ?? 0)
}

function cantoRedondo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  largura: number,
  altura: number,
  raio: number
) {
  const r = Math.min(raio, largura / 2, altura / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + largura, y, x + largura, y + altura, r)
  ctx.arcTo(x + largura, y + altura, x, y + altura, r)
  ctx.arcTo(x, y + altura, x, y, r)
  ctx.arcTo(x, y, x + largura, y, r)
  ctx.closePath()
}

// Corta o texto com reticências à largura dada, para um nome comprido não
// sair por fora do bloco.
function cortar(ctx: CanvasRenderingContext2D, texto: string, largura: number): string {
  if (ctx.measureText(texto).width <= largura) return texto
  let corte = texto
  while (corte.length > 1 && ctx.measureText(`${corte}…`).width > largura) {
    corte = corte.slice(0, -1)
  }
  return `${corte}…`
}

export function DescarregarGrelha({
  dias,
  aulas,
  primeiraHora,
  ultimaHora,
  nome,
  anoLetivo,
}: {
  dias: string[]
  aulas: AulaGrelha[]
  primeiraHora: number
  ultimaHora: number
  nome: string
  anoLetivo: string
}) {
  const [aGerar, setAGerar] = useState(false)

  function desenhar() {
    setAGerar(true)
    try {
      const horas = ultimaHora - primeiraHora
      const largura = MARGEM * 2 + REGUA + dias.length * COLUNA
      const altura = MARGEM * 2 + CABECALHO + horas * LINHA_HORA + 34

      const canvas = document.createElement('canvas')
      canvas.width = largura * ESCALA
      canvas.height = altura * ESCALA
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(ESCALA, ESCALA)
      ctx.textBaseline = 'top'

      const sans =
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

      // Fundo branco e não transparente: um PNG transparente enviado por
      // WhatsApp aparece com texto preto sobre fundo preto no modo escuro.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, largura, altura)

      ctx.fillStyle = TINTA
      ctx.font = `700 26px ${sans}`
      ctx.fillText(nome, MARGEM, MARGEM)
      ctx.fillStyle = SUAVE
      ctx.font = `400 14px ${sans}`
      ctx.fillText(`Horário semanal · ${anoLetivo}`, MARGEM, MARGEM + 34)

      const topo = MARGEM + CABECALHO
      const esquerda = MARGEM + REGUA

      // Cabeçalho dos dias.
      ctx.font = `700 13px ${sans}`
      ctx.fillStyle = SUAVE
      dias.forEach((dia, i) => {
        const x = esquerda + i * COLUNA
        const texto = dia.toUpperCase()
        ctx.fillText(texto, x + (COLUNA - ctx.measureText(texto).width) / 2, topo - 26)
      })

      // Linhas das horas, com a hora à esquerda.
      ctx.strokeStyle = RISCO
      ctx.lineWidth = 1
      ctx.font = `600 12px ${sans}`
      for (let h = 0; h <= horas; h++) {
        const y = topo + h * LINHA_HORA
        ctx.beginPath()
        // O meio pixel é o que impede a linha de sair desfocada.
        ctx.moveTo(MARGEM + REGUA - 10, y + 0.5)
        ctx.lineTo(largura - MARGEM, y + 0.5)
        ctx.stroke()
        if (h < horas) {
          ctx.fillStyle = SUAVE
          const etiqueta = `${primeiraHora + h}h`
          ctx.fillText(
            etiqueta,
            MARGEM + REGUA - 18 - ctx.measureText(etiqueta).width,
            y + 5
          )
        }
      }

      // Separadores entre dias.
      dias.forEach((_, i) => {
        if (i === 0) return
        const x = esquerda + i * COLUNA
        ctx.beginPath()
        ctx.moveTo(x + 0.5, topo)
        ctx.lineTo(x + 0.5, topo + horas * LINHA_HORA)
        ctx.stroke()
      })

      // As aulas.
      for (const aula of aulas) {
        const coluna = dias.indexOf(aula.dia)
        if (coluna < 0) continue
        const inicio = minutos(aula.inicio)
        const fim = minutos(aula.fim)
        // Sem isto, uma hora que não se consiga ler dava NaN, e o canvas
        // desenha um bloco NaN sem se queixar — a folha saía com a grelha
        // toda e nenhuma aula.
        if (!Number.isFinite(inicio) || !Number.isFinite(fim)) continue
        const x = esquerda + coluna * COLUNA + 6
        const y = topo + ((inicio - primeiraHora * 60) / 60) * LINHA_HORA + 3
        const w = COLUNA - 12
        const h = Math.max(30, ((fim - inicio) / 60) * LINHA_HORA - 6)

        ctx.fillStyle = AZUL_FUNDO
        ctx.strokeStyle = AZUL_RISCO
        cantoRedondo(ctx, x, y, w, h, 10)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = AZUL
        ctx.font = `700 13px ${sans}`
        ctx.fillText(aula.etiqueta, x + 9, y + 7)
        ctx.font = `600 12px ${sans}`
        ctx.fillText(cortar(ctx, aula.titulo, w - 18), x + 9, y + 24)
        if (h > 52 && aula.detalhe) {
          ctx.fillStyle = '#3d6f96'
          ctx.font = `400 11px ${sans}`
          ctx.fillText(cortar(ctx, aula.detalhe, w - 18), x + 9, y + 41)
        }
      }

      ctx.fillStyle = SUAVE
      ctx.font = `400 11px ${sans}`
      ctx.fillText('Centro Cultural da Guarda', MARGEM, altura - MARGEM - 4)

      const ficheiro = `horario-${nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = ficheiro
        document.body.appendChild(a)
        a.click()
        a.remove()
        // Revogar já cortava a transferência a meio em alguns browsers.
        setTimeout(() => URL.revokeObjectURL(url), 30_000)
        setAGerar(false)
      }, 'image/png')
    } catch {
      setAGerar(false)
    }
  }

  return (
    <button type="button" className="pinterest-semana-descarregar" onClick={desenhar}>
      <Download size={19} strokeWidth={2} aria-hidden="true" />
      <span>
        <strong>{aGerar ? 'A preparar…' : 'Descarregar a grelha'}</strong>
        <small>Imagem PNG com a semana inteira</small>
      </span>
    </button>
  )
}
