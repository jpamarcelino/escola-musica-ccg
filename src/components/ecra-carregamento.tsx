import { SimboloCCG } from '@/components/simbolo-ccg'

// Ecrã de espera da marca.
//
// A ideia da animação não é decorativa: vem do Manual de Normas
// Gráficas, que explica que o símbolo representado em efeito espelho
// "simboliza a ideia de que a cultura reflete a identidade de uma
// região, funcionando como o seu espelho e expressão viva". Por isso a
// pincelada chega a partir do ponto onde o pincel tocou, e o reflexo
// respira-lhe por baixo, em contratempo.
//
// É um Server Component de propósito — zero JavaScript. A primeira
// versão disto atrasava a entrada com um useState/useEffect de 400ms, e
// isso tinha um defeito que só apareceu a testar: um componente de
// cliente devolve null durante o render do servidor, por isso o ecrã
// nunca chegava a entrar no HTML transmitido em streaming — que é
// justamente o caso para que foi feito (arranque da app). O atraso
// passou para CSS (animation-delay em .ecra-carregamento), onde funciona
// no servidor e no cliente por igual e não custa um único byte de JS.
//
// Quando usar: só quando a espera pode ser mesmo longa e não há
// estrutura de página para mostrar — arranque da app, redirecionamentos
// de sessão, o assistente de pedido de aula. Onde já se sabe a forma do
// que vem a caminho, o esqueleto (skeleton.tsx) continua a ser melhor:
// mostra o layout a formar-se em vez de o esconder, e por isso a espera
// parece mais curta do que com um splash por cima.
export function EcraCarregamento({
  mensagem = 'A carregar…',
  contexto,
  cobrirEcra = false,
}: {
  // Dizer o que está a acontecer, não só que algo acontece.
  mensagem?: string
  // Segunda linha opcional, para esperas que valem uma explicação
  // ("Estamos a confirmar a tua sessão").
  contexto?: string
  // Sobreposto a tudo (transições de rota, submissões) em vez de
  // ocupar apenas o espaço do seu contentor.
  cobrirEcra?: boolean
}) {
  return (
    <div
      className={
        'ecra-carregamento flex flex-col items-center justify-center gap-[26px] px-[24px] ' +
        (cobrirEcra ? 'fixed inset-0 z-50' : 'min-h-[60vh] w-full flex-1')
      }
      style={{ backgroundColor: '#ffffff' }}
      role="status"
      aria-live="polite"
    >
      {/* A cor institucional (Pantone 311 C) entra por currentColor, que
          é o que o símbolo herda. Aqui pode ser ela própria, sem os
          cuidados de contraste da UI: é uma forma grande sobre branco,
          não texto a ler. */}
      <div
        className="flex flex-col items-center"
        aria-hidden="true"
        style={{ color: 'var(--marca-ciano)' }}
      >
        <div className="ecra-carregamento-simbolo">
          <SimboloCCG className="ecra-carregamento-simbolo-vivo h-[88px] w-auto" />
        </div>
        <SimboloCCG className="ecra-carregamento-reflexo -mt-[22px] h-[88px] w-auto" />
      </div>

      <div className="flex flex-col items-center gap-[14px]">
        <p
          className="text-center text-[15px] font-medium leading-[1.4]"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {mensagem}
        </p>
        {contexto && (
          <p
            className="max-w-[300px] text-center text-[13.5px] leading-[1.45]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {contexto}
          </p>
        )}

        {/* O sinal honesto de "ainda a trabalhar". A respiração do
            símbolo sozinha é ambígua — podia ser uma página parada com
            um logótipo animado. */}
        <div
          aria-hidden="true"
          className="h-[3px] w-[104px] overflow-hidden rounded-[var(--radius-pill)]"
          style={{ backgroundColor: 'var(--color-surface-raised)' }}
        >
          <div
            className="ecra-carregamento-barra h-full w-[34%] rounded-[var(--radius-pill)]"
            style={{ backgroundColor: 'var(--marca-ciano)' }}
          />
        </div>
      </div>
    </div>
  )
}
