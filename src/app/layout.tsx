import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Escola de Música",
  description: "Marcação de aulas da escola de música do Centro Cultural",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Escola de Música",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-foreground/10">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Centro Cultural"
                width={32}
                height={48}
                className="h-9 w-auto"
                priority
              />
              <span className="text-sm font-semibold leading-tight">
                Escola de Música
                <span className="block text-xs font-normal text-foreground/50">
                  Centro Cultural
                </span>
              </span>
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
