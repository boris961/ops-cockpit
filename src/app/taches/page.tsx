import { Suspense } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

import { getComptesTaches, getTachesAVenir } from '@/lib/queries'
import { dateCourte, initiales } from '@/lib/cockpit'
import { cn } from '@/lib/utils'
import { Carte } from '@/components/cockpit/carte'
import { FiltreStatut } from '@/components/cockpit/filtre-statut'
import { StatutTacheRapide } from '@/components/cockpit/statut-tache-rapide'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { TaskStatus } from '@prisma/client'

const STATUT_TACHE_LABEL: Record<string, string> = {
  BACKLOG: 'Backlog',
  CETTE_SEMAINE: 'Cette semaine',
  EN_COURS: 'En cours',
  EN_REVIEW: 'En review',
  TERMINE: 'Terminé',
}

const STATUTS_A_VENIR = ['BACKLOG', 'CETTE_SEMAINE', 'EN_COURS', 'EN_REVIEW'] as const

export default async function Taches(props: PageProps<'/taches'>) {
  const { vue, statut } = await props.searchParams
  const voirTerminees = vue === 'terminees'
  const statutChoisi =
    !voirTerminees &&
    typeof statut === 'string' &&
    (STATUTS_A_VENIR as readonly string[]).includes(statut)
      ? (statut as TaskStatus)
      : undefined

  const [taches, comptes] = await Promise.all([
    getTachesAVenir({ terminees: voirTerminees, statut: statutChoisi }),
    getComptesTaches(),
  ])
  const maintenant = new Date()

  const lignes = taches.map((tache) => ({
    id: tache.id,
    titre: tache.titre,
    statut: tache.status,
    projetId: tache.project.id,
    projetNom: tache.project.nom,
    responsable: tache.owner?.name ?? null,
    echeance: tache.echeance ? dateCourte(tache.echeance) : '—',
    enRetard: Boolean(
      tache.echeance && tache.echeance < maintenant && tache.status !== 'TERMINE',
    ),
  }))

  const enRetard = lignes.filter((ligne) => ligne.enRetard).length

  // Le filtre statut ne concerne que la vue « A venir » : il survit au retour
  // depuis l'onglet Terminées, mais n'y est pas propagé.
  const lienAVenir = statutChoisi ? `/taches?statut=${statutChoisi}` : '/taches'
  const lienTerminees = '/taches?vue=terminees'

  return (
    <div className="px-6 py-8 lg:px-10">
      <header className="mb-8">
        <h1 className="text-4xl font-light leading-tight tracking-tight">Tâches</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {voirTerminees ? (
            <>
              {lignes.length} tâche{lignes.length > 1 ? 's' : ''} terminée
              {lignes.length > 1 ? 's' : ''}, les plus récentes d&apos;abord.
            </>
          ) : (
            <>
              {lignes.length} tâche{lignes.length > 1 ? 's' : ''} datée
              {lignes.length > 1 ? 's' : ''}
              {statutChoisi ? ` (${STATUT_TACHE_LABEL[statutChoisi]})` : ''}, de la plus urgente à
              la plus lointaine
              {enRetard > 0 ? (
                <>
                  {' '}
                  — <span className="font-medium text-bad">{enRetard} en retard</span>
                </>
              ) : null}
              .
            </>
          )}
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Vue" className="flex items-center gap-2">
          <FiltreLien
            href={lienAVenir}
            actif={!voirTerminees}
            libelle="À venir"
            compte={comptes.aVenir}
          />
          <FiltreLien
            href={lienTerminees}
            actif={voirTerminees}
            libelle="Terminées"
            compte={comptes.terminees}
          />
        </nav>

        {!voirTerminees ? (
          <Suspense fallback={null}>
            <FiltreStatut />
          </Suspense>
        ) : null}
      </div>

      <Carte titre={voirTerminees ? 'Archive' : 'Échéancier'} contenuClassName="px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {['Tâche', 'Projet', 'Responsable', 'Échéance'].map((colonne, index) => (
                <TableHead
                  key={colonne}
                  className={cn(
                    'text-[11px] tracking-[0.1em] text-muted-foreground uppercase',
                    index === 0 && 'pl-5',
                  )}
                >
                  {colonne}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lignes.map((ligne) => (
              <TableRow key={ligne.id} className="border-border">
                <TableCell className="py-3 pl-5">
                  <Link
                    href={`/projets/${ligne.projetId}`}
                    className="font-medium underline-offset-4 hover:text-brand hover:underline"
                  >
                    {ligne.titre}
                  </Link>
                  <StatutTacheRapide
                    tacheId={ligne.id}
                    statut={ligne.statut}
                    titre={ligne.titre}
                  />
                </TableCell>

                <TableCell className="py-3 text-muted-foreground">
                  <Link
                    href={`/projets/${ligne.projetId}`}
                    className="underline-offset-4 hover:text-brand hover:underline"
                  >
                    {ligne.projetNom}
                  </Link>
                </TableCell>

                <TableCell className="py-3">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ring-1 ring-white/12',
                        ligne.responsable
                          ? 'bg-sand'
                          : 'bg-background text-muted-foreground/60 ring-dashed',
                      )}
                    >
                      {ligne.responsable ? initiales(ligne.responsable) : '—'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {ligne.responsable ?? 'Non assignée'}
                    </span>
                  </span>
                </TableCell>

                <TableCell className="py-3 pr-5">
                  {ligne.enRetard ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-bad/40 bg-bad/15 px-2 py-0.5 text-xs font-semibold text-bad">
                      <AlertTriangle className="size-3" strokeWidth={2} aria-hidden />
                      {ligne.echeance}
                      <span className="sr-only">en retard</span>
                    </span>
                  ) : (
                    <span className="text-xs whitespace-nowrap text-muted-foreground">
                      {ligne.echeance}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {lignes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  {voirTerminees
                    ? 'Aucune tâche terminée pour le moment.'
                    : statutChoisi
                      ? 'Aucune tâche à venir avec ce filtre.'
                      : 'Aucune tâche avec une échéance.'}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Carte>
    </div>
  )
}

function FiltreLien({
  href,
  actif,
  libelle,
  compte,
}: {
  href: string
  actif: boolean
  libelle: string
  compte: number
}) {
  return (
    <Link
      href={href}
      aria-current={actif ? 'page' : undefined}
      className={cn(
        // `bg-card` sur les deux états, comme sur la page Projets : ces
        // pastilles reposent sur le décor, qui ne doit pas transparaître.
        'inline-flex h-8 items-center gap-2 rounded-lg border bg-card px-3 text-sm transition-all',
        actif
          ? 'nav-actif border-brand/50 font-semibold text-white'
          : 'border-white/12 text-muted-foreground hover:border-white/25 hover:text-foreground',
      )}
    >
      {libelle}
      <span className="text-xs tabular-nums opacity-70">{compte}</span>
    </Link>
  )
}
