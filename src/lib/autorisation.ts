import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

/** Roles qui peuvent editer n'importe quel projet, sans en etre le directeur. */
const ROLES_TRANSVERSES = ['COO', 'HEAD']

export type Utilisateur = {
  id: string
  name: string
  email: string
  role: string
}

/** Utilisateur de la session, resolu en base (source de verite pour l'id et le role). */
export async function utilisateurCourant(): Promise<Utilisateur | null> {
  const session = await auth()
  const email = session?.user?.email
  if (!email) return null
  return prisma.user.findUnique({ where: { email } })
}

export async function exigerUtilisateur(): Promise<Utilisateur> {
  const utilisateur = await utilisateurCourant()
  if (!utilisateur) {
    throw new Error('Session expirée — reconnectez-vous.')
  }
  return utilisateur
}

/** Role transverse : voit et administre tout (COO / HEAD). */
export function estAdmin(utilisateur: Pick<Utilisateur, 'role'>) {
  return ROLES_TRANSVERSES.includes(utilisateur.role)
}

/** Directeur du projet OU role transverse (COO / HEAD). */
export function peutModifierProjet(
  utilisateur: Pick<Utilisateur, 'id' | 'role'>,
  projet: { ownerId: string },
) {
  return projet.ownerId === utilisateur.id || estAdmin(utilisateur)
}

/** Reserve aux roles transverses : administration des utilisateurs. */
export async function exigerAdmin(): Promise<Utilisateur> {
  const utilisateur = await exigerUtilisateur()
  if (!estAdmin(utilisateur)) {
    throw new Error('Action réservée aux profils COO / HEAD.')
  }
  return utilisateur
}
