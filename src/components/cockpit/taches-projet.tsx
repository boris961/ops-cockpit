'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { CalendarClock, Pencil, Plus, X } from 'lucide-react'

import { creerTache, modifierTache, supprimerTache } from '@/lib/actions'
import { ETAT_INITIAL } from '@/lib/action-state'
import { PRIORITE_LABEL, initiales } from '@/lib/cockpit'
import { cn } from '@/lib/utils'
import {
  BoutonSoumettre,
  MessageEtat,
  classeChamp,
  classeChampCompact,
  classeLibelle,
} from '@/components/cockpit/formulaire'

export type TacheItem = {
  id: string
  titre: string
  status: string
  priorite: string | null
  /** Format yyyy-mm-dd pour <input type="date">, null si pas d'echeance. */
  echeance: string | null
  echeanceLisible: string | null
  enRetard: boolean
  responsableId: string | null
  responsableNom: string | null
}

/** Personnes assignables : directeur du projet + membres de l'equipe. */
export type Assignable = { id: string; name: string }

const STATUTS_TACHE = [
  { valeur: 'BACKLOG', libelle: 'Backlog' },
  { valeur: 'CETTE_SEMAINE', libelle: 'Cette semaine' },
  { valeur: 'EN_COURS', libelle: 'En cours' },
  { valeur: 'EN_REVIEW', libelle: 'En review' },
  { valeur: 'TERMINE', libelle: 'Terminé' },
]

const PRIORITES = ['P0', 'P1', 'P2', 'P3']

export function TachesProjet({
  projectId,
  taches,
  assignables,
  modifiable,
}: {
  projectId: string
  taches: TacheItem[]
  assignables: Assignable[]
  modifiable: boolean
}) {
  const terminees = taches.filter((t) => t.status === 'TERMINE').length

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {taches.length === 0
          ? 'Aucune tâche pour le moment.'
          : `${terminees} / ${taches.length} tâche${taches.length > 1 ? 's' : ''} terminée${terminees > 1 ? 's' : ''}`}
      </p>

      {taches.length > 0 ? (
        <ul className="divide-y divide-border border-y border-border">
          {taches.map((tache) => (
            <LigneTache
              key={tache.id}
              tache={tache}
              assignables={assignables}
              modifiable={modifiable}
            />
          ))}
        </ul>
      ) : null}

      {modifiable ? (
        <FormulaireNouvelleTache projectId={projectId} assignables={assignables} />
      ) : null}
    </div>
  )
}

function LigneTache({
  tache,
  assignables,
  modifiable,
}: {
  tache: TacheItem
  assignables: Assignable[]
  modifiable: boolean
}) {
  const [edition, setEdition] = useState(false)

  if (edition) {
    return (
      <li className="py-3">
        <FormulaireEditionTache
          tache={tache}
          assignables={assignables}
          onFerme={() => setEdition(false)}
        />
      </li>
    )
  }

  const termine = tache.status === 'TERMINE'

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
      <SelectStatutTache tache={tache} modifiable={modifiable} />

      <span
        className={cn(
          'min-w-0 flex-1 text-sm',
          termine && 'text-muted-foreground line-through decoration-border',
        )}
      >
        {tache.titre}
      </span>

      <SelectResponsable tache={tache} assignables={assignables} modifiable={modifiable} />

      {tache.priorite ? <PucePriorite priorite={tache.priorite} /> : null}

      {tache.echeanceLisible ? (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs whitespace-nowrap',
            tache.enRetard && !termine ? 'text-bad' : 'text-muted-foreground',
          )}
        >
          <CalendarClock className="size-3" strokeWidth={1.75} aria-hidden />
          {tache.echeanceLisible}
          {tache.enRetard && !termine ? <span className="sr-only">(en retard)</span> : null}
        </span>
      ) : null}

      {modifiable ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEdition(true)}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sand hover:text-foreground"
            aria-label={`Modifier la tâche ${tache.titre}`}
          >
            <Pencil className="size-3.5" strokeWidth={1.75} />
          </button>
          <FormulaireSuppressionTache tache={tache} />
        </div>
      ) : null}
    </li>
  )
}

/** Pastille d'initiales du responsable, ou tiret si la tache n'est assignee a personne. */
function PastilleResponsable({ nom }: { nom: string | null }) {
  return (
    <span
      title={nom ?? 'Non assignée'}
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ring-1',
        nom
          ? 'bg-brand/20 text-brand-clair ring-brand/30'
          : 'bg-white/[0.03] text-muted-foreground/60 ring-white/12 ring-dashed',
      )}
    >
      {nom ? initiales(nom) : '—'}
      <span className="sr-only">{nom ? `Responsable : ${nom}` : 'Non assignée'}</span>
    </span>
  )
}

function SelectResponsable({
  tache,
  assignables,
  modifiable,
}: {
  tache: TacheItem
  assignables: Assignable[]
  modifiable: boolean
}) {
  const [etat, action, enCours] = useActionState(modifierTache, ETAT_INITIAL)

  if (!modifiable) {
    return (
      <span className="flex shrink-0 items-center gap-2">
        <PastilleResponsable nom={tache.responsableNom} />
        <span className="text-xs text-muted-foreground">{tache.responsableNom ?? 'Non assignée'}</span>
      </span>
    )
  }

  // Un responsable sorti de l'equipe garde son option, sinon le select
  // afficherait « Non assignée » alors que la tache lui reste confiee.
  const options =
    tache.responsableId && !assignables.some((personne) => personne.id === tache.responsableId)
      ? [...assignables, { id: tache.responsableId, name: tache.responsableNom ?? 'Hors équipe' }]
      : assignables

  return (
    <form action={action} className="flex shrink-0 items-center gap-2">
      <input type="hidden" name="tacheId" value={tache.id} />
      <PastilleResponsable nom={tache.responsableNom} />
      <label className="sr-only" htmlFor={`responsable-${tache.id}`}>
        Responsable de la tâche {tache.titre}
      </label>
      <select
        id={`responsable-${tache.id}`}
        name="ownerId"
        key={tache.responsableId ?? 'aucun'}
        defaultValue={tache.responsableId ?? ''}
        disabled={enCours}
        onChange={(evenement) => evenement.currentTarget.form?.requestSubmit()}
        className={`${classeChampCompact} w-32`}
      >
        <option value="">Non assignée</option>
        {options.map((personne) => (
          <option key={personne.id} value={personne.id}>
            {personne.name}
          </option>
        ))}
      </select>
      <MessageEtat etat={etat} />
    </form>
  )
}

function SelectStatutTache({ tache, modifiable }: { tache: TacheItem; modifiable: boolean }) {
  const [etat, action, enCours] = useActionState(modifierTache, ETAT_INITIAL)

  if (!modifiable) {
    return (
      <span className="w-36 shrink-0 text-xs text-muted-foreground">
        {STATUTS_TACHE.find((s) => s.valeur === tache.status)?.libelle ?? tache.status}
      </span>
    )
  }

  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="tacheId" value={tache.id} />
      <label className="sr-only" htmlFor={`statut-${tache.id}`}>
        Statut de la tâche {tache.titre}
      </label>
      <select
        id={`statut-${tache.id}`}
        name="status"
        key={tache.status}
        defaultValue={tache.status}
        disabled={enCours}
        onChange={(evenement) => evenement.currentTarget.form?.requestSubmit()}
        className="h-7 w-36 rounded-lg border border-border bg-background px-2 text-xs outline-none transition-colors focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:opacity-60"
      >
        {STATUTS_TACHE.map((statut) => (
          <option key={statut.valeur} value={statut.valeur}>
            {statut.libelle}
          </option>
        ))}
      </select>
      <MessageEtat etat={etat} />
    </form>
  )
}

function FormulaireSuppressionTache({ tache }: { tache: TacheItem }) {
  const [etat, action] = useActionState(supprimerTache, ETAT_INITIAL)
  const [confirme, setConfirme] = useState(false)

  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="tacheId" value={tache.id} />
      {confirme ? (
        <>
          <BoutonSoumettre variante="danger" className="h-7">
            Supprimer
          </BoutonSoumettre>
          <button
            type="button"
            onClick={() => setConfirme(false)}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Annuler
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirme(true)}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-bad/5 hover:text-bad"
          aria-label={`Supprimer la tâche ${tache.titre}`}
        >
          <X className="size-3.5" strokeWidth={1.75} />
        </button>
      )}
      <MessageEtat etat={etat} />
    </form>
  )
}

function FormulaireEditionTache({
  tache,
  assignables,
  onFerme,
}: {
  tache: TacheItem
  assignables: Assignable[]
  onFerme: () => void
}) {
  const [etat, action] = useActionState(modifierTache, ETAT_INITIAL)

  return (
    <form action={action} className="space-y-3 rounded-lg bg-white/[0.04] p-3 ring-1 ring-white/10">
      <input type="hidden" name="tacheId" value={tache.id} />

      <div className="space-y-1.5">
        <label htmlFor={`titre-${tache.id}`} className={classeLibelle}>
          Titre
        </label>
        <input
          id={`titre-${tache.id}`}
          name="titre"
          type="text"
          defaultValue={tache.titre}
          required
          className={classeChamp}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor={`edit-statut-${tache.id}`} className={classeLibelle}>
            Statut
          </label>
          <select
            id={`edit-statut-${tache.id}`}
            name="status"
            defaultValue={tache.status}
            className={classeChamp}
          >
            {STATUTS_TACHE.map((statut) => (
              <option key={statut.valeur} value={statut.valeur}>
                {statut.libelle}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`edit-priorite-${tache.id}`} className={classeLibelle}>
            Priorité
          </label>
          <select
            id={`edit-priorite-${tache.id}`}
            name="priorite"
            defaultValue={tache.priorite ?? ''}
            className={classeChamp}
          >
            <option value="">Aucune</option>
            {PRIORITES.map((priorite) => (
              <option key={priorite} value={priorite}>
                {PRIORITE_LABEL[priorite]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`edit-echeance-${tache.id}`} className={classeLibelle}>
            Échéance
          </label>
          <input
            id={`edit-echeance-${tache.id}`}
            name="echeance"
            type="date"
            defaultValue={tache.echeance ?? ''}
            className={classeChamp}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`edit-responsable-${tache.id}`} className={classeLibelle}>
          Responsable
        </label>
        <select
          id={`edit-responsable-${tache.id}`}
          name="ownerId"
          defaultValue={tache.responsableId ?? ''}
          className={classeChamp}
        >
          <option value="">Non assignée</option>
          {assignables.map((personne) => (
            <option key={personne.id} value={personne.id}>
              {personne.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <BoutonSoumettre>Enregistrer</BoutonSoumettre>
        <button
          type="button"
          onClick={onFerme}
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Fermer
        </button>
        <MessageEtat etat={etat} />
      </div>
    </form>
  )
}

function FormulaireNouvelleTache({
  projectId,
  assignables,
}: {
  projectId: string
  assignables: Assignable[]
}) {
  const [etat, action] = useActionState(creerTache, ETAT_INITIAL)
  const formulaire = useRef<HTMLFormElement>(null)

  // Chaque reponse de l'action est un nouvel objet : le formulaire se vide
  // apres chaque creation reussie, pas seulement la premiere.
  useEffect(() => {
    if (etat.ok) formulaire.current?.reset()
  }, [etat])

  return (
    <form
      ref={formulaire}
      action={action}
      className="space-y-3 rounded-xl border border-dashed border-border p-3"
    >
      <input type="hidden" name="projectId" value={projectId} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1 space-y-1.5">
          <label htmlFor={`nouvelle-tache-${projectId}`} className={classeLibelle}>
            Nouvelle tâche
          </label>
          <input
            id={`nouvelle-tache-${projectId}`}
            name="titre"
            type="text"
            required
            placeholder="Ex. Préparer la recette du module 2"
            className={classeChamp}
          />
        </div>

        <div className="w-36 space-y-1.5">
          <label htmlFor={`nouvelle-priorite-${projectId}`} className={classeLibelle}>
            Priorité
          </label>
          <select
            id={`nouvelle-priorite-${projectId}`}
            name="priorite"
            defaultValue=""
            className={classeChamp}
          >
            <option value="">Aucune</option>
            {PRIORITES.map((priorite) => (
              <option key={priorite} value={priorite}>
                {PRIORITE_LABEL[priorite]}
              </option>
            ))}
          </select>
        </div>

        <div className="w-40 space-y-1.5">
          <label htmlFor={`nouvelle-echeance-${projectId}`} className={classeLibelle}>
            Échéance
          </label>
          <input
            id={`nouvelle-echeance-${projectId}`}
            name="echeance"
            type="date"
            className={classeChamp}
          />
        </div>

        <div className="w-44 space-y-1.5">
          <label htmlFor={`nouvelle-responsable-${projectId}`} className={classeLibelle}>
            Responsable
          </label>
          <select
            id={`nouvelle-responsable-${projectId}`}
            name="ownerId"
            defaultValue=""
            className={classeChamp}
          >
            <option value="">Non assignée</option>
            {assignables.map((personne) => (
              <option key={personne.id} value={personne.id}>
                {personne.name}
              </option>
            ))}
          </select>
        </div>

        <BoutonSoumettre>
          <Plus className="size-3.5" strokeWidth={2} aria-hidden />
          Ajouter
        </BoutonSoumettre>
      </div>

      <MessageEtat etat={etat} />
    </form>
  )
}

function PucePriorite({ priorite }: { priorite: string }) {
  const couleur =
    priorite === 'P0' ? 'text-bad' : priorite === 'P1' ? 'text-warn' : 'text-muted-foreground'
  return (
    <span
      title={PRIORITE_LABEL[priorite] ?? priorite}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium',
        couleur,
      )}
    >
      {priorite}
    </span>
  )
}
