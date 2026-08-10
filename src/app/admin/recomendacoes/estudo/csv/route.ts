import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recolherDadosEstudo, estudoParaCsv } from '@/lib/estudo-recomendacoes'

// Exportação para o relatório final (Art. 31.º). Devolve exatamente as
// mesmas linhas que a página do estudo mostra, porque ambas passam por
// recolherDadosEstudo.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
  }

  const { data: perfilAtual } = await supabase
    .from('perfis_escola')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    return NextResponse.json({ erro: 'Sem permissões.' }, { status: 403 })
  }

  const { linhas } = await recolherDadosEstudo(supabase)
  const hoje = new Date().toISOString().slice(0, 10)

  return new NextResponse(estudoParaCsv(linhas), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="recomendacoes-${hoje}.csv"`,
    },
  })
}
