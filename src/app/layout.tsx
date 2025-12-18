import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'POS UMKM - Sistem Point of Sale',
  description: 'Sistem Point of Sale (POS) lengkap untuk Usaha Mikro, Kecil, dan Menengah (UMKM)',
  keywords: ['POS', 'UMKM', 'Point of Sale', 'Kasir', 'Toko'],
  icons: {
    icon: 'https://i.ibb.co/Q36sR6H8/online-shop-1200175.png',
    shortcut: 'https://i.ibb.co/Q36sR6H8/online-shop-1200175.png',
    apple: 'https://i.ibb.co/Q36sR6H8/online-shop-1200175.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

