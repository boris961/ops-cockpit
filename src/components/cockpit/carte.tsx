import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Carte de section du cockpit. Elle porte la hierarchie de surfaces :
 * page blanche > carte (blanche, bordee, ombre douce) > en-tete teinte, et
 * variante « rail » un cran plus sable pour la colonne de droite.
 */
export function Carte({
  titre,
  action,
  children,
  rail = false,
  contenuClassName,
  className,
}: {
  titre?: React.ReactNode
  /** Element aligne a droite du titre (lien, bouton). */
  action?: React.ReactNode
  children: React.ReactNode
  rail?: boolean
  contenuClassName?: string
  className?: string
}) {
  return (
    <Card
      className={cn(
        'verre rounded-xl ring-1 ring-white/10',
        rail ? 'bg-rail' : 'bg-card',
        titre ? 'pt-0' : undefined,
        className,
      )}
    >
      {titre ? (
        <CardHeader
          className={cn(
            'items-center border-b border-white/8 bg-white/[0.03] pt-(--card-spacing)',
          )}
        >
          <CardTitle>{titre}</CardTitle>
          {/* CardAction bascule l'en-tete en deux colonnes (cf. card.tsx). */}
          {action ? <CardAction className="self-center">{action}</CardAction> : null}
        </CardHeader>
      ) : null}
      <CardContent className={contenuClassName}>{children}</CardContent>
    </Card>
  )
}
