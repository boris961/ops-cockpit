import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { BarreAvancement } from '@/components/cockpit/indicateurs'

export function CarteKpi({
  libelle,
  valeur,
  unite,
  icone: Icone,
  precision,
  progression,
  alerte = false,
  href,
}: {
  libelle: string
  valeur: number
  unite?: string
  icone: LucideIcon
  precision?: string
  /** Affiche une barre d'avancement rouge sous la valeur (0–100). */
  progression?: number
  /** Passe la valeur en rouge quand l'indicateur appelle une action. */
  alerte?: boolean
  /** Rend la carte cliquable. Sans lien pertinent, la carte reste inerte. */
  href?: string
}) {
  const carte = (
    <Card
      className={cn(
        'verre h-full gap-0 rounded-xl px-4 py-4 ring-1 ring-white/10 transition-all',
        href && 'hover:ring-brand/40 hover:shadow-halo',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] leading-tight tracking-[0.14em] text-muted-foreground uppercase">
          {libelle}
        </p>
        <Icone
          className={cn(
            'size-4 shrink-0',
            alerte && valeur > 0
              ? 'text-bad drop-shadow-[0_0_6px_var(--bad)]'
              : 'text-brand-clair/70',
          )}
          strokeWidth={1.75}
        />
      </div>

      <p
        className={cn(
          'mt-3.5 text-[2.5rem] leading-none font-light tracking-tight tabular-nums',
          alerte && valeur > 0
            ? 'text-bad drop-shadow-[0_0_16px_color-mix(in_oklab,var(--bad)_55%,transparent)]'
            : 'text-foreground',
        )}
      >
        {valeur}
        {unite ? <span className="text-2xl text-muted-foreground">{unite}</span> : null}
      </p>

      {progression !== undefined ? (
        <BarreAvancement valeur={progression} className="mt-3" />
      ) : null}

      {precision ? (
        <p className="mt-2.5 text-[11px] leading-snug text-muted-foreground">{precision}</p>
      ) : null}
    </Card>
  )

  if (!href) return carte

  return (
    <Link href={href} className="block rounded-xl outline-ring/50 focus-visible:outline-2">
      {carte}
    </Link>
  )
}
