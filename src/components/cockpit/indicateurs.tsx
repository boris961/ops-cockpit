import { cn } from '@/lib/utils'
import { SANTE_COLOR, SANTE_LABEL, STATUT_COLOR, STATUT_LABEL } from '@/lib/cockpit'

/** Barre d'avancement a plat, accent rouge de marque. */
export function BarreAvancement({
  valeur,
  className,
}: {
  valeur: number
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, Math.round(valeur)))
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Avancement"
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-sand', className)}
    >
      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Avancement : barre + valeur, la valeur porte l'information, pas la couleur. */
export function Avancement({
  valeur,
  className,
}: {
  valeur: number
  className?: string
}) {
  const pct = Math.round(valeur)
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <BarreAvancement valeur={pct} className="w-24" />
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  )
}

/** Pastille de sante + libelle : la couleur ne circule jamais seule. */
export function PastilleSante({
  sante,
  avecLibelle = true,
}: {
  sante: string
  avecLibelle?: boolean
}) {
  const couleur = SANTE_COLOR[sante] ?? 'var(--muted-foreground)'
  const libelle = SANTE_LABEL[sante] ?? sante
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: couleur }}
      />
      {avecLibelle ? (
        <span className="text-xs font-medium" style={{ color: couleur }}>
          {libelle}
        </span>
      ) : (
        <span className="sr-only">{libelle}</span>
      )}
    </span>
  )
}

/** Departements rattaches au projet, en petits badges. */
export function BadgesDepartements({
  departements,
  className,
}: {
  departements: string[]
  className?: string
}) {
  if (departements.length === 0) return null
  return (
    <span className={cn('flex flex-wrap items-center gap-1', className)}>
      {departements.map((departement) => (
        <span
          key={departement}
          className="inline-flex items-center rounded-full bg-sand px-2 py-0.5 text-[10px] font-medium tracking-wide text-foreground/80"
        >
          {departement}
        </span>
      ))}
    </span>
  )
}

/** Statut projet : puce fine, encre noire, marqueur colore. */
export function PuceStatut({ statut }: { statut: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-xs font-medium">
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: STATUT_COLOR[statut] ?? 'var(--muted-foreground)' }}
      />
      {STATUT_LABEL[statut] ?? statut}
    </span>
  )
}
