// Símbolo institucional do Centro Cultural da Guarda.
//
// Extraído do vetor original do Manual de Normas Gráficas (2026), não
// redesenhado: a pincelada é a mesma, com a textura de pincel seco no
// canto inferior esquerdo intacta. O manual descreve-o assim:
//
//   "Esta imagem representa a letra 'C' e também 'G' como a inicial da
//   palavra cultura, e também da palavra Guarda, desenhada de forma
//   livre e dinâmica."
//
// Fica inline, e não em <img src="/simbolo-ccg.svg">, por duas razões:
// é o que permite pintá-lo com currentColor (o manual prevê o símbolo
// em ciano, em preto e em branco, conforme o fundo), e sobretudo porque
// quem o usa é o ecrã de carregamento — pedir um ficheiro à rede para
// desenhar o ecrã que existe justamente porque a rede está lenta seria
// contraditório.
//
// O ficheiro public/simbolo-ccg.svg é a mesma arte, guardada para uso
// fora do React (favicon, open-graph, manifest).
export function SimboloCCG({
  className,
  titulo,
}: {
  className?: string
  // Sem título o símbolo é decorativo e sai da árvore de acessibilidade
  // — é o caso normal, porque quem o acompanha costuma já dizer o nome
  // da instituição em texto.
  titulo?: string
}) {
  return (
    <svg
      viewBox="0 0 131.213 141.725"
      className={className}
      fill="currentColor"
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : 'true'}
      focusable="false"
    >
      <g transform="translate(-341.9028,-165.6967)">
        <path
          transform="matrix(1,0,0,-1,395.3508,295.49574)"
          d="M0 0C17.012-2.787 36.006 2.792 47.055 10.791 63.261 23.751 62.329 44.072 63.772 59.69L64.906 55.077 66.591 56.037C67.973 71.506 64.602 86.635 53.693 101.501 48.042 105.729 44.938 112.362 37.418 115.179L35.985 114.819C37.815 94.806 57.191 74.493 47.329 54.083 43.033 48.131 32.474 43.121 21.852 42.83 6.681 43.296-4.983 49.061-13.892 55.894-9.407 54.988-5.424 50.45 .069 49.502-6.824 53.818-13.531 58.581-18.188 64.555-19.259 64.446-19.511 63.848-18.63 63.506L-17.48 61.977C-19.228 63.302-20.093 64.291-20.706 65.875L-19.323 66.731C-33.535 82.266-33.177 102-22.511 118.841-19.287 122.248-13.889 124.73-8.145 126.815L-8.491 127.211-16.376 124.908C-14.3 127.41-9.248 127.851-5.613 128.578 3.611 129.799 13.983 127.055 22.999 124.748 25.444 125.683 41.422 119.415 41.384 119.314 41.375 119.29 40.368 119.649 37.903 120.6 36.913 118.853 41.429 116.804 43.712 115.532 52.858 108.651 59.467 100.01 62.963 92.485 66.11 92.662 63.122 89.207 66.725 88.641 67.182 85.465 69.465 81.757 72.079 79.442 74.643 72.755 74.3 65.844 74.726 58.939L76.599 57.911C77.765 49.72 72.478 46.893 72.872 38.695 75.515 37.443 72.812 35.37 72.812 33.54 73.022 33.322 73.065 33.061 72.97 32.831 72.856 33.06 72.812 33.298 72.812 33.54L70.765 32.464C72.575 31.287 72.165 31.532 72.245 29.892L71.616 28.397 71.332 28.939C69.9 28.579 70.231 27.539 69.679 26.838L70.609 26 71.206 26.206C69.541 11.282 54.374-2.864 30.124-7.545 15.613-9.16 .365-11.926-14.082-6.086-29.948 .041-42.728 8.628-53.448 19.074-46.883 13.364-38.511 6.479-29.256 1.688L-28.659 1.891-33.256 5.579C-32.136 5.191-31.159 3.857-30.265 4.164-30.253 4.58-30.338 4.899-30.497 5.147L-31.546 5.837C-33.251 6.334-36.116 5.769-36.636 7.886-36.229 7.64-35.632 7.845-35.332 7.947-35.851 8.54-36.795 8.729-37.252 9.472L-39.155 9.207C-41.69 12.316-39.708 10.942-43.659 14.336L-46.365 15.208-45.392 16.31C-40.693 12.57-36.327 9.031-31.546 5.837-31.094 5.705-30.722 5.498-30.497 5.147-26.393 2.485-21.949 .079-16.712-1.983-17.782-4.526-9.834-4.508-6.845-5.924L-6.011-5.768C-36.103 5.504-31.208 9.225 0 0M-4.25 119.27C-9.798 116.983-19.458 113.172-21.51 107.886-30.816 88.309-13.973 67.671 10.376 55.255 16.909 53.443 26.642 49.461 31.779 55.137 44.099 63.677 33.771 75.36 32.031 84.48 35.168 84.068 34.17 81.024 35.858 80.802L21.981 107.401C22.381 110.047 19.534 112.646 18.578 114.835L18.331 109.786C17.807 112.713 14.59 115.837 16.478 118.447 8.907 120.078 1.702 121.186-4.859 119.828Z"
        />
      </g>
    </svg>
  )
}
