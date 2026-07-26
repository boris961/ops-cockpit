'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Check, Plus } from 'lucide-react'

import { creerBlocage, resoudreBlocage } from '@/lib/actions'
import { ETAT_INITIAL } from '@/lib/action-state'
import { PRIORITE_LABEL } from '@/lib/cockpit'
import { cn } from '@/lib/utils'
import {
  BoutonSoumettre,
  MessageEtat,
  classeChamp,
  classeLibelle,
} from '@/components/cockpit/formulaire'

export type BlocageItem = {
  id: string
  titre: string
  description: string | null
  priorite: string
  status: string
  auteur: string
  cree: string
  resolu: string | null
}

const PRIORITES = ['P0', 'P1', 'P2', 'P3']

export function BlocagesProjet({
  projectId,
  blocages,
  modifiable,
}: {
  projectId: string
  blocages: BlocageItem[]
  modifiable: boolean
}) {
  const ouverts = blocages.filter((b) => b.status !== 'CLOTURE')
  const clotures = blocages.filter((b) => b.status === 'CLOTURE')

  return (
    <div className="space-y-5">
      {blocages.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun blocage signalé.</p>
      ) : (
        <ul className="space-y-3">
          {[...ouverts, ...clotures].map((blocage) => (
            <li
              key={blocage.id}
              className={cn(
                'rounded-lg border border-border p-3',
                blocage.status === 'CLOTURE' && 'bg-sand',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm leading-snug font-medium',
                      blocage.status === 'CLOTURE' && 'text-muted-foreground',
                    )}
                  >
                    {blocage.titre}
                  </p>
                  {blocage.description ? (
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">
                      {blocage.description}
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    <span
                      className={
                        blocage.priorite === 'P0'
                          ? 'text-bad'
                          : blocage.priorite === 'P1'
                            ? 'text-warn'
                            : undefined
                      }
                    >
                      {PRIORITE_LABEL[blocage.priorite] ?? blocage.priorite}
                    </span>
                    <span aria-hidden> · </span>
                    signalé par {blocage.auteur}, {blocage.cree}
                  </p>
                </div>

                {blocage.status === 'CLOTURE' ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ok">
                    <Check className="size-3.5" aria-hidden />
                    Résolu {blocage.resolu}
                  </span>
                ) : modifiable ? (
                  <FormulaireResolution blocageId={blocage.id} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Signaler un blocage est ouvert a tous les utilisateurs connectes. */}
      <FormulaireNouveauBlocage projectId={projectId} />
    </div>
  )
}

function FormulaireResolution({ blocageId }: { blocageId: string }) {
  const [etat, action] = useActionState(resoudreBlocage, ETAT_INITIAL)

  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="blocageId" value={blocageId} />
      <BoutonSoumettre variante="discret">
        <Check className="size-3.5" strokeWidth={2} aria-hidden />
        Résoudre
      </BoutonSoumettre>
      <MessageEtat etat={etat} />
    </form>
  )
}

function FormulaireNouveauBlocage({ projectId }: { projectId: string }) {
  const [etat, action] = useActionState(creerBlocage, ETAT_INITIAL)
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

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1 space-y-1.5">
          <label htmlFor={`nouveau-blocage-${projectId}`} className={classeLibelle}>
            Signaler un blocage
          </label>
          <input
            id={`nouveau-blocage-${projectId}`}
            name="titre"
            type="text"
            required
            placeholder="Ex. Intégration API paiement bloquée"
            className={classeChamp}
          />
        </div>

        <div className="w-36 space-y-1.5">
          <label htmlFor={`blocage-priorite-${projectId}`} className={classeLibelle}>
            Priorité
          </label>
          <select
            id={`blocage-priorite-${projectId}`}
            name="priorite"
            defaultValue="P2"
            className={classeChamp}
          >
            {PRIORITES.map((priorite) => (
              <option key={priorite} value={priorite}>
                {PRIORITE_LABEL[priorite]}
              </option>
            ))}
          </select>
        </div>

        <BoutonSoumettre>
          <Plus className="size-3.5" strokeWidth={2} aria-hidden />
          Signaler
        </BoutonSoumettre>
      </div>

      <textarea
        name="description"
        rows={2}
        placeholder="Contexte, impact, ce qui est attendu (facultatif)"
        className={`${classeChamp} resize-y`}
      />

      <MessageEtat etat={etat} />
    </form>
  )
}
