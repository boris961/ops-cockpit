'use client'

import { initiales } from '@/lib/cockpit'
import { Card } from '@/components/ui/card'

export type LigneCharge = {
  id: string
  nom: string
  aFaire: number
  enCours: number
  projets: number
  total: number
}

/**
 * Segments de la charge restante (a faire -> en cours). Les taches terminees
 * ne pesent plus ici : la charge mesure ce qu'il reste a faire.
 */
const SEGMENTS = [
  { cle: 'aFaire', libelle: 'À faire', couleur: 'var(--attente)' },
  { cle: 'enCours', libelle: 'En cours', couleur: 'var(--chart-2)' },
] as const

export function VueCharge({ lignes }: { lignes: LigneCharge[] }) {
  if (lignes.length === 0) {
    return (
      <Card className="verre rounded-xl ring-1 ring-white/10">
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          Aucune charge à répartir.
        </p>
      </Card>
    )
  }

  const maximum = Math.max(1, ...lignes.map((ligne) => ligne.total))

  return (
    <Card className="verre gap-0 rounded-xl py-0 ring-1 ring-white/10">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border bg-rail px-5 py-3">
        {SEGMENTS.map((segment) => (
          <span key={segment.cle} className="inline-flex items-center gap-2 text-xs">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ backgroundColor: segment.couleur }}
            />
            {segment.libelle}
          </span>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">Tâches terminées exclues</span>
      </div>

      <ul className="divide-y divide-border">
        {lignes.map((ligne) => {
          const nonAssigne = ligne.id === 'non-assigne'
          return (
            <li key={ligne.id} className="flex items-center gap-4 px-5 py-3.5">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-white/12 ${
                  nonAssigne ? 'bg-background text-muted-foreground/70 ring-dashed' : 'bg-sand'
                }`}
              >
                {nonAssigne ? '—' : initiales(ligne.nom)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className={`truncate text-sm ${nonAssigne ? 'text-muted-foreground italic' : 'font-medium'}`}
                  >
                    {ligne.nom}
                  </p>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {!nonAssigne ? (
                      <>
                        <span className="text-base font-medium text-foreground tabular-nums">
                          {ligne.projets}
                        </span>{' '}
                        projet{ligne.projets > 1 ? 's' : ''}
                        <span className="mx-2 opacity-40">·</span>
                      </>
                    ) : null}
                    <span className="text-base font-medium text-foreground tabular-nums">
                      {ligne.total}
                    </span>{' '}
                    tâche{ligne.total > 1 ? 's' : ''} restante{ligne.total > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Barre proportionnelle a la charge restante la plus lourde,
                    segments separes par 2px de surface. */}
                <div
                  className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full"
                  style={{ width: `${Math.max(8, (ligne.total / maximum) * 100)}%` }}
                >
                  {SEGMENTS.map((segment) => {
                    const valeur = ligne[segment.cle]
                    if (valeur === 0) return null
                    return (
                      <span
                        key={segment.cle}
                        className="h-full first:rounded-l-full last:rounded-r-full"
                        style={{
                          flexGrow: valeur,
                          backgroundColor: segment.couleur,
                        }}
                      />
                    )
                  })}
                </div>

                <p className="mt-1.5 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                  {SEGMENTS.map((segment) => (
                    <span key={segment.cle}>
                      {segment.libelle}{' '}
                      <span className="text-foreground tabular-nums">{ligne[segment.cle]}</span>
                    </span>
                  ))}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
