'use client'

import { useActionState, useEffect, useState } from 'react'
import Image from 'next/image'
import { miniaturaYoutube } from '@ccg/core'
import {
  procurarVideo,
  publicarVideo,
  type EstadoEnvio,
  type EstadoProcura,
  type VideoEncontrado,
} from '@/lib/actions/materiais'
import { SeletorAlunos, type AlunoEscolhivel } from '@/components/seletor-alunos'
import { classesCampo, Rotulo } from '@/components/campo-formulario'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'
import { SubmitButton } from '@/components/submit-button'

const PROCURA_INICIAL: EstadoProcura = {}
const ENVIO_INICIAL: EstadoEnvio = {}

// Enviar um vídeo é, na prática, colar um link.
//
// O passo do link é um formulário à parte, e não um campo deste: o
// professor cola, o servidor vai buscar o título ao YouTube e devolve-o
// já escrito. Só depois disso é que aparece o resto — assim ninguém
// escolhe alunos para um link que afinal está errado.
export function EnviarVideoForm({ alunos }: { alunos: AlunoEscolhivel[] }) {
  const [procura, procurar] = useActionState(procurarVideo, PROCURA_INICIAL)
  const [envio, enviar] = useActionState(publicarVideo, ENVIO_INICIAL)

  const [video, setVideo] = useState<VideoEncontrado | null>(null)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [escolhidos, setEscolhidos] = useState<string[]>([])

  // O título vem do YouTube já preenchido, mas é editável: "Aula 3 —
  // escala de Sol" diz mais ao aluno do que o nome com que o professor
  // gravou o ficheiro.
  useEffect(() => {
    if (procura.video) {
      setVideo(procura.video)
      setTitulo(procura.video.titulo)
    }
  }, [procura])

  // Depois de enviar, a folha fica limpa — senão o mesmo vídeo convida a
  // ser enviado outra vez, e a segunda vez envia mesmo.
  useEffect(() => {
    if (envio.enviadoA !== undefined) {
      setVideo(null)
      setTitulo('')
      setDescricao('')
      setEscolhidos([])
    }
  }, [envio])

  if (alunos.length === 0) {
    return (
      <MensagemInfo>
        Ainda não tens alunos com aulas a decorrer. O material vai para quem já anda nas tuas
        aulas.
      </MensagemInfo>
    )
  }

  return (
    <div className="space-y-7">
      {envio.enviadoA !== undefined && (
        <MensagemInfo>
          Enviado a {envio.enviadoA} {envio.enviadoA === 1 ? 'aluno' : 'alunos'}. Já está no
          caderno {envio.enviadoA === 1 ? 'dele' : 'deles'}.
        </MensagemInfo>
      )}

      {/* Passo 1: o link */}
      <form action={procurar} className="space-y-[10px]">
        <Rotulo htmlFor="link">Link do vídeo no YouTube</Rotulo>
        <div className="material-link-linha">
          <input
            id="link"
            name="link"
            type="url"
            inputMode="url"
            placeholder="https://youtu.be/…"
            className={classesCampo}
            required
          />
          <SubmitButton textoAGuardar="A procurar…" className="material-procurar">
            Procurar
          </SubmitButton>
        </div>
        <p className="material-ajuda">
          Carrega o vídeo no YouTube como <strong>Não listado</strong> e cola aqui o link. Não
          listado quer dizer que só quem tem o link o vê — se puseres <strong>Privado</strong>, o
          aluno não consegue abrir.
        </p>
        {procura.erro && <MensagemErro>{procura.erro}</MensagemErro>}
      </form>

      {/* Passo 2: o resto, só depois de haver vídeo */}
      {video && (
        <form action={enviar} className="space-y-7">
          <input type="hidden" name="youtubeId" value={video.youtubeId} />

          <div className="material-previsao">
            <Image
              src={miniaturaYoutube(video.youtubeId)}
              alt=""
              width={160}
              height={90}
              unoptimized
            />
            <div>
              <small>Encontrado no YouTube{video.canal ? ` · ${video.canal}` : ''}</small>
              <strong>{procura.video?.titulo}</strong>
            </div>
          </div>

          <div className="space-y-[10px]">
            <Rotulo htmlFor="titulo">Título</Rotulo>
            <input
              id="titulo"
              name="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className={classesCampo}
              maxLength={160}
              required
            />
            <p className="material-ajuda">
              Veio do YouTube. Muda para o que fizer sentido ao aluno.
            </p>
          </div>

          <div className="space-y-[10px]">
            <Rotulo htmlFor="descricao">Descrição (opcional)</Rotulo>
            <textarea
              id="descricao"
              name="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className={classesCampo}
              maxLength={600}
              rows={3}
              placeholder="O que é para praticar, quantas vezes, a que velocidade…"
            />
          </div>

          <fieldset className="space-y-[10px]">
            <legend className="mensagem-legenda">Para quem</legend>
            <SeletorAlunos alunos={alunos} escolhidos={escolhidos} aoMudar={setEscolhidos} />
          </fieldset>

          {envio.erro && <MensagemErro>{envio.erro}</MensagemErro>}

          <SubmitButton textoAGuardar="A enviar…" className="recomendacao-submeter">
            {escolhidos.length === 0
              ? 'Enviar vídeo'
              : `Enviar a ${escolhidos.length} ${escolhidos.length === 1 ? 'aluno' : 'alunos'}`}
          </SubmitButton>
        </form>
      )}
    </div>
  )
}
