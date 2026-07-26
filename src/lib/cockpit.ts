/**
 * Vocabulaire partage du cockpit : libelles francais, couleurs de statut et
 * formatage. Volontairement sans dependance a Prisma pour rester importable
 * depuis les Client Components.
 */

export const STATUTS = [
  'CADRAGE',
  'EN_COURS',
  'A_RISQUE',
  'EN_VALIDATION',
  'TERMINE',
] as const

export type Statut = (typeof STATUTS)[number]

export const STATUT_LABEL: Record<string, string> = {
  CADRAGE: 'Cadrage',
  EN_COURS: 'En cours',
  A_RISQUE: 'À risque',
  EN_VALIDATION: 'En validation',
  TERMINE: 'Terminé',
  ARCHIVE: 'Archivé',
}

/** Une couleur par statut, alignee sur --chart-1..5 (voir globals.css). */
export const STATUT_COLOR: Record<string, string> = {
  CADRAGE: 'var(--chart-1)',
  EN_COURS: 'var(--chart-2)',
  A_RISQUE: 'var(--chart-3)',
  EN_VALIDATION: 'var(--chart-4)',
  TERMINE: 'var(--chart-5)',
  ARCHIVE: 'var(--muted-foreground)',
}

export const SANTE_LABEL: Record<string, string> = {
  VERT: 'Au vert',
  ORANGE: 'Sous surveillance',
  ROUGE: 'En alerte',
}

/** Couleurs de statut reservees : vert / orange / rouge, jamais reutilisees ailleurs. */
export const SANTE_COLOR: Record<string, string> = {
  VERT: 'var(--ok)',
  ORANGE: 'var(--warn)',
  ROUGE: 'var(--bad)',
}

/** Departements rattachables a un projet (multi-selection). */
export const DEPARTEMENTS = [
  'Conseil',
  'Tech',
  'Data',
  'Marketing',
  'Ops',
  'RH',
  'Finance',
  'Sécurité',
] as const

export type Departement = (typeof DEPARTEMENTS)[number]

export const ROLES = ['COO', 'HEAD', 'DIRECTEUR', 'CONSULTANT', 'MEMBRE'] as const

export const ROLE_LABEL: Record<string, string> = {
  COO: 'COO',
  HEAD: 'Head',
  DIRECTEUR: 'Directeur',
  CONSULTANT: 'Consultant',
  MEMBRE: 'Membre',
}

export const PRIORITE_LABEL: Record<string, string> = {
  P0: 'P0 · Critique',
  P1: 'P1 · Haute',
  P2: 'P2 · Moyenne',
  P3: 'P3 · Basse',
}

export function initiales(nom: string | null | undefined) {
  if (!nom) return '—'
  return nom
    .split(/\s+/)
    .slice(0, 2)
    .map((mot) => mot.charAt(0).toUpperCase())
    .join('')
}

const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
})

/** « 12 mars ». Formate cote serveur pour eviter tout ecart d'hydratation. */
export function dateCourte(date: Date) {
  return FORMAT_DATE.format(date)
}

/** « il y a 3 h », « hier », « 12 mars » au-dela d'une semaine. */
export function tempsRelatif(date: Date, maintenant = new Date()) {
  const secondes = Math.round((maintenant.getTime() - date.getTime()) / 1000)
  if (secondes < 60) return "a l'instant"
  const minutes = Math.round(secondes / 60)
  if (minutes < 60) return `il y a ${minutes} min`
  const heures = Math.round(minutes / 60)
  if (heures < 24) return `il y a ${heures} h`
  const jours = Math.round(heures / 24)
  if (jours === 1) return 'hier'
  if (jours < 7) return `il y a ${jours} jours`
  return FORMAT_DATE.format(date)
}
