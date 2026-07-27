'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { EtatAction } from '@/lib/action-state'

export const classeChamp =
  'w-full rounded-lg border border-white/10 bg-champ px-3 py-2 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-brand/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-brand/20 disabled:opacity-60 [&>option]:bg-popover [&>option]:text-foreground'

/** Meme traitement de surface, en version compacte (selects en ligne). */
export const classeChampCompact =
  'h-7 rounded-lg border border-white/10 bg-champ px-2 text-xs outline-none transition-all focus:border-brand/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-brand/20 disabled:opacity-60 [&>option]:bg-popover [&>option]:text-foreground'

export const classeLibelle =
  'text-[10px] uppercase tracking-[0.16em] text-muted-foreground'

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
        'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50',
        // Degrade violet -> indigo et halo pour les actions primaires.
        variante === 'primaire' && 'violet-plein',
        // `bg-card` et non un blanc translucide : ces boutons vivent parfois
        // hors carte, sur le décor, qu'ils ne doivent pas laisser passer.
        variante === 'discret' &&
          'border border-white/12 bg-card text-foreground hover:border-white/25 hover:bg-champ',
        variante === 'danger' &&
          'border border-bad/40 bg-bad/15 text-bad hover:bg-bad/25 hover:shadow-[0_8px_24px_-12px_var(--bad)]',
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
          'inline-flex h-8 items-center rounded-lg border border-white/12 bg-card px-3 text-xs font-medium text-bad transition-all hover:border-bad/50 hover:bg-bad/10',
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
