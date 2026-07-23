import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Escola de Música — Centro Cultural',
    short_name: 'Escola de Música',
    description: 'Marcação de aulas da escola de música do Centro Cultural',
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
