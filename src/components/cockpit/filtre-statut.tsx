'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const STATUTS_FILTRABLES = [
  { valeur: 'BACKLOG', libelle: 'Backlog' },
  { valeur: 'CETTE_SEMAINE', libelle: 'Cette semaine' },
  { valeur: 'EN_COURS', libelle: 'En cours' },
  { valeur: 'EN_REVIEW', libelle: 'En review' },
] as const

/**
 * Filtre par statut de tache — vue « A venir » uniquement, les terminees
 * ayant leur propre onglet. Se combine aux autres parametres d'URL.
 */
export function FiltreStatut() {
  const router = useRouter()
  const pathname = usePathname()
  const parametres = useSearchParams()
  const actuel = parametres.get('statut') ?? ''

  function changer(valeur: string) {
    const suivants = new URLSearchParams(parametres.toString())
    if (valeur) suivants.set('statut', valeur)
    else suivants.delete('statut')
    const requete = suivants.toString()
    router.push(requete ? `${pathname}?${requete}` : pathname)
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="filtre-statut" className="text-xs text-muted-foreground">
        Statut
      </label>
      <select
        id="filtre-statut"
        value={actuel}
        onChange={(evenement) => changer(evenement.target.value)}
        className="h-8 rounded-lg border border-white/10 bg-champ px-2 text-sm outline-none transition-all focus:border-brand/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-brand/20 [&>option]:bg-popover [&>option]:text-foreground"
      >
        <option value="">Tous</option>
        {STATUTS_FILTRABLES.map((statut) => (
          <option key={statut.valeur} value={statut.valeur}>
            {statut.libelle}
          </option>
        ))}
      </select>
    </div>
  )
}
