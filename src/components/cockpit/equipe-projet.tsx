'use client'

import { useActionState } from 'react'
import { Plus, UserMinus } from 'lucide-react'

import { ajouterMembre, retirerMembre } from '@/lib/actions'
import { ETAT_INITIAL } from '@/lib/action-state'
import { ROLE_LABEL, initiales } from '@/lib/cockpit'
import {
  BoutonSoumettre,
  MessageEtat,
  classeChamp,
  classeLibelle,
} from '@/components/cockpit/formulaire'

export type MembreItem = { id: string; name: string; role: string }

/**
 * Equipe du projet : le directeur y figure d'office, les membres ajoutes ici
 * gagnent l'acces en lecture au projet.
 */
export function EquipeProjet({
  projectId,
  directeur,
  membres,
  candidats,
  modifiable,
}: {
  projectId: string
  directeur: MembreItem
  membres: MembreItem[]
  candidats: MembreItem[]
  modifiable: boolean
}) {
  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        <li className="flex items-center gap-3">
          <Pastille nom={directeur.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{directeur.name}</p>
            <p className="text-xs text-muted-foreground">
              Directeur · {ROLE_LABEL[directeur.role] ?? directeur.role}
            </p>
          </div>
        </li>

        {membres.map((membre) => (
          <li key={membre.id} className="flex items-center gap-3">
            <Pastille nom={membre.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{membre.name}</p>
              <p className="text-xs text-muted-foreground">
                Membre · {ROLE_LABEL[membre.role] ?? membre.role}
              </p>
            </div>
            {modifiable ? <FormulaireRetrait projectId={projectId} membre={membre} /> : null}
          </li>
        ))}
      </ul>

      {membres.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aucun membre supplémentaire — seul le directeur et les profils COO / HEAD voient ce
          projet.
        </p>
      ) : null}

      {modifiable && candidats.length > 0 ? (
        <FormulaireAjout projectId={projectId} candidats={candidats} />
      ) : null}
    </div>
  )
}

function Pastille({ nom }: { nom: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sand text-[11px] font-medium ring-1 ring-white/12">
      {initiales(nom)}
    </span>
  )
}

function FormulaireAjout({
  projectId,
  candidats,
}: {
  projectId: string
  candidats: MembreItem[]
}) {
  const [etat, action] = useActionState(ajouterMembre, ETAT_INITIAL)

  return (
    <form action={action} className="space-y-2 border-t border-border pt-4">
      <input type="hidden" name="projectId" value={projectId} />
      <label htmlFor={`membre-${projectId}`} className={classeLibelle}>
        Ajouter un membre
      </label>
      <div className="flex items-center gap-2">
        <select id={`membre-${projectId}`} name="membreId" className={classeChamp} required>
          {candidats.map((candidat) => (
            <option key={candidat.id} value={candidat.id}>
              {candidat.name} · {ROLE_LABEL[candidat.role] ?? candidat.role}
            </option>
          ))}
        </select>
        <BoutonSoumettre>
          <Plus className="size-3.5" strokeWidth={2} aria-hidden />
          Ajouter
        </BoutonSoumettre>
      </div>
      <MessageEtat etat={etat} />
    </form>
  )
}

function FormulaireRetrait({
  projectId,
  membre,
}: {
  projectId: string
  membre: MembreItem
}) {
  const [etat, action] = useActionState(retirerMembre, ETAT_INITIAL)

  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="membreId" value={membre.id} />
      <button
        type="submit"
        aria-label={`Retirer ${membre.name} de l'équipe`}
        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-bad/10 hover:text-bad"
      >
        <UserMinus className="size-3.5" strokeWidth={1.75} />
      </button>
      <MessageEtat etat={etat} />
    </form>
  )
}
