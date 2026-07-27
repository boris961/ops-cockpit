'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { STATUT_COLOR, STATUT_LABEL } from '@/lib/cockpit'

export type PointStatut = {
  statut: string
  valeur: number
}

/**
 * Part-au-tout, 5 classes max. La legende chiffree accompagne toujours l'anneau :
 * l'identite ne repose jamais sur la couleur seule.
 */
export function GrapheStatuts({ data }: { data: PointStatut[] }) {
  const total = data.reduce((somme, d) => somme + d.valeur, 0)

  if (total === 0) {
    return <p className="py-8 text-sm text-muted-foreground">Aucun projet à répartir.</p>
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative shrink-0">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={data}
              dataKey="valeur"
              nameKey="statut"
              innerRadius={58}
              outerRadius={86}
              paddingAngle={2}
              stroke="var(--fond)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.statut} fill={STATUT_COLOR[d.statut]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const point = payload[0].payload as PointStatut
                return (
                  <div className="verre rounded-lg bg-popover px-3 py-2 text-xs ring-1 ring-white/15">
                    <p className="font-medium">{STATUT_LABEL[point.statut] ?? point.statut}</p>
                    <p className="mt-0.5 text-muted-foreground">
                      <span className="text-foreground tabular-nums">{point.valeur}</span>{' '}
                      {point.valeur > 1 ? 'projets' : 'projet'} ·{' '}
                      {Math.round((point.valeur / total) * 100)}%
                    </p>
                  </div>
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl leading-none font-light tabular-nums">{total}</span>
          <span className="mt-1.5 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            projets
          </span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-2">
        {data.map((d) => (
          <li key={d.statut} className="flex items-center gap-2.5 text-sm">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: STATUT_COLOR[d.statut],
                boxShadow: `0 0 10px -1px ${STATUT_COLOR[d.statut]}`,
              }}
            />
            <span className="min-w-0 flex-1 truncate">{STATUT_LABEL[d.statut] ?? d.statut}</span>
            <span className="tabular-nums">{d.valeur}</span>
            <span className="w-10 text-right tabular-nums text-muted-foreground">
              {Math.round((d.valeur / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
