import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { DOCUMENTOS, documentoPorTipo } from '@/lib/legal'
import { DocumentoLegalPagina } from '@/components/documento-legal'

// Páginas públicas: sem `auth.getUser()`, sem redirecionamento, sem
// sessão. Quem ainda não tem conta tem de as poder ler antes de decidir
// criar uma — e quem quer sair da app tem de as poder ler depois.
export function generateStaticParams() {
  return DOCUMENTOS.map((d) => ({ documento: d.tipo }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ documento: string }>
}): Promise<Metadata> {
  const { documento } = await params
  const doc = documentoPorTipo(documento)
  if (!doc) return {}
  return { title: `${doc.titulo} · Centro Cultural da Guarda`, description: doc.resumo }
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ documento: string }>
}) {
  const { documento } = await params
  const doc = documentoPorTipo(documento)

  if (!doc) {
    notFound()
  }

  return <DocumentoLegalPagina documento={doc} />
}
