'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type PointAvancement = {
  nom: string
  avancement: number
  statut: string
}

/**
 * Une seule serie (magnitude) : une seule teinte, pas de legende — le titre de
 * la carte dit ce qui est trace. Valeur en bout de barre, grille en retrait.
 */
export function GrapheAvancement({ data }: { data: PointAvancement[] }) {
  const points = [...data].sort((a, b) => b.avancement - a.avancement)
  const hauteur = Math.max(180, points.length * 34 + 28)

  if (points.length === 0) {
    return <p className="py-8 text-sm text-muted-foreground">Aucun projet à afficher.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <BarChart
        data={points}
        layout="vertical"
        margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
        barCategoryGap={10}
      >
        <CartesianGrid horizontal={false} stroke="var(--border)" strokeWidth={1} />
        <XAxis
          type="number"
          domain={[0, 100]}
          ticks={[0, 50, 100]}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="nom"
          width={150}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--foreground)', fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: 'var(--sand)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const point = payload[0].payload as PointAvancement
            return (
              <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-sm">
                <p className="font-medium">{point.nom}</p>
                <p className="mt-0.5 text-muted-foreground">
                  Avancement <span className="tabular-nums text-foreground">{point.avancement}%</span>
                </p>
              </div>
            )
          }}
        />
        <Bar dataKey="avancement" fill="var(--brand)" barSize={14} radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="avancement"
            position="right"
            offset={8}
            fill="var(--foreground)"
            fontSize={11}
            formatter={(v) => `${v}%`}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
