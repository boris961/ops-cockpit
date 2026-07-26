import { Suspense } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Clock, Gauge, ListTodo } from 'lucide-react'

import { getOverview, getPorteurs } from '@/lib/queries'
import { FiltrePorteur } from '@/components/cockpit/filtre-porteur'
import { PRIORITE_LABEL, STATUTS, tempsRelatif } from '@/lib/cockpit'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CarteKpi } from '@/components/cockpit/carte-kpi'
import { GrapheAvancement } from '@/components/cockpit/graphe-avancement'
import { GrapheStatuts } from '@/components/cockpit/graphe-statuts'
import { Avancement, PastilleSante, PuceStatut } from '@/components/cockpit/indicateurs'

export default async function VueDEnsemble(props: PageProps<'/'>) {
  const { porteur } = await props.searchParams
  const porteurChoisi = typeof porteur === 'string' ? porteur : undefined

  const [
    {
      projetsActifs,
      taches,
      tachesEnRetard,
      blocagesOuverts,
      avancementMoyen,
      projets,
      blocages,
      activite,
    },
    porteurs,
  ] = await Promise.all([getOverview({ porteur: porteurChoisi }), getPorteurs()])

  const pointsAvancement = projets.map((p) => ({
    nom: p.nom,
    avancement: p.avancement,
    statut: p.status,
  }))

  const pointsStatut = STATUTS.map((statut) => ({
    statut,
    valeur: projets.filter((p) => p.status === statut).length,
  })).filter((d) => d.valeur > 0)

  return (
    <div className="px-6 py-8 lg:px-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl leading-tight">Vue d&apos;ensemble</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            L&apos;état du portefeuille de missions, en un coup d&apos;œil.
          </p>
        </div>
        <Suspense fallback={null}>
          <FiltrePorteur porteurs={porteurs} />
        </Suspense>
      </header>

      <section aria-label="Indicateurs clés" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <CarteKpi
          libelle="Missions actives"
          valeur={projetsActifs}
          icone={Gauge}
          href="/projets"
        />
        <CarteKpi libelle="Tâches totales" valeur={taches} icone={ListTodo} />
        <CarteKpi
          libelle="Taux d'avancement moyen"
          valeur={avancementMoyen}
          unite="%"
          icone={CheckCircle2}
          progression={avancementMoyen}
        />
        <CarteKpi
          libelle="Tâches en retard"
          valeur={tachesEnRetard}
          icone={Clock}
          alerte
          precision="Échéance dépassée, tâche non terminée"
        />
        <CarteKpi
          libelle="Blocages ouverts"
          valeur={blocagesOuverts}
          icone={AlertTriangle}
          alerte
          precision="Sujets à l'arrêt, en attente d'arbitrage"
          href="/projets"
        />
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="ring-border">
              <CardHeader>
                <CardTitle>Avancement par projet</CardTitle>
              </CardHeader>
              <CardContent>
                <GrapheAvancement data={pointsAvancement} />
              </CardContent>
            </Card>

            <Card className="ring-border">
              <CardHeader>
                <CardTitle>Répartition par statut</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <GrapheStatuts data={pointsStatut} />
              </CardContent>
            </Card>
          </div>

          <Card className="ring-border">
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle>Projets en cours</CardTitle>
              <Link
                href="/projets"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-brand hover:underline"
              >
                Tout voir
              </Link>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5 text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                      Projet
                    </TableHead>
                    <TableHead className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                      Directeur
                    </TableHead>
                    <TableHead className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                      Statut
                    </TableHead>
                    <TableHead className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                      Santé
                    </TableHead>
                    <TableHead className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                      Avancement
                    </TableHead>
                    <TableHead className="pr-5 text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                      Prochain jalon
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projets.map((p) => (
                    <TableRow key={p.id} className="border-border">
                      <TableCell className="py-3 pl-5 font-medium">
                        <Link
                          href={`/projets/${p.id}`}
                          className="underline-offset-4 hover:text-brand hover:underline"
                        >
                          {p.nom}
                        </Link>
                      </TableCell>
                      <TableCell className="py-3 text-muted-foreground">{p.owner.name}</TableCell>
                      <TableCell className="py-3">
                        <PuceStatut statut={p.status} />
                      </TableCell>
                      <TableCell className="py-3">
                        <PastilleSante sante={p.sante} />
                      </TableCell>
                      <TableCell className="py-3">
                        <Avancement valeur={p.avancement} />
                      </TableCell>
                      <TableCell className="py-3 pr-5 text-muted-foreground">
                        {p.prochainJalon ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {projets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Aucun projet actif.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 space-y-6">
          <Card className="ring-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-brand" strokeWidth={1.75} />
                Blocages critiques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {blocages.map((b) => {
                const contenu = (
                  <>
                    <p className="text-sm leading-snug font-medium transition-colors group-hover:text-brand">
                      {b.titre}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{b.project?.nom ?? 'Sans projet'}</span>
                      <span aria-hidden>·</span>
                      <span
                        className={
                          b.priorite === 'P0'
                            ? 'text-bad'
                            : b.priorite === 'P1'
                              ? 'text-warn'
                              : undefined
                        }
                      >
                        {PRIORITE_LABEL[b.priorite] ?? b.priorite}
                      </span>
                    </div>
                  </>
                )

                return (
                  <div key={b.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    {b.project ? (
                      <Link href={`/projets/${b.project.id}`} className="group block">
                        {contenu}
                      </Link>
                    ) : (
                      contenu
                    )}
                  </div>
                )
              })}
              {blocages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun blocage ouvert.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="ring-border">
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activite.map((a) => {
                const contenu = (
                  <div className="min-w-0">
                    <p className="text-sm leading-snug">
                      <span className="font-medium transition-colors group-hover:text-brand">
                        {a.actor.name}
                      </span>{' '}
                      <span className="text-muted-foreground">{a.message}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {tempsRelatif(a.createdAt)}
                    </p>
                  </div>
                )

                return (
                  <div key={a.id} className="flex gap-3">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border" />
                    {a.projectId ? (
                      <Link href={`/projets/${a.projectId}`} className="group min-w-0">
                        {contenu}
                      </Link>
                    ) : (
                      contenu
                    )}
                  </div>
                )
              })}
              {activite.length === 0 ? (
                <p className="text-sm text-muted-foreground">Rien à signaler.</p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
