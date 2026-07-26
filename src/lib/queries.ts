import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { estAdmin, utilisateurCourant, type Utilisateur } from '@/lib/autorisation'

/**
 * Perimetre de lecture d'un utilisateur : tout pour COO / HEAD, sinon les
 * projets dont il est directeur ou membre. Toutes les lectures passent par la.
 */
function porteeProjets(utilisateur: Utilisateur | null): Prisma.ProjectWhereInput {
  if (!utilisateur) return { id: { in: [] } }
  if (estAdmin(utilisateur)) return {}
  return {
    OR: [{ ownerId: utilisateur.id }, { membres: { some: { id: utilisateur.id } } }],
  }
}

type Filtres = { porteur?: string; archives?: boolean }

function filtreOwner(porteur?: string): Prisma.ProjectWhereInput {
  return porteur ? { ownerId: porteur } : {}
}

/** Avancement derive des taches : terminees / total, arrondi. 0 % sans tache. */
function avancementCalcule(taches: ReadonlyArray<{ status: string }>) {
  if (taches.length === 0) return 0
  const terminees = taches.filter((tache) => tache.status === 'TERMINE').length
  return Math.round((terminees / taches.length) * 100)
}

export async function getOverview({ porteur }: Filtres = {}) {
  const utilisateur = await utilisateurCourant()
  const portee = porteeProjets(utilisateur)
  const owner = filtreOwner(porteur)

  const projetsVisibles: Prisma.ProjectWhereInput = { AND: [portee, owner] }
  const projetsActifsWhere: Prisma.ProjectWhereInput = {
    AND: [portee, owner, { status: { not: 'ARCHIVE' } }],
  }
  // Taches et blocages suivent le meme perimetre que les projets.
  const tachesVisibles: Prisma.TaskWhereInput = { project: projetsVisibles }

  const [projetsActifs, taches, blocages, tachesEnRetard, projetsBruts, activite] =
    await Promise.all([
      prisma.project.count({
        where: { AND: [portee, owner, { status: { notIn: ['ARCHIVE', 'TERMINE'] } }] },
      }),
      prisma.task.count({ where: tachesVisibles }),
      prisma.issue.findMany({
        where: { status: 'BLOQUE', project: projetsVisibles },
        include: { project: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.task.count({
        where: { AND: [tachesVisibles, { echeance: { lt: new Date() }, status: { not: 'TERMINE' } }] },
      }),
      prisma.project.findMany({
        where: projetsActifsWhere,
        include: { owner: true, taches: { select: { status: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.activity.findMany({
        // Les lignes sans projet (admin des comptes, suppression de projet) ne
        // remontent qu'aux roles transverses.
        where: utilisateur && estAdmin(utilisateur) ? {} : { project: projetsVisibles },
        include: { actor: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ])

  const projets = projetsBruts.map((projet) => ({
    ...projet,
    avancement: avancementCalcule(projet.taches),
  }))

  const avancementMoyen = projets.length
    ? Math.round(projets.reduce((somme, projet) => somme + projet.avancement, 0) / projets.length)
    : 0

  return {
    projetsActifs,
    taches,
    blocagesOuverts: blocages.length,
    tachesEnRetard,
    avancementMoyen,
    projets,
    blocages,
    activite,
  }
}

/**
 * Liste des projets. Les projets archives sont exclus des listes actives et ne
 * remontent que via le filtre « Archives ».
 */
export async function getProjets({ archives = false, porteur }: Filtres = {}) {
  const utilisateur = await utilisateurCourant()

  const projets = await prisma.project.findMany({
    where: {
      AND: [
        porteeProjets(utilisateur),
        filtreOwner(porteur),
        archives ? { status: 'ARCHIVE' } : { status: { not: 'ARCHIVE' } },
      ],
    },
    include: {
      owner: true,
      taches: { select: { status: true } },
      _count: { select: { blocages: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return projets.map((projet) => ({
    ...projet,
    avancement: avancementCalcule(projet.taches),
  }))
}

/** Compteurs du filtre actifs / archives, dans le perimetre de l'utilisateur. */
export async function getComptesProjets({ porteur }: Filtres = {}) {
  const utilisateur = await utilisateurCourant()
  const base = [porteeProjets(utilisateur), filtreOwner(porteur)]

  const [actifs, archives] = await Promise.all([
    prisma.project.count({ where: { AND: [...base, { status: { not: 'ARCHIVE' } }] } }),
    prisma.project.count({ where: { AND: [...base, { status: 'ARCHIVE' }] } }),
  ])
  return { actifs, archives }
}

/**
 * Detail complet d'un projet. Renvoie null si l'utilisateur n'y a pas acces :
 * la page appelante repond alors en 404.
 */
export async function getProjet(id: string) {
  const utilisateur = await utilisateurCourant()

  const projet = await prisma.project.findFirst({
    where: { AND: [{ id }, porteeProjets(utilisateur)] },
    include: {
      owner: true,
      membres: { orderBy: { name: 'asc' } },
      taches: {
        // L'ordre de l'enum TaskStatus suit le flux BACKLOG -> TERMINE.
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      },
      blocages: {
        include: { reporter: true, owner: true },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      },
      activites: {
        include: { actor: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!projet) return null
  return { ...projet, avancement: avancementCalcule(projet.taches) }
}

/** Utilisateurs proposes dans les selects (directeur, membres, filtre porteur). */
export async function getUtilisateurs() {
  return prisma.user.findMany({ orderBy: { name: 'asc' } })
}

/** Porteurs proposes au filtre : uniquement ceux qui portent un projet visible. */
export async function getPorteurs() {
  const utilisateur = await utilisateurCourant()

  const groupes = await prisma.project.groupBy({
    by: ['ownerId'],
    where: porteeProjets(utilisateur),
  })

  return prisma.user.findMany({
    where: { id: { in: groupes.map((groupe) => groupe.ownerId) } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

/** Page admin : utilisateurs et volume de projets portes. */
export async function getUtilisateursAdmin() {
  return prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { projets: true, projetsMembre: true } } },
  })
}
