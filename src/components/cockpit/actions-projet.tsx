'use client'

import { useActionState } from 'react'
import { Archive } from 'lucide-react'

import { archiverProjet, supprimerProjet } from '@/lib/actions'
import { ETAT_INITIAL } from '@/lib/action-state'
import {
  BoutonConfirmation,
  BoutonSoumettre,
  MessageEtat,
} from '@/components/cockpit/formulaire'

export function ActionsProjet({
  projectId,
  archive,
}: {
  projectId: string
  archive: boolean
}) {
  const [etatArchive, actionArchive] = useActionState(archiverProjet, ETAT_INITIAL)
  const [etatSuppression, actionSuppression] = useActionState(supprimerProjet, ETAT_INITIAL)

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {archive ? (
          <span className="inline-flex h-8 items-center rounded-lg bg-sand px-3 text-xs text-muted-foreground">
            Projet archivé
          </span>
        ) : (
          <form action={actionArchive}>
            <input type="hidden" name="projectId" value={projectId} />
            <BoutonSoumettre variante="discret">
              <Archive className="size-3.5" strokeWidth={1.75} aria-hidden />
              Archiver
            </BoutonSoumettre>
          </form>
        )}

        <form action={actionSuppression}>
          <input type="hidden" name="projectId" value={projectId} />
          <BoutonConfirmation
            libelle="Supprimer"
            libelleConfirmation="Supprimer définitivement"
          />
        </form>
      </div>

      <MessageEtat etat={etatArchive} />
      <MessageEtat etat={etatSuppression} />
    </div>
  )
}
