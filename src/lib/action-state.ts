/** Etat partage par toutes les Server Actions (lisible via useActionState). */
export type EtatAction = {
  erreur: string | null
  ok: boolean
}

export const ETAT_INITIAL: EtatAction = { erreur: null, ok: false }
