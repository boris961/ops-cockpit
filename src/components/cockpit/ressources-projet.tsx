'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import {
  ExternalLink,
  // Alias obligatoire : sans lui, l'icône écrase le type natif File du
  // navigateur, utilisé par « fichier instanceof File » dans le formulaire.
  File as FileIcon,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'

import { creerRessource, modifierRessource, supprimerRessource } from '@/lib/actions'
import { ETAT_INITIAL, type EtatAction } from '@/lib/action-state'
import {
  BoutonSoumettre,
  MessageEtat,
  classeChamp,
  classeLibelle,
} from '@/components/cockpit/formulaire'
import { cn } from '@/lib/utils'

export type RessourceItem = {
  id: string
  titre: string
  url: string
  type: 'LIEN' | 'FICHIER'
  nomFichier: string | null
  taille: number | null
  date: string
}

/** Meme plafond que cote serveur (route /api/blob/upload) : 50 Mo. */
const TAILLE_MAX = 50 * 1024 * 1024

function tailleLisible(octets: number) {
  if (octets >= 1024 * 1024) {
    return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
  }
  if (octets >= 1024) return `${Math.round(octets / 1024)} Ko`
  return `${octets} o`
}

function hoteLisible(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Lien'
  }
}

function IconeRessource({ ressource }: { ressource: RessourceItem }) {
  const classe = 'mt-0.5 size-4 shrink-0 text-muted-foreground'
  if (ressource.type === 'LIEN') {
    return <Link2 className={classe} strokeWidth={1.75} aria-hidden />
  }
  const nom = (ressource.nomFichier ?? ressource.url).toLowerCase()
  if (nom.endsWith('.pdf')) {
    return <FileText className={classe} strokeWidth={1.75} aria-hidden />
  }
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(nom)) {
    return <ImageIcon className={classe} strokeWidth={1.75} aria-hidden />
  }
  if (/\.(xlsx?|csv|numbers)$/.test(nom)) {
    return <FileSpreadsheet className={classe} strokeWidth={1.75} aria-hidden />
  }
  return <FileIcon className={classe} strokeWidth={1.75} aria-hidden />
}

/* --------------------------------------------------------------- la liste */

export function RessourcesProjet({ ressources }: { ressources: RessourceItem[] }) {
  if (ressources.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune ressource pour l’instant. Ajoute un lien ou envoie un fichier
        depuis le panneau « Ajouter une ressource ».
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {ressources.map((ressource) => (
        <LigneRessource key={ressource.id} ressource={ressource} />
      ))}
    </ul>
  )
}

function LigneRessource({ ressource }: { ressource: RessourceItem }) {
  const [edition, setEdition] = useState(false)

  if (edition) {
    return (
      <li className="rounded-lg border border-border bg-card p-3">
        <FormulaireEditionRessource ressource={ressource} onFerme={() => setEdition(false)} />
      </li>
    )
  }

  const sousTitre = [
    ressource.type === 'FICHIER'
      ? ressource.taille !== null
        ? tailleLisible(ressource.taille)
        : 'Fichier'
      : hoteLisible(ressource.url),
    ressource.date,
  ].join(' · ')

  // Un fichier (stockage privé) se sert via la route authentifiée ;
  // un lien s'ouvre tel quel.
  const href =
    ressource.type === 'FICHIER' ? `/api/ressources/${ressource.id}` : ressource.url

  return (
    <li className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <IconeRessource ressource={ressource} />

      <div className="min-w-0 flex-1">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-start gap-1.5 text-sm leading-snug font-medium underline-offset-4 hover:text-brand hover:underline"
        >
          <span className="min-w-0 break-words">{ressource.titre}</span>
          <ExternalLink
            className="mt-0.5 size-3 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="sr-only">(ouvre dans un nouvel onglet)</span>
        </a>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{sousTitre}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEdition(true)}
          aria-label={`Modifier la ressource ${ressource.titre}`}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sand hover:text-foreground"
        >
          <Pencil className="size-3.5" strokeWidth={1.75} />
        </button>
        <FormulaireSuppressionRessource ressource={ressource} />
      </div>
    </li>
  )
}

function FormulaireSuppressionRessource({ ressource }: { ressource: RessourceItem }) {
  const [etat, action] = useActionState(supprimerRessource, ETAT_INITIAL)
  const [confirme, setConfirme] = useState(false)

  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="ressourceId" value={ressource.id} />
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
          aria-label={`Supprimer la ressource ${ressource.titre}`}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-bad/10 hover:text-bad"
        >
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </button>
      )}
      <MessageEtat etat={etat} />
    </form>
  )
}

function FormulaireEditionRessource({
  ressource,
  onFerme,
}: {
  ressource: RessourceItem
  onFerme: () => void
}) {
  const [etat, action] = useActionState(modifierRessource, ETAT_INITIAL)

  useEffect(() => {
    if (etat.ok) onFerme()
  }, [etat, onFerme])

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="ressourceId" value={ressource.id} />

      <div className="space-y-1.5">
        <label htmlFor={`ressource-titre-${ressource.id}`} className={classeLibelle}>
          Titre
        </label>
        <input
          id={`ressource-titre-${ressource.id}`}
          name="titre"
          type="text"
          defaultValue={ressource.titre}
          required
          className={classeChamp}
        />
      </div>

      {ressource.type === 'LIEN' ? (
        <div className="space-y-1.5">
          <label htmlFor={`ressource-url-${ressource.id}`} className={classeLibelle}>
            Lien
          </label>
          <input
            id={`ressource-url-${ressource.id}`}
            name="url"
            type="url"
            defaultValue={ressource.url}
            required
            className={classeChamp}
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Fichier : {ressource.nomFichier ?? 'sans nom'}
          {ressource.taille !== null ? ` (${tailleLisible(ressource.taille)})` : ''} — seul le
          titre est modifiable.
        </p>
      )}

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

/* ------------------------------------------------------------ l’ajout */

export function AjoutRessource({ projectId }: { projectId: string }) {
  const [mode, setMode] = useState<'lien' | 'fichier'>('lien')

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-white/10 bg-champ p-1">
        <BoutonMode actif={mode === 'lien'} onClick={() => setMode('lien')}>
          <Link2 className="size-3.5" strokeWidth={1.75} aria-hidden />
          Lien
        </BoutonMode>
        <BoutonMode actif={mode === 'fichier'} onClick={() => setMode('fichier')}>
          <Upload className="size-3.5" strokeWidth={1.75} aria-hidden />
          Fichier
        </BoutonMode>
      </div>

      {mode === 'lien' ? (
        <FormulaireNouveauLien projectId={projectId} />
      ) : (
        <FormulaireNouveauFichier projectId={projectId} />
      )}
    </div>
  )
}

function BoutonMode({
  actif,
  onClick,
  children,
}: {
  actif: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-all',
        actif
          ? 'bg-card text-foreground shadow-sm ring-1 ring-white/10'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function FormulaireNouveauLien({ projectId }: { projectId: string }) {
  const [etat, action] = useActionState(creerRessource, ETAT_INITIAL)
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
      <input type="hidden" name="type" value="LIEN" />

      <div className="space-y-1.5">
        <label htmlFor={`nouvelle-ressource-titre-${projectId}`} className={classeLibelle}>
          Titre
        </label>
        <input
          id={`nouvelle-ressource-titre-${projectId}`}
          name="titre"
          type="text"
          required
          placeholder="Ex. Brief Notion du partenariat"
          className={classeChamp}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`nouvelle-ressource-url-${projectId}`} className={classeLibelle}>
          Lien
        </label>
        <input
          id={`nouvelle-ressource-url-${projectId}`}
          name="url"
          type="url"
          required
          placeholder="https://…"
          className={classeChamp}
        />
      </div>

      <BoutonSoumettre>
        <Plus className="size-3.5" strokeWidth={2} aria-hidden />
        Ajouter le lien
      </BoutonSoumettre>

      <MessageEtat etat={etat} />
    </form>
  )
}

function FormulaireNouveauFichier({ projectId }: { projectId: string }) {
  const [etat, setEtat] = useState<EtatAction>(ETAT_INITIAL)
  const [envoi, setEnvoi] = useState(false)
  const [progression, setProgression] = useState(0)
  const formulaire = useRef<HTMLFormElement>(null)

  async function soumettre(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault()

    const donneesFormulaire = new FormData(evenement.currentTarget)
    const fichier = donneesFormulaire.get('fichier')

    if (!(fichier instanceof File) || fichier.size === 0) {
      setEtat({ erreur: 'Choisis un fichier à envoyer.', ok: false })
      return
    }
    if (fichier.size > TAILLE_MAX) {
      setEtat({ erreur: 'Fichier trop lourd (maximum 50 Mo).', ok: false })
      return
    }

    const saisie = donneesFormulaire.get('titre')
    const titre = (typeof saisie === 'string' ? saisie.trim() : '') || fichier.name

    setEnvoi(true)
    setProgression(0)
    setEtat(ETAT_INITIAL)

    try {
      // 1. Le fichier part du navigateur directement vers Vercel Blob (store privé).
      const blob = await upload(`ressources/${projectId}/${fichier.name}`, fichier, {
        access: 'private',
        handleUploadUrl: '/api/blob/upload',
        clientPayload: JSON.stringify({ projectId }),
        onUploadProgress: ({ percentage }) => setProgression(Math.round(percentage)),
      })

      // 2. Puis la ressource est enregistree en base via la Server Action.
      const donnees = new FormData()
      donnees.set('projectId', projectId)
      donnees.set('type', 'FICHIER')
      donnees.set('titre', titre)
      donnees.set('url', blob.url)
      donnees.set('nomFichier', fichier.name)
      donnees.set('taille', String(fichier.size))

      const resultat = await creerRessource(ETAT_INITIAL, donnees)
      setEtat(resultat)
      if (resultat.ok) formulaire.current?.reset()
    } catch (erreur) {
      setEtat({
        erreur: erreur instanceof Error ? erreur.message : 'Envoi impossible.',
        ok: false,
      })
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <form
      ref={formulaire}
      onSubmit={soumettre}
      className="space-y-3 rounded-xl border border-dashed border-border p-3"
    >
      <div className="space-y-1.5">
        <label htmlFor={`ressource-fichier-${projectId}`} className={classeLibelle}>
          Fichier (PDF, image, tableur…)
        </label>
        <input
          id={`ressource-fichier-${projectId}`}
          name="fichier"
          type="file"
          required
          disabled={envoi}
          className="w-full cursor-pointer rounded-lg border border-white/10 bg-champ px-3 py-2 text-xs text-muted-foreground outline-none transition-all file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-white/10 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-foreground hover:file:bg-white/15 disabled:opacity-60"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`ressource-titre-fichier-${projectId}`} className={classeLibelle}>
          Titre (sinon : le nom du fichier)
        </label>
        <input
          id={`ressource-titre-fichier-${projectId}`}
          name="titre"
          type="text"
          placeholder="Ex. Contrat de partenariat signé"
          disabled={envoi}
          className={classeChamp}
        />
      </div>

      <button
        type="submit"
        disabled={envoi}
        className="violet-plein inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50"
      >
        {envoi ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Upload className="size-3.5" strokeWidth={2} aria-hidden />
        )}
        {envoi ? `Envoi… ${progression} %` : 'Envoyer le fichier'}
      </button>

      <MessageEtat etat={etat} />
    </form>
  )
}
