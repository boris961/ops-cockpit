'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { modifierTache } from '@/lib/actions'
import { ETAT_INITIAL } from '@/lib/action-state'
import { MessageEtat } from '@/components/cockpit/formulaire'

const STATUTS_TACHE = [
  { valeur: 'BACKLOG', libelle: 'Backlog' },
  { valeur: 'CETTE_SEMAINE', libelle: 'Cette semaine' },
  { valeur: 'EN_COURS', libelle: 'En cours' },
  { valeur: 'EN_REVIEW', libelle: 'En review' },
  { valeur: 'TERMINE', libelle: 'Terminé' },
]

/**
 * Changement de statut en un geste depuis la liste globale des taches.
 * Meme Server Action que la fiche projet (modifierTache, journalisee) ; la
 * page etant rendue cote serveur, on rafraichit la route apres succes pour
 * que la ligne, les compteurs d'onglets et le filtre suivent.
 */
export function StatutTacheRapide({
  tacheId,
  statut,
  titre,
}: {
  tacheId: string
  statut: string
  titre: string
}) {
  const router = useRouter()
  const [etat, action, enCours] = useActionState(modifierTache, ETAT_INITIAL)

  useEffect(() => {
    if (etat.ok) router.refresh()
  }, [etat, router])

  return (
    <form action={action}>
      <input type="hidden" name="tacheId" value={tacheId} />
      <label className="sr-only" htmlFor={`statut-rapide-${tacheId}`}>
        Statut de la tâche {titre}
      </label>
      <select
        id={`statut-rapide-${tacheId}`}
        name="status"
        key={statut}
        defaultValue={statut}
        disabled={enCours}
        onChange={(evenement) => evenement.currentTarget.form?.requestSubmit()}
        className="h-7 w-36 rounded-lg border border-border bg-background px-2 text-xs outline-none transition-colors focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:opacity-60"
      >
        {STATUTS_TACHE.map((s) => (
          <option key={s.valeur} value={s.valeur}>
            {s.libelle}
          </option>
        ))}
      </select>
      <MessageEtat etat={etat} />
    </form>
  )
}
