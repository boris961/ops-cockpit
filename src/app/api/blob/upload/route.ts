import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

import { prisma } from '@/lib/prisma'
import { estAdmin, utilisateurCourant } from '@/lib/autorisation'

/** Meme plafond que cote client (ressources-projet.tsx) : 50 Mo. */
const TAILLE_MAX = 50 * 1024 * 1024

/**
 * Point d'entree des uploads de ressources : le navigateur demande ici un
 * jeton, puis envoie le fichier directement vers Vercel Blob (sans transiter
 * par le serveur — pas de limite de taille de requete). La ligne en base est
 * ensuite creee par la Server Action creerRessource.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const corps = (await request.json()) as HandleUploadBody

  try {
    const reponse = await handleUpload({
      body: corps,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // Meme garde que projetAccessible() : directeur, membre ou COO / HEAD.
        const utilisateur = await utilisateurCourant()
        if (!utilisateur) throw new Error('Session expirée — reconnectez-vous.')

        const { projectId } = JSON.parse(clientPayload ?? '{}') as { projectId?: string }
        if (!projectId) throw new Error('Projet manquant.')

        const projet = await prisma.project.findFirst({
          where: {
            id: projectId,
            ...(estAdmin(utilisateur)
              ? {}
              : {
                  OR: [
                    { ownerId: utilisateur.id },
                    { membres: { some: { id: utilisateur.id } } },
                  ],
                }),
          },
          select: { id: true },
        })
        if (!projet) {
          throw new Error("Accès refusé : vous n'avez pas accès à ce projet.")
        }

        return {
          addRandomSuffix: true,
          maximumSizeInBytes: TAILLE_MAX,
          tokenPayload: JSON.stringify({ userId: utilisateur.id, projectId }),
        }
      },
      // Jamais declenche en local (necessite une URL publique) : on n'en
      // depend pas, l'enregistrement passe par la Server Action.
      onUploadCompleted: async () => {},
    })

    return NextResponse.json(reponse)
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : 'Envoi impossible.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
