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
// justamente o caso para que foi feito (arranque da app). A entrada
// passou para CSS, onde funciona no servidor e no cliente por igual e
// não custa um único byte de JS.
//
// Quando usar: é a resposta de espera de toda a app. Cada área dá-lhe
// uma mensagem que diz o que está a abrir — "A abrir a secretaria…",
// "A abrir o caderno…", "A preparar a escolha…" — em vez do genérico
// "A carregar…", porque nomear o destino torna a espera compreensível.
//
// Com `cobrirEcra` sobrepõe-se à página; com `manterNavegacao` deixa a
// barra inferior utilizável por baixo, para as transições de rota não
// prenderem quem quer ir a outro lado.
//
// Nota histórica, porque o contrário chegou a estar escrito aqui: as
// áreas com forma previsível respondiam com esqueleto (skeleton.tsx),
// para se ver o layout a formar-se. Esse ficheiro foi retirado e a app
// passou a tratar a espera no movimento entre páginas
// (page-transition.tsx, navigation-feedback.tsx), com este ecrã por
// cima. Não há esqueletos na app.
export function EcraCarregamento({
  mensagem = 'A carregar…',
  contexto,
  cobrirEcra = false,
  manterNavegacao = false,
}: {
  // Dizer o que está a acontecer, não só que algo acontece.
  mensagem?: string
  // Segunda linha opcional, para esperas que valem uma explicação
  // ("Estamos a confirmar a tua sessão").
  contexto?: string
  // Sobreposto a tudo (transições de rota, submissões) em vez de
  // ocupar apenas o espaço do seu contentor.
  cobrirEcra?: boolean
  // Mantém a barra inferior utilizável e visível durante transições de rota.
  manterNavegacao?: boolean
}) {
  return (
    <div
      className={
        'ecra-carregamento flex flex-col items-center justify-center gap-[26px] px-[24px] ' +
        (cobrirEcra
          ? `fixed inset-0 ${manterNavegacao ? 'z-30 pb-[104px]' : 'z-50'}`
          : 'min-h-[60vh] w-full flex-1')
      }
      role="status"
      aria-live="polite"
    >
      {/* A cor institucional (Pantone 311 C) entra por currentColor, que
          é o que o símbolo herda. Aqui pode ser ela própria, sem os
          cuidados de contraste da UI: é uma forma grande sobre branco,
          não texto a ler. */}
      <div
        className="ecra-carregamento-marca flex flex-col items-center"
        aria-hidden="true"
      >
        <div className="ecra-carregamento-simbolo">
          <SimboloCCG className="ecra-carregamento-simbolo-vivo h-[88px] w-auto" />
        </div>
        <SimboloCCG className="ecra-carregamento-reflexo -mt-[22px] h-[88px] w-auto" />
      </div>

      <div className="flex flex-col items-center gap-[14px]">
        <p
          className="ecra-carregamento-mensagem text-center text-[15px] font-medium leading-[1.4]"
        >
          {mensagem}
        </p>
        {contexto && (
          <p
            className="ecra-carregamento-contexto max-w-[300px] text-center text-[13.5px] leading-[1.45]"
          >
            {contexto}
          </p>
        )}

        {/* O sinal honesto de "ainda a trabalhar". A respiração do
            símbolo sozinha é ambígua — podia ser uma página parada com
            um logótipo animado. */}
        <div
          aria-hidden="true"
          className="ecra-carregamento-trilho h-[3px] w-[104px] overflow-hidden rounded-[var(--radius-pill)]"
        >
          <div
            className="ecra-carregamento-barra h-full w-[34%] rounded-[var(--radius-pill)]"
          />
        </div>
      </div>
    </div>
  )
}
