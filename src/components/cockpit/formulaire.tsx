'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { EtatAction } from '@/lib/action-state'

export const classeChamp =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:opacity-60'

export const classeLibelle =
  'text-[11px] uppercase tracking-[0.12em] text-muted-foreground'

/** Bouton de soumission : etat « en cours » pilote par le formulaire parent. */
export function BoutonSoumettre({
  children,
  variante = 'primaire',
  className,
  ...props
}: React.ComponentProps<'button'> & { variante?: 'primaire' | 'discret' | 'danger' }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      className={cn(
        'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50',
        // Rouge de marque sur les actions primaires ; le ton fonce garde le 4.5:1
        // sous le texte blanc, le survol revient au rouge plein.
        variante === 'primaire' && 'bg-brand-fonce text-white hover:bg-brand',
        variante === 'discret' &&
          'border border-border text-foreground hover:border-foreground/40 hover:bg-sand',
        variante === 'danger' && 'bg-brand-fonce text-white hover:bg-brand',
        className,
      )}
      {...props}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  )
}

/** Message d'erreur renvoye par une Server Action. */
export function MessageEtat({ etat }: { etat: EtatAction }) {
  if (!etat.erreur) return null
  return (
    <p role="alert" className="text-xs leading-snug text-bad">
      {etat.erreur}
    </p>
  )
}

/**
 * Confirmation en deux temps, dans le formulaire parent : le premier clic
 * decouvre le bouton reellement destructeur.
 */
export function BoutonConfirmation({
  libelle,
  libelleConfirmation,
  className,
}: {
  libelle: string
  libelleConfirmation: string
  className?: string
}) {
  const [demande, setDemande] = useState(false)

  if (!demande) {
    return (
      <button
        type="button"
        onClick={() => setDemande(true)}
        className={cn(
          'inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium text-bad transition-colors hover:border-bad/40 hover:bg-bad/5',
          className,
        )}
      >
        {libelle}
      </button>
    )
  }

  return (
    <span className="inline-flex items-center gap-2">
      <BoutonSoumettre variante="danger">{libelleConfirmation}</BoutonSoumettre>
      <button
        type="button"
        onClick={() => setDemande(false)}
        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Annuler
      </button>
    </span>
  )
}
