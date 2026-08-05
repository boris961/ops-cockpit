'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Flag, Layers, LayoutGrid, List, Users } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { STATUTS, STATUT_COLOR, STATUT_LABEL } from '@/lib/cockpit'
import {
  Avancement,
  BadgesDepartements,
  BarreAvancement,
  PastilleSante,
  PuceStatut,
} from '@/components/cockpit/indicateurs'
import { VueCharge, type LigneCharge } from '@/components/cockpit/vue-charge'

export type ProjetItem = {
  id: string
  nom: string
  directeur: string
  statut: string
  sante: string
  avancement: number
  prochainJalon: string | null
  blocages: number
  departements: string[]
}

export function VueProjets({
  projets,
  charge,
}: {
  projets: ProjetItem[]
  charge: LigneCharge[]
}) {
  const [grouperParStatut, setGrouperParStatut] = useState(false)

  return (
    <Tabs defaultValue="liste" className="gap-4">
      <TabsList className="self-start bg-card">
        <TabsTrigger value="liste" className="px-3">
          <List className="size-4" strokeWidth={1.75} />
          Liste
        </TabsTrigger>
        <TabsTrigger value="kanban" className="px-3">
          <LayoutGrid className="size-4" strokeWidth={1.75} />
          Kanban
        </TabsTrigger>
        <TabsTrigger value="charge" className="px-3">
          <Users className="size-4" strokeWidth={1.75} />
          Charge
        </TabsTrigger>
      </TabsList>

      <TabsContent value="liste" className="space-y-3">
        <div className="flex justify-end">
          <button
            type="button"
            aria-pressed={grouperParStatut}
            onClick={() => setGrouperParStatut((valeur) => !valeur)}
            className={`inline-flex h-8 items-center gap-2 rounded-lg border bg-card px-3 text-sm transition-all ${
              grouperParStatut
                ? 'nav-actif border-brand/50 font-semibold text-white'
                : 'border-white/12 text-muted-foreground hover:border-white/25 hover:text-foreground'
            }`}
          >
            <Layers className="size-4" strokeWidth={1.75} />
            Grouper par statut
          </button>
        </div>

        {grouperParStatut ? (
          <VueListeGroupee projets={projets} />
        ) : (
          <VueListe projets={projets} />
        )}
      </TabsContent>

      <TabsContent value="kanban">
        <VueKanban projets={projets} />
      </TabsContent>

      <TabsContent value="charge">
        <VueCharge lignes={charge} />
      </TabsContent>
    </Tabs>
  )
}

function VueListe({
  projets,
  masquerStatut = false,
}: {
  projets: ProjetItem[]
  masquerStatut?: boolean
}) {
  const colonnes = [
    'Projet',
    'Directeur',
    ...(masquerStatut ? [] : ['Statut']),
    'Santé',
    'Avancement',
    'Prochain jalon',
    'Blocages',
  ]
  return (
    <Card className="verre rounded-xl ring-1 ring-white/10">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {colonnes.map(
              (colonne, index) => (
                <TableHead
                  key={colonne}
                  className={`text-[11px] tracking-[0.1em] text-muted-foreground uppercase ${
                    index === 0 ? 'pl-5' : ''
                  }`}
                >
                  {colonne}
                </TableHead>
              ),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {projets.map((p) => (
            <TableRow key={p.id} className="border-border">
              <TableCell className="py-3 pl-5">
                <Link
                  href={`/projets/${p.id}`}
                  className="font-medium underline-offset-4 hover:text-brand hover:underline"
                >
                  {p.nom}
                </Link>
                <BadgesDepartements departements={p.departements} className="mt-1" />
              </TableCell>
              <TableCell className="py-3 text-muted-foreground">{p.directeur}</TableCell>
              {masquerStatut ? null : (
                <TableCell className="py-3">
                  <PuceStatut statut={p.statut} />
                </TableCell>
              )}
              <TableCell className="py-3">
                <PastilleSante sante={p.sante} />
              </TableCell>
              <TableCell className="py-3">
                <Avancement valeur={p.avancement} />
              </TableCell>
              <TableCell className="py-3 text-muted-foreground">
                {p.prochainJalon ?? '—'}
              </TableCell>
              <TableCell className="py-3 pr-5">
                <CompteurBlocages nombre={p.blocages} />
              </TableCell>
            </TableRow>
          ))}
          {projets.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={colonnes.length}
                className="py-8 text-center text-muted-foreground"
              >
                Aucun projet.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </Card>
  )
}

/**
 * Liste groupee par statut : une section par statut present (dans l'ordre du
 * flux Cadrage -> Termine, puis Archive), avec le meme tableau que la vue a
 * plat — colonne Statut masquee, devenue redondante.
 */
function VueListeGroupee({ projets }: { projets: ProjetItem[] }) {
  const groupes = [...STATUTS, 'ARCHIVE']
    .map((statut) => ({
      statut,
      liste: projets.filter((p) => p.statut === statut),
    }))
    .filter((groupe) => groupe.liste.length > 0)

  if (groupes.length === 0) {
    return (
      <Card className="verre rounded-xl ring-1 ring-white/10">
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucun projet.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {groupes.map((groupe) => (
        <section key={groupe.statut}>
          <header className="mb-2 flex items-center gap-2 px-1">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: STATUT_COLOR[groupe.statut] }}
            />
            <h2 className="text-sm font-medium">{STATUT_LABEL[groupe.statut] ?? groupe.statut}</h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {groupe.liste.length}
            </span>
          </header>
          <VueListe projets={groupe.liste} masquerStatut />
        </section>
      ))}
    </div>
  )
}

function VueKanban({ projets }: { projets: ProjetItem[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {STATUTS.map((statut) => {
        const colonne = projets.filter((p) => p.statut === statut)
        return (
          <section key={statut} className="flex w-72 shrink-0 flex-col gap-3">
            <header className="flex items-center gap-2 border-b border-border pb-2">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: STATUT_COLOR[statut] }}
              />
              <h2 className="text-sm font-medium">{STATUT_LABEL[statut]}</h2>
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                {colonne.length}
              </span>
            </header>

            {colonne.map((p) => (
              <Card
                key={p.id}
                size="sm"
                className="verre gap-3 rounded-xl px-4 py-4 ring-1 ring-white/10 transition-all hover:ring-brand/40 hover:shadow-halo"
              >
                <Link
                  href={`/projets/${p.id}`}
                  className="text-sm leading-snug font-medium underline-offset-4 hover:text-brand hover:underline"
                >
                  {p.nom}
                </Link>
                <p className="text-xs text-muted-foreground">{p.directeur}</p>
                <BadgesDepartements departements={p.departements} />

                <div className="flex items-center justify-between gap-2">
                  <PastilleSante sante={p.sante} />
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {p.avancement}%
                  </span>
                </div>
                <BarreAvancement valeur={p.avancement} />

                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <Flag className="size-3 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{p.prochainJalon ?? 'Pas de jalon'}</span>
                  </span>
                  <CompteurBlocages nombre={p.blocages} />
                </div>
              </Card>
            ))}

            {colonne.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/12 bg-card px-4 py-6 text-center text-xs text-muted-foreground">
                Aucun projet
              </p>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}

function CompteurBlocages({ nombre }: { nombre: number }) {
  if (nombre === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-bad">
      <AlertTriangle className="size-3 shrink-0" strokeWidth={2} />
      <span className="tabular-nums">{nombre}</span>
      <span className="sr-only">blocage(s)</span>
    </span>
  )
}
