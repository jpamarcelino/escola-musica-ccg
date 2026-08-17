import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { Suspense } from "react";
import { NavigationFeedback } from "@/components/navigation-feedback";
import { PageTransition } from "@/components/page-transition";
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
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#conteudo-principal"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-[var(--radius-botao)] focus:bg-[var(--color-azul-fundo)] focus:px-4 focus:py-2 focus:text-white focus:no-underline"
        >
          Saltar para o conteúdo
        </a>
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
