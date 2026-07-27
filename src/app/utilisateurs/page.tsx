import { notFound } from 'next/navigation'

import { getUtilisateursAdmin } from '@/lib/queries'
import { estAdmin, utilisateurCourant } from '@/lib/autorisation'
import { AdminUtilisateurs, type UtilisateurItem } from '@/components/cockpit/admin-utilisateurs'

export default async function Utilisateurs() {
  const moi = await utilisateurCourant()

  // Page reservee aux roles transverses : invisible et injoignable pour les autres.
  if (!moi || !estAdmin(moi)) notFound()

  const utilisateurs = await getUtilisateursAdmin()

  const items: UtilisateurItem[] = utilisateurs.map((utilisateur) => ({
    id: utilisateur.id,
    name: utilisateur.name,
    email: utilisateur.email,
    role: utilisateur.role,
    projetsPortes: utilisateur._count.projets,
    projetsMembre: utilisateur._count.projetsMembre,
  }))

  return (
    <div className="px-6 py-8 lg:px-10">
      <header className="mb-8">
        <h1 className="text-4xl font-light leading-tight tracking-tight">Utilisateurs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Comptes, rôles et accès. Un COO ou un Head voit tous les projets ; les autres profils ne
          voient que ceux qu&apos;ils portent ou dont ils sont membres.
        </p>
      </header>

      <AdminUtilisateurs utilisateurs={items} />
    </div>
  )
}
