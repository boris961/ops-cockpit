import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getProjet, getUtilisateurs } from '@/lib/queries'
import { peutModifierProjet, utilisateurCourant } from '@/lib/autorisation'
import { dateCourte, tempsRelatif } from '@/lib/cockpit'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActionsProjet } from '@/components/cockpit/actions-projet'
import { BlocagesProjet, type BlocageItem } from '@/components/cockpit/blocages-projet'
import { EquipeProjet } from '@/components/cockpit/equipe-projet'
import { FicheProjet } from '@/components/cockpit/fiche-projet'
import {
  BadgesDepartements,
  PastilleSante,
  PuceStatut,
} from '@/components/cockpit/indicateurs'
import { TachesProjet, type TacheItem } from '@/components/cockpit/taches-projet'

export default async function DetailProjet(props: PageProps<'/projets/[id]'>) {
  const { id } = await props.params

  const [projet, utilisateurs, moi] = await Promise.all([
    getProjet(id),
    getUtilisateurs(),
    utilisateurCourant(),
  ])

  if (!projet) notFound()

  const modifiable = moi ? peutModifierProjet(moi, projet) : false
  const maintenant = new Date()

  const tousLesUtilisateurs = utilisateurs.map((utilisateur) => ({
    id: utilisateur.id,
    name: utilisateur.name,
    role: utilisateur.role,
  }))

  const taches: TacheItem[] = projet.taches.map((tache) => ({
    id: tache.id,
    titre: tache.titre,
    status: tache.status,
    priorite: tache.priorite,
    echeance: tache.echeance ? tache.echeance.toISOString().slice(0, 10) : null,
    echeanceLisible: tache.echeance ? dateCourte(tache.echeance) : null,
    enRetard: Boolean(tache.echeance && tache.echeance < maintenant && tache.status !== 'TERMINE'),
  }))

  const blocages: BlocageItem[] = projet.blocages.map((blocage) => ({
    id: blocage.id,
    titre: blocage.titre,
    description: blocage.description,
    priorite: blocage.priorite,
    status: blocage.status,
    auteur: blocage.reporter.name,
    cree: tempsRelatif(blocage.createdAt, maintenant),
    resolu: blocage.resolvedAt ? tempsRelatif(blocage.resolvedAt, maintenant) : null,
  }))

  return (
    <div className="px-6 py-8 lg:px-10">
      <Link
        href="/projets"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-brand"
      >
        <ArrowLeft className="size-3.5" strokeWidth={1.75} aria-hidden />
        Projets
      </Link>

      <header className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-4xl leading-tight">{projet.nom}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <PuceStatut statut={projet.status} />
            <PastilleSante sante={projet.sante} />
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1 w-24 overflow-hidden rounded-full bg-sand">
                <span
                  className="block h-full rounded-full bg-brand"
                  style={{ width: `${projet.avancement}%` }}
                />
              </span>
              <span className="tabular-nums">{projet.avancement} %</span>
              <span className="text-muted-foreground/80">
                ({projet.taches.filter((tache) => tache.status === 'TERMINE').length}/
                {projet.taches.length} tâches)
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              Directeur : <span className="text-foreground">{projet.owner.name}</span>
            </span>
            {projet.prochainJalon ? (
              <span className="text-xs text-muted-foreground">
                Prochain jalon : <span className="text-foreground">{projet.prochainJalon}</span>
              </span>
            ) : null}
            <BadgesDepartements departements={projet.departements} />
          </div>
        </div>

        {modifiable ? (
          <ActionsProjet projectId={projet.id} archive={projet.status === 'ARCHIVE'} />
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <Card className="ring-border">
            <CardHeader>
              <CardTitle>Tâches</CardTitle>
            </CardHeader>
            <CardContent>
              <TachesProjet projectId={projet.id} taches={taches} modifiable={modifiable} />
            </CardContent>
          </Card>

          <Card className="ring-border">
            <CardHeader>
              <CardTitle>Blocages</CardTitle>
            </CardHeader>
            <CardContent>
              <BlocagesProjet
                projectId={projet.id}
                blocages={blocages}
                modifiable={modifiable}
              />
            </CardContent>
          </Card>

          <Card className="ring-border">
            <CardHeader>
              <CardTitle>Fil d&apos;activité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {projet.activites.map((activite) => (
                <div key={activite.id} className="flex gap-3">
                  <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border" />
                  <div className="min-w-0">
                    <p className="text-sm leading-snug">
                      <span className="font-medium">{activite.actor.name}</span>{' '}
                      <span className="text-muted-foreground">{activite.message}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {tempsRelatif(activite.createdAt, maintenant)}
                    </p>
                  </div>
                </div>
              ))}
              {projet.activites.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune activité enregistrée.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 space-y-6">
          <Card className="ring-border">
            <CardHeader>
              <CardTitle>Fiche projet</CardTitle>
            </CardHeader>
            <CardContent>
              <FicheProjet
                projectId={projet.id}
                modifiable={modifiable}
                valeurs={{
                  description: projet.description ?? '',
                  ownerId: projet.ownerId,
                  status: projet.status,
                  sante: projet.sante,
                  prochainJalon: projet.prochainJalon ?? '',
                  departements: projet.departements,
                }}
                utilisateurs={tousLesUtilisateurs}
              />
            </CardContent>
          </Card>

          <Card className="ring-border">
            <CardHeader>
              <CardTitle>Équipe</CardTitle>
            </CardHeader>
            <CardContent>
              <EquipeProjet
                projectId={projet.id}
                modifiable={modifiable}
                directeur={{
                  id: projet.owner.id,
                  name: projet.owner.name,
                  role: projet.owner.role,
                }}
                membres={projet.membres.map((membre) => ({
                  id: membre.id,
                  name: membre.name,
                  role: membre.role,
                }))}
                candidats={tousLesUtilisateurs.filter(
                  (utilisateur) =>
                    utilisateur.id !== projet.ownerId &&
                    !projet.membres.some((membre) => membre.id === utilisateur.id),
                )}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
