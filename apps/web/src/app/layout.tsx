import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { Suspense } from "react";
import { CabecalhoPublico } from "@/components/cabecalho-publico";
import { NavigationFeedback } from "@/components/navigation-feedback";
import { PageTransition } from "@/components/page-transition";
import { RegistarServiceWorker } from "@/components/registar-service-worker";
import { APARENCIA_PREDEFINIDA, CHAVE_APARENCIA } from "@/lib/aparencia";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fontes do DESIGN_SYSTEM.md (secção 3), disponíveis em toda a app. Só
// declaram as variáveis: quem não as usar continua com a Geist, por isso
// os ecrãs ainda por migrar não mudam de aspeto.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Centro Cultural da Guarda",
  description: "Marcação de aulas das escolas de Música e Dança do Centro Cultural da Guarda",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Centro Cultural da Guarda",
  },
  // O Safari do iOS procura números de telefone no texto e transforma-os
  // em links sozinho. Fá-lo ao NIPC do rodapé — 501 430 881 tem o
  // aspeto de um número — e altera o HTML antes de o React hidratar, o
  // que rebenta a hidratação da página inteira com um "server rendered
  // HTML didn't match the client".
  //
  // Só acontece no iOS, por isso não aparece em nenhum teste feito no
  // Chrome. Os números que devem ser telefones nesta app já são links
  // escritos à mão (o contacto do encarregado, nos pedidos), e esses não
  // dependem desta deteção.
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: "#26619c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt"
      // O script abaixo escreve `data-aparencia`/`data-tema` no <html>
      // antes de o React hidratar. O HTML do servidor não os traz — não
      // pode: só o browser sabe o que está guardado neste aparelho — e
      // sem isto o React acusa a diferença e desiste de hidratar a
      // página inteira. Suprime só os atributos DESTE elemento.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        {/* Corre antes de qualquer pintura, e por isso tem de ser um
            script em texto e não um componente: quando o tema escuro
            existir, esperar pelo React para o aplicar mostraria um
            relâmpago branco a cada arranque da app. Lê a preferência
            guardada e escreve-a no <html> — o CSS lê o atributo, não o
            localStorage. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var e=localStorage.getItem(${JSON.stringify(
              CHAVE_APARENCIA,
            )});if(e!=="claro"&&e!=="escuro"&&e!=="sistema")e=${JSON.stringify(
              APARENCIA_PREDEFINIDA,
            )};var r=document.documentElement;r.dataset.aparencia=e;r.dataset.tema=e==="sistema"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"escuro":"claro"):e;}catch(_){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <RegistarServiceWorker />
        <a
          href="#conteudo-principal"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-[var(--radius-botao)] focus:bg-[var(--color-azul-fundo)] focus:px-4 focus:py-2 focus:text-white focus:no-underline"
        >
          Saltar para o conteúdo
        </a>
        {/* Fora da transição de página, de propósito: a marca é o ponto
            fixo do ecrã e não deve piscar a cada navegação. */}
        <Suspense fallback={null}>
          <CabecalhoPublico />
        </Suspense>
        <Suspense fallback={children}>
          <PageTransition>{children}</PageTransition>
        </Suspense>
        <Suspense fallback={null}>
          <NavigationFeedback />
        </Suspense>
      </body>
    </html>
  );
}
