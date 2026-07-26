'use client'

import Link from 'next/link'
import { AlertTriangle, Flag, LayoutGrid, List } from 'lucide-react'

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

export function VueProjets({ projets }: { projets: ProjetItem[] }) {
  return (
    <Tabs defaultValue="liste" className="gap-4">
      <TabsList className="self-start">
        <TabsTrigger value="liste" className="px-3">
          <List className="size-4" strokeWidth={1.75} />
          Liste
        </TabsTrigger>
        <TabsTrigger value="kanban" className="px-3">
          <LayoutGrid className="size-4" strokeWidth={1.75} />
          Kanban
        </TabsTrigger>
      </TabsList>

      <TabsContent value="liste">
        <VueListe projets={projets} />
      </TabsContent>

      <TabsContent value="kanban">
        <VueKanban projets={projets} />
      </TabsContent>
    </Tabs>
  )
}

function VueListe({ projets }: { projets: ProjetItem[] }) {
  return (
    <Card className="ring-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {['Projet', 'Directeur', 'Statut', 'Santé', 'Avancement', 'Prochain jalon', 'Blocages'].map(
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
              <TableCell className="py-3">
                <PuceStatut statut={p.statut} />
              </TableCell>
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
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                Aucun projet.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </Card>
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
                className="gap-3 px-4 py-4 ring-border transition-shadow hover:ring-foreground/25"
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
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
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
    <span className="inline-flex items-center gap-1 text-xs text-brand">
      <AlertTriangle className="size-3 shrink-0" strokeWidth={2} />
      <span className="tabular-nums">{nombre}</span>
      <span className="sr-only">blocage(s)</span>
    </span>
  )
}
