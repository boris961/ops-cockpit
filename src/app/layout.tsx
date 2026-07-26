import type { Metadata } from 'next'
import { Libre_Caslon_Display, Montserrat } from 'next/font/google'

import { auth } from '@/auth'
import { estAdmin, utilisateurCourant } from '@/lib/autorisation'
import { Sidebar } from '@/components/cockpit/sidebar'
import './globals.css'

const caslon = Libre_Caslon_Display({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-caslon',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
})

export const metadata: Metadata = {
  title: 'Ops cockpit — Entrepreneurs',
  description: "Pilotage des missions, de l'avancement et des blocages.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  const utilisateur = session?.user
  // Le role fait foi cote base, pas cote jeton : c'est lui qui ouvre la nav admin.
  const compte = utilisateur ? await utilisateurCourant() : null

  return (
    <html
      lang="fr"
      className={`${montserrat.variable} ${caslon.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background">
        {/* Hors session (ecran de connexion), on rend la page seule : la coquille
            de navigation n'a pas de sens sans utilisateur. */}
        {utilisateur ? (
          <div className="flex min-h-screen">
            <Sidebar
              admin={compte ? estAdmin(compte) : false}
              utilisateur={{
                name: compte?.name ?? utilisateur.name,
                email: utilisateur.email,
                image: utilisateur.image,
                role: compte?.role ?? (utilisateur as { role?: string }).role,
              }}
            />
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  )
}
