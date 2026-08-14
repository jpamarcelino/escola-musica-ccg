// Container das páginas sem hero (login, registo, wizard). O grão de
// papel da v1 foi removido daqui pela mesma razão que do body: era um
// filtro SVG a cobrir a página inteira, caro em cada repaint, e a
// textura artesanal já não pertence à direção v2.
export function FundoPapel({
  children,
  largura = 'estreita',
}: {
  children: React.ReactNode
  // "estreita" centra vertical e horizontalmente, para formulários curtos.
  // "larga" alinha ao topo com a largura de conteúdo de 720px, que é o
  // que as listas dos hubs precisam.
  largura?: 'estreita' | 'larga'
}) {
  const larga = largura === 'larga'

  return (
    <main
      id="conteudo-principal"
      className={`flex flex-1 flex-col px-[22px] py-[26px] ${
        larga ? 'items-center' : 'items-center justify-center'
      }`}
      style={{
        backgroundColor: '#ffffff',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-inter)',
      }}
    >
      <div className={`w-full ${larga ? 'max-w-[720px]' : 'max-w-[420px]'}`}>{children}</div>
    </main>
  )
}
