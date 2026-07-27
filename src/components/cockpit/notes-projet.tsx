'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'

import { creerNote, modifierNote, supprimerNote } from '@/lib/actions'
import { ETAT_INITIAL } from '@/lib/action-state'
import { initiales } from '@/lib/cockpit'
import { cn } from '@/lib/utils'
import {
  BoutonSoumettre,
  MessageEtat,
  classeChamp,
  classeLibelle,
} from '@/components/cockpit/formulaire'

export type NoteItem = {
  id: string
  contenu: string
  publiee: boolean
  auteur: string
  date: string
  modifiee: string | null
}

export function NotesProjet({
  projectId,
  notes,
}: {
  projectId: string
  notes: NoteItem[]
}) {
  const publiees = notes.filter((note) => note.publiee).length

  return (
    <div className="space-y-5">
      <FormulaireNouvelleNote projectId={projectId} />

      <p className="text-xs text-muted-foreground">
        {notes.length === 0
          ? 'Aucune note pour le moment.'
          : `${notes.length} note${notes.length > 1 ? 's' : ''} · ${publiees} publiée${publiees > 1 ? 's' : ''}`}
      </p>

      <ul className="space-y-3">
        {notes.map((note) => (
          <LigneNote key={note.id} note={note} />
        ))}
      </ul>
    </div>
  )
}

function LigneNote({ note }: { note: NoteItem }) {
  const [edition, setEdition] = useState(false)

  return (
    <li
      className={cn(
        // Strates internes : la carte parente est déjà opaque, ces voiles
        // blancs ne laissent donc rien passer du décor.
        'rounded-xl border p-4',
        note.publiee
          ? 'border-white/12 bg-white/[0.05]'
          : 'border-dashed border-white/12 bg-white/[0.02]',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sand text-[10px] font-semibold ring-1 ring-white/12">
            {initiales(note.auteur)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{note.auteur}</p>
            <p className="text-xs text-muted-foreground">
              {note.date}
              {note.modifiee ? ` · modifiée ${note.modifiee}` : null}
            </p>
          </div>
        </div>

        <BadgePublication publiee={note.publiee} />
      </div>

      {edition ? (
        <FormulaireEditionNote note={note} onFerme={() => setEdition(false)} />
      ) : (
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{note.contenu}</p>
      )}

      {!edition ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <FormulairePublication note={note} />

          <button
            type="button"
            onClick={() => setEdition(true)}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium transition-colors hover:border-foreground/40 hover:bg-sand"
          >
            <Pencil className="size-3" strokeWidth={1.75} aria-hidden />
            Éditer
          </button>

          <FormulaireSuppressionNote note={note} />
        </div>
      ) : null}
    </li>
  )
}

function BadgePublication({ publiee }: { publiee: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        publiee ? 'bg-ok/10 text-ok' : 'bg-sand text-muted-foreground',
      )}
    >
      <span
        aria-hidden
        className={cn('size-1.5 rounded-full', publiee ? 'bg-ok' : 'bg-muted-foreground')}
      />
      {publiee ? 'Publiée' : 'Brouillon'}
    </span>
  )
}

function FormulairePublication({ note }: { note: NoteItem }) {
  const [etat, action] = useActionState(modifierNote, ETAT_INITIAL)

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="noteId" value={note.id} />
      <input type="hidden" name="publiee" value={note.publiee ? '0' : '1'} />
      <BoutonSoumettre variante={note.publiee ? 'discret' : 'primaire'} className="h-7">
        {note.publiee ? (
          <>
            <EyeOff className="size-3" strokeWidth={1.75} aria-hidden />
            Repasser en brouillon
          </>
        ) : (
          <>
            <Eye className="size-3" strokeWidth={1.75} aria-hidden />
            Publier
          </>
        )}
      </BoutonSoumettre>
      <MessageEtat etat={etat} />
    </form>
  )
}

function FormulaireSuppressionNote({ note }: { note: NoteItem }) {
  const [etat, action] = useActionState(supprimerNote, ETAT_INITIAL)
  const [confirme, setConfirme] = useState(false)

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="noteId" value={note.id} />
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
          className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-bad/40 hover:bg-bad/5 hover:text-bad"
        >
          <Trash2 className="size-3" strokeWidth={1.75} aria-hidden />
          Supprimer
        </button>
      )}
      <MessageEtat etat={etat} />
    </form>
  )
}

function FormulaireEditionNote({ note, onFerme }: { note: NoteItem; onFerme: () => void }) {
  const [etat, action] = useActionState(modifierNote, ETAT_INITIAL)

  // La note revient en lecture des que le serveur a confirme l'enregistrement.
  useEffect(() => {
    if (etat.ok) onFerme()
  }, [etat, onFerme])

  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="noteId" value={note.id} />
      <label className="sr-only" htmlFor={`note-${note.id}`}>
        Contenu de la note
      </label>
      <textarea
        id={`note-${note.id}`}
        name="contenu"
        rows={5}
        defaultValue={note.contenu}
        required
        className={`${classeChamp} resize-y`}
      />
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

function FormulaireNouvelleNote({ projectId }: { projectId: string }) {
  const [etat, action] = useActionState(creerNote, ETAT_INITIAL)
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
        <label htmlFor={`nouvelle-note-${projectId}`} className={classeLibelle}>
          Nouvelle note
        </label>
        <textarea
          id={`nouvelle-note-${projectId}`}
          name="contenu"
          rows={4}
          required
          placeholder="Ce qui s'est dit, ce qui a été décidé, ce qui reste à trancher…"
          className={`${classeChamp} resize-y`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Deux boutons, deux valeurs de `publiee` : le brouillon reste le defaut. */}
        <BoutonSoumettre variante="discret" name="publiee" value="0">
          Enregistrer en brouillon
        </BoutonSoumettre>
        <BoutonSoumettre name="publiee" value="1">
          Publier
        </BoutonSoumettre>
        <MessageEtat etat={etat} />
      </div>
    </form>
  )
}
