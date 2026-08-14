import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { NavigationFeedback } from "@/components/navigation-feedback";
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

const inter = Inter({
  variable: "--font-inter",
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
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#conteudo-principal"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-[var(--radius-botao)] focus:bg-[var(--color-azul-fundo)] focus:px-4 focus:py-2 focus:text-white focus:no-underline"
        >
          Saltar para o conteúdo
        </a>
        <header className="border-b border-[var(--color-linha)]">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
            <Link href="/" className="flex min-h-[44px] items-center gap-3">
              <Image
                src="/logo.png"
                alt="Centro Cultural da Guarda"
                width={32}
                height={48}
                className="h-9 w-auto"
                priority
              />
              <span className="leading-tight">
                <span className="block text-sm font-semibold" style={{ fontFamily: 'var(--font-fraunces)' }}>
                  Centro Cultural da Guarda
                </span>
                <span
                  className="mt-[2px] block text-[9.5px] font-medium uppercase tracking-[0.16em]"
                  style={{ color: 'var(--color-tinta-suave)' }}
                >
                  Escolas Artísticas
                </span>
              </span>
            </Link>
          </div>
        </header>
        {children}
        <Suspense fallback={null}>
          <NavigationFeedback />
        </Suspense>
      </body>
    </html>
  );
}
