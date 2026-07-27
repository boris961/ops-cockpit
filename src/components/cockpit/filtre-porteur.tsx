'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Filtre par porteur (directeur du projet). Se combine aux autres parametres
 * d'URL deja poses, comme le filtre Actifs / Archives.
 */
export function FiltrePorteur({
  porteurs,
}: {
  porteurs: Array<{ id: string; name: string }>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const parametres = useSearchParams()
  const actuel = parametres.get('porteur') ?? ''

  function changer(valeur: string) {
    const suivants = new URLSearchParams(parametres.toString())
    if (valeur) suivants.set('porteur', valeur)
    else suivants.delete('porteur')
    const requete = suivants.toString()
    router.push(requete ? `${pathname}?${requete}` : pathname)
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="filtre-porteur" className="text-xs text-muted-foreground">
        Porteur
      </label>
      <select
        id="filtre-porteur"
        value={actuel}
        onChange={(evenement) => changer(evenement.target.value)}
        className="h-8 rounded-lg border border-white/10 bg-champ px-2 text-sm outline-none transition-all focus:border-brand/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-brand/20 [&>option]:bg-popover [&>option]:text-foreground"
      >
        <option value="">Tous</option>
        {porteurs.map((porteur) => (
          <option key={porteur.id} value={porteur.id}>
            {porteur.name}
          </option>
        ))}
      </select>
    </div>
  )
}
