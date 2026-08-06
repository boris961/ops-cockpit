'use client'

import { useActionState, useState } from 'react'
import { Check } from 'lucide-react'

import { modifierProjet } from '@/lib/actions'
import { ETAT_INITIAL } from '@/lib/action-state'
import { DEPARTEMENTS, SANTE_LABEL, STATUTS, STATUT_LABEL } from '@/lib/cockpit'
import { BadgesDepartements } from '@/components/cockpit/indicateurs'
import {
  BoutonSoumettre,
  MessageEtat,
  classeChamp,
  classeLibelle,
} from '@/components/cockpit/formulaire'

type Option = { valeur: string; libelle: string }

export type ValeursProjet = {
  description: string
  ownerId: string
  status: string
  sante: string
  prochainJalon: string
  departements: string[]
}

const OPTIONS_STATUT: Option[] = STATUTS.map((s) => ({ valeur: s, libelle: STATUT_LABEL[s] }))
const OPTIONS_SANTE: Option[] = ['VERT', 'ORANGE', 'ROUGE'].map((s) => ({
  valeur: s,
  libelle: SANTE_LABEL[s],
}))

export function FicheProjet({
  projectId,
  valeurs,
  utilisateurs,
  modifiable,
}: {
  projectId: string
  valeurs: ValeursProjet
  utilisateurs: Array<{ id: string; name: string; role: string }>
  modifiable: boolean
}) {
  if (!modifiable) {
    return <FicheLecture valeurs={valeurs} utilisateurs={utilisateurs} />
  }

  return (
    <div className="space-y-5">
      <ChampSelect
        projectId={projectId}
        nom="ownerId"
        libelle="Directeur"
        valeur={valeurs.ownerId}
        options={utilisateurs.map((u) => ({ valeur: u.id, libelle: `${u.name} · ${u.role}` }))}
      />
      <ChampSelect
        projectId={projectId}
        nom="status"
        libelle="Statut"
        valeur={valeurs.status}
        // Un projet archive garde son option pour rester lisible — et pouvoir
        // etre sorti de l'archive en choisissant un autre statut.
        options={
          valeurs.status === 'ARCHIVE'
            ? [...OPTIONS_STATUT, { valeur: 'ARCHIVE', libelle: STATUT_LABEL.ARCHIVE }]
            : OPTIONS_STATUT
        }
      />
      <ChampSelect
        projectId={projectId}
        nom="sante"
        libelle="Santé"
        valeur={valeurs.sante}
        options={OPTIONS_SANTE}
      />
      <ChampDepartements projectId={projectId} valeurs={valeurs.departements} />
      <div>
        <p className={classeLibelle}>Prochain jalon</p>
        <p className="mt-1 text-sm">{valeurs.prochainJalon || '—'}</p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          Automatique : la prochaine tâche non terminée, par échéance.
        </p>
      </div>
      <ChampTexte
        projectId={projectId}
        nom="description"
        libelle="Description"
        valeur={valeurs.description}
        placeholder="À quoi sert cette mission ?"
        multiligne
      />
    </div>
  )
}

function FicheLecture({
  valeurs,
  utilisateurs,
}: {
  valeurs: ValeursProjet
  utilisateurs: Array<{ id: string; name: string; role: string }>
}) {
  const directeur = utilisateurs.find((u) => u.id === valeurs.ownerId)

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-sand px-3 py-2 text-xs leading-snug text-muted-foreground">
        Lecture seule — seul le directeur du projet ou un profil COO / HEAD peut modifier cette
        fiche.
      </p>

      {[
        ['Directeur', directeur?.name ?? '—'],
        ['Statut', STATUT_LABEL[valeurs.status] ?? valeurs.status],
        ['Santé', SANTE_LABEL[valeurs.sante] ?? valeurs.sante],
        ['Prochain jalon', valeurs.prochainJalon || '—'],
        ['Description', valeurs.description || '—'],
      ].map(([libelle, valeur]) => (
        <div key={libelle}>
          <p className={classeLibelle}>{libelle}</p>
          <p className="mt-1 text-sm">{valeur}</p>
        </div>
      ))}

      <div>
        <p className={classeLibelle}>Départements</p>
        {valeurs.departements.length ? (
          <BadgesDepartements departements={valeurs.departements} className="mt-1.5" />
        ) : (
          <p className="mt-1 text-sm">—</p>
        )}
      </div>
    </div>
  )
}

/** Select enregistre des le changement. */
function ChampSelect({
  projectId,
  nom,
  libelle,
  valeur,
  options,
}: {
  projectId: string
  nom: string
  libelle: string
  valeur: string
  options: Option[]
}) {
  const [etat, action, enCours] = useActionState(modifierProjet, ETAT_INITIAL)

  return (
    <form action={action} className="space-y-1.5">
      <input type="hidden" name="projectId" value={projectId} />
      <label htmlFor={`${nom}-${projectId}`} className={classeLibelle}>
        {libelle}
      </label>
      <select
        id={`${nom}-${projectId}`}
        name={nom}
        // La cle resynchronise le select quand le serveur renvoie une autre valeur.
        key={valeur}
        defaultValue={valeur}
        disabled={enCours}
        onChange={(evenement) => evenement.currentTarget.form?.requestSubmit()}
        className={classeChamp}
      >
        {options.map((option) => (
          <option key={option.valeur} value={option.valeur}>
            {option.libelle}
          </option>
        ))}
      </select>
      <MessageEtat etat={etat} />
    </form>
  )
}

/** Multi-selection des departements : chaque case enregistre immediatement. */
function ChampDepartements({
  projectId,
  valeurs,
}: {
  projectId: string
  valeurs: string[]
}) {
  const [etat, action, enCours] = useActionState(modifierProjet, ETAT_INITIAL)

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="projectId" value={projectId} />
      {/* Sans ce marqueur, décocher la dernière case n'enverrait aucune clé. */}
      <input type="hidden" name="departementsPresent" value="1" />

      <fieldset disabled={enCours} className="space-y-2">
        <legend className={classeLibelle}>Départements</legend>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {DEPARTEMENTS.map((departement) => {
            const coche = valeurs.includes(departement)
            return (
              <label
                key={departement}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  coche
                    ? 'border-brand/40 bg-brand/10 font-medium text-brand'
                    : 'border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground'
                }`}
              >
                <input
                  type="checkbox"
                  name="departements"
                  value={departement}
                  defaultChecked={coche}
                  key={`${departement}-${coche}`}
                  onChange={(evenement) => evenement.currentTarget.form?.requestSubmit()}
                  className="sr-only"
                />
                {coche ? <Check className="size-3" strokeWidth={2.5} aria-hidden /> : null}
                {departement}
              </label>
            )
          })}
        </div>
      </fieldset>

      <MessageEtat etat={etat} />
    </form>
  )
}

/** Champ texte (ou zone de texte) : le bouton n'apparait qu'une fois modifie. */
function ChampTexte({
  projectId,
  nom,
  libelle,
  valeur,
  placeholder,
  multiligne = false,
}: {
  projectId: string
  nom: string
  libelle: string
  valeur: string
  placeholder?: string
  multiligne?: boolean
}) {
  const [etat, action] = useActionState(modifierProjet, ETAT_INITIAL)
  const [saisie, setSaisie] = useState(valeur)
  const modifie = saisie !== valeur

  return (
    <form action={action} className="space-y-1.5">
      <input type="hidden" name="projectId" value={projectId} />
      <label htmlFor={`${nom}-${projectId}`} className={classeLibelle}>
        {libelle}
      </label>
      {multiligne ? (
        <textarea
          id={`${nom}-${projectId}`}
          name={nom}
          rows={4}
          value={saisie}
          placeholder={placeholder}
          onChange={(evenement) => setSaisie(evenement.target.value)}
          className={`${classeChamp} resize-y`}
        />
      ) : (
        <input
          id={`${nom}-${projectId}`}
          name={nom}
          type="text"
          value={saisie}
          placeholder={placeholder}
          onChange={(evenement) => setSaisie(evenement.target.value)}
          className={classeChamp}
        />
      )}
      <div className="flex min-h-8 items-center gap-3">
        {modifie ? (
          <>
            <BoutonSoumettre variante="discret">Enregistrer</BoutonSoumettre>
            <button
              type="button"
              onClick={() => setSaisie(valeur)}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Annuler
            </button>
          </>
        ) : etat.ok ? (
          <span className="inline-flex items-center gap-1 text-xs text-ok">
            <Check className="size-3.5" aria-hidden />
            Enregistré
          </span>
        ) : null}
        <MessageEtat etat={etat} />
      </div>
    </form>
  )
}
