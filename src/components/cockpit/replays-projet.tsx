'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'

import { creerReplay, modifierReplay, supprimerReplay } from '@/lib/actions'
import { ETAT_INITIAL } from '@/lib/action-state'
import {
  BoutonSoumettre,
  MessageEtat,
  classeChamp,
  classeLibelle,
} from '@/components/cockpit/formulaire'

export type ReplayItem = {
  id: string
  titre: string
  url: string
  /** Format yyyy-mm-dd pour <input type="date">. */
  date: string | null
  dateLisible: string | null
}

export function ReplaysProjet({
  projectId,
  replays,
}: {
  projectId: string
  replays: ReplayItem[]
}) {
  return (
    <div className="space-y-5">
      {replays.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun replay enregistré.</p>
      ) : (
        <ul className="space-y-2">
          {replays.map((replay) => (
            <LigneReplay key={replay.id} replay={replay} />
          ))}
        </ul>
      )}

      <FormulaireNouveauReplay projectId={projectId} />
    </div>
  )
}

function LigneReplay({ replay }: { replay: ReplayItem }) {
  const [edition, setEdition] = useState(false)

  if (edition) {
    return (
      <li className="rounded-lg border border-border bg-card p-3">
        <FormulaireEditionReplay replay={replay} onFerme={() => setEdition(false)} />
      </li>
    )
  }

  return (
    <li className="group flex items-start gap-2 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <a
          href={replay.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-start gap-1.5 text-sm leading-snug font-medium underline-offset-4 hover:text-brand hover:underline"
        >
          <span className="min-w-0 break-words">{replay.titre}</span>
          <ExternalLink
            className="mt-0.5 size-3 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="sr-only">(ouvre dans un nouvel onglet)</span>
        </a>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {replay.dateLisible ?? 'Sans date'}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEdition(true)}
          aria-label={`Modifier le replay ${replay.titre}`}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sand hover:text-foreground"
        >
          <Pencil className="size-3.5" strokeWidth={1.75} />
        </button>
        <FormulaireSuppressionReplay replay={replay} />
      </div>
    </li>
  )
}

function FormulaireSuppressionReplay({ replay }: { replay: ReplayItem }) {
  const [etat, action] = useActionState(supprimerReplay, ETAT_INITIAL)
  const [confirme, setConfirme] = useState(false)

  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="replayId" value={replay.id} />
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
          aria-label={`Supprimer le replay ${replay.titre}`}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-bad/10 hover:text-bad"
        >
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </button>
      )}
      <MessageEtat etat={etat} />
    </form>
  )
}

function FormulaireEditionReplay({
  replay,
  onFerme,
}: {
  replay: ReplayItem
  onFerme: () => void
}) {
  const [etat, action] = useActionState(modifierReplay, ETAT_INITIAL)

  useEffect(() => {
    if (etat.ok) onFerme()
  }, [etat, onFerme])

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="replayId" value={replay.id} />

      <div className="space-y-1.5">
        <label htmlFor={`replay-titre-${replay.id}`} className={classeLibelle}>
          Titre
        </label>
        <input
          id={`replay-titre-${replay.id}`}
          name="titre"
          type="text"
          defaultValue={replay.titre}
          required
          className={classeChamp}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`replay-url-${replay.id}`} className={classeLibelle}>
          Lien
        </label>
        <input
          id={`replay-url-${replay.id}`}
          name="url"
          type="url"
          defaultValue={replay.url}
          required
          className={classeChamp}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`replay-date-${replay.id}`} className={classeLibelle}>
          Date du call
        </label>
        <input
          id={`replay-date-${replay.id}`}
          name="date"
          type="date"
          defaultValue={replay.date ?? ''}
          className={classeChamp}
        />
      </div>

      <div className="flex items-center gap-3">
        <BoutonSoumettre>Enregistrer</BoutonSoumettre>
        <button
          type="button"
          onClick={onFerme}
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Annuler
        </button>
        <MessageEtat etat={etat} />
      </div>
    </form>
  )
}

function FormulaireNouveauReplay({ projectId }: { projectId: string }) {
  const [etat, action] = useActionState(creerReplay, ETAT_INITIAL)
  const formulaire = useRef<HTMLFormElement>(null)

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

      <div className="space-y-1.5">
        <label htmlFor={`nouveau-replay-titre-${projectId}`} className={classeLibelle}>
          Nouveau replay
        </label>
        <input
          id={`nouveau-replay-titre-${projectId}`}
          name="titre"
          type="text"
          required
          placeholder="Ex. Point hebdo du 12 mars"
          className={classeChamp}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`nouveau-replay-url-${projectId}`} className={classeLibelle}>
          Lien
        </label>
        <input
          id={`nouveau-replay-url-${projectId}`}
          name="url"
          type="url"
          required
          placeholder="https://…"
          className={classeChamp}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`nouveau-replay-date-${projectId}`} className={classeLibelle}>
          Date du call (facultatif)
        </label>
        <input
          id={`nouveau-replay-date-${projectId}`}
          name="date"
          type="date"
          className={classeChamp}
        />
      </div>

      <BoutonSoumettre>
        <Plus className="size-3.5" strokeWidth={2} aria-hidden />
        Ajouter
      </BoutonSoumettre>

      <MessageEtat etat={etat} />
    </form>
  )
}
