import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Centro Cultural da Guarda',
    short_name: 'Centro Cultural',
    description: 'Marcação de aulas das escolas de Música e Dança do Centro Cultural da Guarda',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#26619c',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
