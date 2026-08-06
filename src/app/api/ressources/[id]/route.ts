import { type NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/blob'

import { prisma } from '@/lib/prisma'
import { estAdmin, utilisateurCourant } from '@/lib/autorisation'

/**
 * Sert les fichiers de ressources stockés sur le store Blob privé. Le blob
 * n'est pas accessible publiquement : cette route authentifie la session,
 * vérifie l'accès au projet (directeur, membre ou COO / HEAD), puis streame
 * le fichier.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const utilisateur = await utilisateurCourant()
  if (!utilisateur) {
    return new NextResponse('Connexion requise.', { status: 401 })
  }

  const ressource = await prisma.resource.findFirst({
    where: {
      id,
      type: 'FICHIER',
      project: estAdmin(utilisateur)
        ? {}
        : {
            OR: [
              { ownerId: utilisateur.id },
              { membres: { some: { id: utilisateur.id } } },
            ],
          },
    },
  })
  if (!ressource) {
    return new NextResponse('Fichier introuvable.', { status: 404 })
  }

  // Le chemin du blob est la partie chemin de l'URL stockée en base.
  const pathname = decodeURIComponent(new URL(ressource.url).pathname.slice(1))

  const resultat = await get(pathname, {
    access: 'private',
    // Laisse le navigateur revalider avec son ETag : réponse 304 sans
    // re-télécharger le fichier quand il n'a pas changé.
    ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
  })

  if (!resultat) {
    return new NextResponse('Fichier introuvable.', { status: 404 })
  }

  if (resultat.statusCode === 304) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: resultat.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    })
  }

  if (resultat.statusCode !== 200 || !resultat.stream) {
    return new NextResponse('Fichier introuvable.', { status: 404 })
  }

  const nom = ressource.nomFichier ?? ressource.titre
  return new NextResponse(resultat.stream, {
    headers: {
      'Content-Type': resultat.blob.contentType,
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(nom)}`,
      ETag: resultat.blob.etag,
      'Cache-Control': 'private, no-cache',
    },
  })
}
