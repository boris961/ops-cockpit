'use client'

import { useActionState, useState } from 'react'
import { Plus, X } from 'lucide-react'

import { creerProjet } from '@/lib/actions'
import { ETAT_INITIAL } from '@/lib/action-state'
import { STATUTS, STATUT_LABEL } from '@/lib/cockpit'
import { Card } from '@/components/ui/card'
import {
  BoutonSoumettre,
  MessageEtat,
  classeChamp,
  classeLibelle,
} from '@/components/cockpit/formulaire'

/** Statuts proposes a la creation : un projet ne nait pas archive. */
const STATUTS_INITIAUX = STATUTS.filter((statut) => statut !== 'TERMINE')

export function NouveauProjet({
  utilisateurs,
  utilisateurCourantId,
}: {
  utilisateurs: Array<{ id: string; name: string; role: string }>
  utilisateurCourantId: string | null
}) {
  const [ouvert, setOuvert] = useState(false)
  const [etat, action] = useActionState(creerProjet, ETAT_INITIAL)

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="violet-plein inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition-all"
      >
        <Plus className="size-4" strokeWidth={2} aria-hidden />
        Nouveau projet
      </button>
    )
  }

  return (
    <Card className="verre w-full rounded-xl ring-1 ring-white/10 sm:w-[34rem]">
      <form action={action} className="space-y-4 px-5 py-1">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Nouveau projet</h2>
          <button
            type="button"
            onClick={() => setOuvert(false)}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sand hover:text-foreground"
            aria-label="Fermer le formulaire"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="nouveau-nom" className={classeLibelle}>
            Nom
          </label>
          <input
            id="nouveau-nom"
            name="nom"
            type="text"
            required
            autoFocus
            placeholder="Ex. Déploiement CRM"
            className={classeChamp}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="nouveau-description" className={classeLibelle}>
            Description
          </label>
          <textarea
            id="nouveau-description"
            name="description"
            rows={3}
            placeholder="Objectif de la mission, périmètre, livrable attendu"
            className={`${classeChamp} resize-y`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="nouveau-directeur" className={classeLibelle}>
              Directeur
            </label>
            <select
              id="nouveau-directeur"
              name="ownerId"
              defaultValue={utilisateurCourantId ?? utilisateurs[0]?.id ?? ''}
              className={classeChamp}
            >
              {utilisateurs.map((utilisateur) => (
                <option key={utilisateur.id} value={utilisateur.id}>
                  {utilisateur.name} · {utilisateur.role}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="nouveau-statut" className={classeLibelle}>
              Statut initial
            </label>
            <select
              id="nouveau-statut"
              name="status"
              defaultValue="CADRAGE"
              className={classeChamp}
            >
              {STATUTS_INITIAUX.map((statut) => (
                <option key={statut} value={statut}>
                  {STATUT_LABEL[statut]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <BoutonSoumettre>Créer le projet</BoutonSoumettre>
          <span className="text-xs text-muted-foreground">
            Vous serez redirigé vers la fiche du projet.
          </span>
        </div>

        <MessageEtat etat={etat} />
      </form>
    </Card>
  )
}
