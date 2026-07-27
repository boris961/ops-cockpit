'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type {
  ActivityType,
  Health,
  Priority,
  ProjectStatus,
  TaskStatus,
} from '@prisma/client'

import { prisma } from '@/lib/prisma'
import {
  estAdmin,
  exigerAdmin,
  exigerUtilisateur,
  peutModifierProjet,
  type Utilisateur,
} from '@/lib/autorisation'
import type { EtatAction } from '@/lib/action-state'
import {
  DEPARTEMENTS,
  PRIORITE_LABEL,
  ROLES,
  ROLE_LABEL,
  SANTE_LABEL,
  STATUT_LABEL,
} from '@/lib/cockpit'

const STATUTS_PROJET = [
  'CADRAGE',
  'EN_COURS',
  'A_RISQUE',
  'EN_VALIDATION',
  'TERMINE',
  'ARCHIVE',
] as const satisfies readonly ProjectStatus[]

const SANTES = ['VERT', 'ORANGE', 'ROUGE'] as const satisfies readonly Health[]

const STATUTS_TACHE = [
  'BACKLOG',
  'CETTE_SEMAINE',
  'EN_COURS',
  'EN_REVIEW',
  'TERMINE',
] as const satisfies readonly TaskStatus[]

const PRIORITES = ['P0', 'P1', 'P2', 'P3'] as const satisfies readonly Priority[]

/* ------------------------------------------------------------------ outils */

function texte(donnees: FormData, cle: string) {
  const valeur = donnees.get(cle)
  return typeof valeur === 'string' ? valeur.trim() : ''
}

/** Renvoie la valeur si elle appartient a la liste blanche, sinon null. */
function valeurEnum<T extends string>(liste: readonly T[], valeur: string): T | null {
  return (liste as readonly string[]).includes(valeur) ? (valeur as T) : null
}

function messageErreur(erreur: unknown) {
  return erreur instanceof Error ? erreur.message : 'Action impossible.'
}

function echec(erreur: unknown): EtatAction {
  return { erreur: messageErreur(erreur), ok: false }
}

const SUCCES: EtatAction = { erreur: null, ok: true }

function revalider(projectId?: string) {
  revalidatePath('/')
  revalidatePath('/projets')
  if (projectId) revalidatePath(`/projets/${projectId}`)
}

/** Journalise une ligne d'activite. Toute mutation passe par ici. */
async function journaliser(
  acteur: Utilisateur,
  type: ActivityType,
  message: string,
  projectId: string | null,
) {
  await prisma.activity.create({
    data: { actorId: acteur.id, projectId, type, message },
  })
}

/**
 * Garde de suivi : toute personne ayant acces au projet (directeur, membre ou
 * COO / HEAD) peut y deposer des notes et des replays. Plus large que
 * projetModifiable(), qui reste reserve au pilotage du projet lui-meme.
 */
async function projetAccessible(projectId: string) {
  const utilisateur = await exigerUtilisateur()
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
  })
  if (!projet) {
    throw new Error("Accès refusé : vous n'avez pas accès à ce projet.")
  }

  return { utilisateur, projet }
}

/** N'accepte que des liens http(s) : un href `javascript:` serait executable. */
function urlValide(brut: string) {
  let analysee: URL
  try {
    analysee = new URL(brut)
  } catch {
    throw new Error('URL invalide — elle doit commencer par https://')
  }
  if (analysee.protocol !== 'https:' && analysee.protocol !== 'http:') {
    throw new Error('Seuls les liens http(s) sont acceptés.')
  }
  return analysee.toString()
}

/**
 * Responsable assignable a une tache : le directeur du projet ou un membre de
 * l'equipe. Renvoie null pour « non assignee ».
 */
async function responsableAssignable(projectId: string, ownerId: string) {
  if (!ownerId) return null

  const projet = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ ownerId }, { membres: { some: { id: ownerId } } }],
    },
    select: { id: true },
  })
  if (!projet) {
    throw new Error("Ce responsable ne fait pas partie de l'équipe du projet.")
  }

  const utilisateur = await prisma.user.findUnique({ where: { id: ownerId } })
  if (!utilisateur) throw new Error('Utilisateur inconnu.')
  return utilisateur
}

/**
 * Charge le projet et verifie la garde de role : directeur du projet OU COO/HEAD.
 * Toute mutation de projet, de tache ou de resolution de blocage commence ici.
 */
async function projetModifiable(projectId: string) {
  const utilisateur = await exigerUtilisateur()
  if (!projectId) throw new Error('Projet manquant.')

  const projet = await prisma.project.findUnique({ where: { id: projectId } })
  if (!projet) throw new Error('Projet introuvable.')

  if (!peutModifierProjet(utilisateur, projet)) {
    throw new Error(
      'Modification refusée : seul le directeur du projet ou un profil COO / HEAD peut le modifier.',
    )
  }

  return { utilisateur, projet }
}

/* ------------------------------------------------------------------ projet */

/**
 * Met a jour un sous-ensemble de champs du projet (un champ par formulaire).
 * Chaque champ reellement modifie produit sa propre ligne d'activite.
 */
export async function modifierProjet(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const projectId = texte(donnees, 'projectId')
    const { utilisateur, projet } = await projetModifiable(projectId)

    const data: {
      nom?: string
      description?: string | null
      ownerId?: string
      status?: ProjectStatus
      sante?: Health
      prochainJalon?: string | null
      departements?: string[]
    } = {}
    const journal: Array<{ type: ActivityType; message: string }> = []

    if (donnees.has('nom')) {
      const nom = texte(donnees, 'nom')
      if (!nom) throw new Error('Le nom du projet ne peut pas être vide.')
      if (nom !== projet.nom) {
        data.nom = nom
        journal.push({ type: 'COMMENTAIRE', message: `a renommé le projet en « ${nom} »` })
      }
    }

    if (donnees.has('description')) {
      const description = texte(donnees, 'description')
      if (description !== (projet.description ?? '')) {
        data.description = description || null
        journal.push({ type: 'COMMENTAIRE', message: 'a mis à jour la description' })
      }
    }

    if (donnees.has('prochainJalon')) {
      const jalon = texte(donnees, 'prochainJalon')
      if (jalon !== (projet.prochainJalon ?? '')) {
        data.prochainJalon = jalon || null
        journal.push({
          type: 'COMMENTAIRE',
          message: jalon ? `a fixé le prochain jalon : « ${jalon} »` : 'a retiré le prochain jalon',
        })
      }
    }

    if (donnees.has('ownerId')) {
      const ownerId = texte(donnees, 'ownerId')
      const responsable = await prisma.user.findUnique({ where: { id: ownerId } })
      if (!responsable) throw new Error('Responsable inconnu.')
      if (ownerId !== projet.ownerId) {
        data.ownerId = ownerId
        journal.push({
          type: 'COMMENTAIRE',
          message: `a confié le projet à ${responsable.name}`,
        })
      }
    }

    if (donnees.has('status')) {
      const status = valeurEnum(STATUTS_PROJET, texte(donnees, 'status'))
      if (!status) throw new Error('Statut invalide.')
      if (status !== projet.status) {
        data.status = status
        journal.push({
          type: 'STATUT',
          message: `a fait passer le projet en « ${STATUT_LABEL[status]} »`,
        })
      }
    }

    if (donnees.has('sante')) {
      const sante = valeurEnum(SANTES, texte(donnees, 'sante'))
      if (!sante) throw new Error('Santé invalide.')
      if (sante !== projet.sante) {
        data.sante = sante
        journal.push({ type: 'SANTE', message: `a passé la santé en « ${SANTE_LABEL[sante]} »` })
      }
    }

    // L'avancement n'est plus saisi : il se deduit des taches terminees.

    // Marqueur explicite : une liste vide de cases cochees n'envoie aucune cle
    // « departements », il faut donc pouvoir tout retirer.
    if (donnees.has('departementsPresent')) {
      const choisis = donnees
        .getAll('departements')
        .filter((valeur): valeur is string => typeof valeur === 'string')
        .filter((valeur) => (DEPARTEMENTS as readonly string[]).includes(valeur))
      const inchange =
        choisis.length === projet.departements.length &&
        choisis.every((departement) => projet.departements.includes(departement))
      if (!inchange) {
        data.departements = choisis
        journal.push({
          type: 'COMMENTAIRE',
          message: choisis.length
            ? `a rattaché le projet à ${choisis.join(', ')}`
            : 'a retiré tous les départements du projet',
        })
      }
    }

    if (Object.keys(data).length === 0) return SUCCES

    await prisma.project.update({ where: { id: projet.id }, data })
    for (const ligne of journal) {
      await journaliser(utilisateur, ligne.type, ligne.message, projet.id)
    }

    revalider(projet.id)
    return SUCCES
  } catch (erreur) {
    return echec(erreur)
  }
}

export async function creerProjet(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  let nouveauId: string

  try {
    const utilisateur = await exigerUtilisateur()

    const nom = texte(donnees, 'nom')
    if (!nom) throw new Error('Le nom du projet est obligatoire.')

    const ownerId = texte(donnees, 'ownerId') || utilisateur.id
    const responsable = await prisma.user.findUnique({ where: { id: ownerId } })
    if (!responsable) throw new Error('Responsable inconnu.')

    const status = valeurEnum(STATUTS_PROJET, texte(donnees, 'status')) ?? 'CADRAGE'
    const description = texte(donnees, 'description')

    const projet = await prisma.project.create({
      data: { nom, description: description || null, ownerId, status },
    })
    nouveauId = projet.id

    await journaliser(
      utilisateur,
      'STATUT',
      `a créé le projet « ${nom} » (${STATUT_LABEL[status]}), confié à ${responsable.name}`,
      projet.id,
    )
    revalider(projet.id)
  } catch (erreur) {
    return echec(erreur)
  }

  // Hors du try : redirect() leve une exception de controle qu'il ne faut pas capturer.
  redirect(`/projets/${nouveauId}`)
}

export async function archiverProjet(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const projectId = texte(donnees, 'projectId')
    const { utilisateur, projet } = await projetModifiable(projectId)

    if (projet.status === 'ARCHIVE') return SUCCES

    await prisma.project.update({ where: { id: projet.id }, data: { status: 'ARCHIVE' } })
    await journaliser(utilisateur, 'STATUT', `a archivé le projet « ${projet.nom} »`, projet.id)

    revalider(projet.id)
    return SUCCES
  } catch (erreur) {
    return echec(erreur)
  }
}

/** Supprime le projet, ses taches, ses blocages et son fil d'activite. */
export async function supprimerProjet(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const projectId = texte(donnees, 'projectId')
    const { utilisateur, projet } = await projetModifiable(projectId)

    await prisma.$transaction([
      prisma.task.deleteMany({ where: { projectId: projet.id } }),
      prisma.issue.deleteMany({ where: { projectId: projet.id } }),
      prisma.activity.deleteMany({ where: { projectId: projet.id } }),
      prisma.project.delete({ where: { id: projet.id } }),
    ])

    // Le projet n'existe plus : la trace reste au niveau global (projectId null).
    await journaliser(utilisateur, 'STATUT', `a supprimé le projet « ${projet.nom} »`, null)

    revalider()
  } catch (erreur) {
    return echec(erreur)
  }

  redirect('/projets')
}

/* ------------------------------------------------------------------ taches */

export async function creerTache(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const projectId = texte(donnees, 'projectId')
    const { utilisateur, projet } = await projetModifiable(projectId)

    const titre = texte(donnees, 'titre')
    if (!titre) throw new Error('Le titre de la tâche est obligatoire.')

    const status = valeurEnum(STATUTS_TACHE, texte(donnees, 'status')) ?? 'BACKLOG'
    const priorite = valeurEnum(PRIORITES, texte(donnees, 'priorite'))
    const echeanceBrute = texte(donnees, 'echeance')
    const echeance = echeanceBrute ? new Date(echeanceBrute) : null
    if (echeance && Number.isNaN(echeance.getTime())) throw new Error('Échéance invalide.')

    const responsable = await responsableAssignable(projet.id, texte(donnees, 'ownerId'))

    await prisma.task.create({
      data: {
        projectId: projet.id,
        titre,
        status,
        priorite,
        echeance,
        ownerId: responsable?.id ?? null,
      },
    })
    await journaliser(
      utilisateur,
      'TACHE_CREEE',
      responsable
        ? `a créé la tâche « ${titre} », confiée à ${responsable.name}`
        : `a créé la tâche « ${titre} »`,
      projet.id,
    )

    revalider(projet.id)
    return SUCCES
  } catch (erreur) {
    return echec(erreur)
  }
}

export async function modifierTache(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const tacheId = texte(donnees, 'tacheId')
    const tache = await prisma.task.findUnique({ where: { id: tacheId } })
    if (!tache) throw new Error('Tâche introuvable.')

    const { utilisateur, projet } = await projetModifiable(tache.projectId)

    const data: {
      titre?: string
      status?: TaskStatus
      priorite?: Priority | null
      echeance?: Date | null
      ownerId?: string | null
    } = {}
    const journal: Array<{ type: ActivityType; message: string }> = []

    if (donnees.has('titre')) {
      const titre = texte(donnees, 'titre')
      if (!titre) throw new Error('Le titre de la tâche ne peut pas être vide.')
      if (titre !== tache.titre) {
        data.titre = titre
        journal.push({
          type: 'COMMENTAIRE',
          message: `a renommé la tâche « ${tache.titre} » en « ${titre} »`,
        })
      }
    }

    if (donnees.has('status')) {
      const status = valeurEnum(STATUTS_TACHE, texte(donnees, 'status'))
      if (!status) throw new Error('Statut de tâche invalide.')
      if (status !== tache.status) {
        data.status = status
        journal.push(
          status === 'TERMINE'
            ? { type: 'TACHE_FAITE', message: `a terminé la tâche « ${tache.titre} »` }
            : {
                type: 'COMMENTAIRE',
                message: `a passé la tâche « ${tache.titre} » en ${status.replace('_', ' ').toLowerCase()}`,
              },
        )
      }
    }

    if (donnees.has('priorite')) {
      const brute = texte(donnees, 'priorite')
      const priorite = brute ? valeurEnum(PRIORITES, brute) : null
      if (brute && !priorite) throw new Error('Priorité invalide.')
      if (priorite !== tache.priorite) {
        data.priorite = priorite
        journal.push({
          type: 'COMMENTAIRE',
          message: priorite
            ? `a mis la tâche « ${tache.titre} » en ${PRIORITE_LABEL[priorite]}`
            : `a retiré la priorité de la tâche « ${tache.titre} »`,
        })
      }
    }

    if (donnees.has('echeance')) {
      const brute = texte(donnees, 'echeance')
      const echeance = brute ? new Date(brute) : null
      if (echeance && Number.isNaN(echeance.getTime())) throw new Error('Échéance invalide.')
      const inchangee = (tache.echeance?.getTime() ?? null) === (echeance?.getTime() ?? null)
      if (!inchangee) {
        data.echeance = echeance
        journal.push({
          type: 'COMMENTAIRE',
          message: echeance
            ? `a fixé l'échéance de « ${tache.titre} » au ${echeance.toLocaleDateString('fr-FR')}`
            : `a retiré l'échéance de « ${tache.titre} »`,
        })
      }
    }

    if (donnees.has('ownerId')) {
      const responsable = await responsableAssignable(projet.id, texte(donnees, 'ownerId'))
      const nouvelId = responsable?.id ?? null
      if (nouvelId !== tache.ownerId) {
        data.ownerId = nouvelId
        journal.push({
          type: 'COMMENTAIRE',
          message: responsable
            ? `a confié la tâche « ${tache.titre} » à ${responsable.name}`
            : `a retiré le responsable de la tâche « ${tache.titre} »`,
        })
      }
    }

    if (Object.keys(data).length === 0) return SUCCES

    await prisma.task.update({ where: { id: tache.id }, data })
    for (const ligne of journal) {
      await journaliser(utilisateur, ligne.type, ligne.message, projet.id)
    }

    revalider(projet.id)
    return SUCCES
  } catch (erreur) {
    return echec(erreur)
  }
}

export async function supprimerTache(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const tacheId = texte(donnees, 'tacheId')
    const tache = await prisma.task.findUnique({ where: { id: tacheId } })
    if (!tache) throw new Error('Tâche introuvable.')

    const { utilisateur, projet } = await projetModifiable(tache.projectId)

    await prisma.task.delete({ where: { id: tache.id } })
    await journaliser(utilisateur, 'COMMENTAIRE', `a supprimé la tâche « ${tache.titre} »`, projet.id)

    revalider(projet.id)
    return SUCCES
  } catch (erreur) {
    return echec(erreur)
  }
}

/* ------------------------------------------------------------- membres */

/** Ajoute un membre au projet : il gagne l'acces en lecture a ce projet. */
export async function ajouterMembre(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const projectId = texte(donnees, 'projectId')
    const { utilisateur, projet } = await projetModifiable(projectId)

    const membreId = texte(donnees, 'membreId')
    const membre = await prisma.user.findUnique({ where: { id: membreId } })
    if (!membre) throw new Error('Utilisateur inconnu.')
    if (membre.id === projet.ownerId) {
      throw new Error('Le directeur du projet y a déjà accès.')
    }

    await prisma.project.update({
      where: { id: projet.id },
      data: { membres: { connect: { id: membre.id } } },
    })
    await journaliser(utilisateur, 'COMMENTAIRE', `a ajouté ${membre.name} à l'équipe`, projet.id)

    revalider(projet.id)
    return SUCCES
  } catch (erreur) {
    return echec(erreur)
  }
}

export async function retirerMembre(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const projectId = texte(donnees, 'projectId')
    const { utilisateur, projet } = await projetModifiable(projectId)

    const membreId = texte(donnees, 'membreId')
    const membre = await prisma.user.findUnique({ where: { id: membreId } })
    if (!membre) throw new Error('Utilisateur inconnu.')

    await prisma.project.update({
      where: { id: projet.id },
      data: { membres: { disconnect: { id: membre.id } } },
    })
    await journaliser(
      utilisateur,
      'COMMENTAIRE',
      `a retiré ${membre.name} de l'équipe`,
      projet.id,
    )

    revalider(projet.id)
    return SUCCES
  } catch (erreur) {
    return echec(erreur)
  }
}

/* ------------------------------------------------------------------ notes */

export async function creerNote(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const projectId = texte(donnees, 'projectId')
    const { utilisateur, projet } = await projetAccessible(projectId)

    const contenu = texte(donnees, 'contenu')
    if (!contenu) throw new Error('La note est vide.')

    // Une note nait en brouillon ; la publication est un geste explicite.
    const publiee = texte(donnees, 'publiee') === '1'

    await prisma.note.create({
      data: { projectId: projet.id, auteurId: utilisateur.id, contenu, publiee },
    })
    await journaliser(
      utilisateur,
      'COMMENTAIRE',
      publiee ? 'a publié une note de suivi' : 'a rédigé une note de suivi (brouillon)',
      projet.id,
    )

    revalider(projet.id)
    return SUCCES
  } catch (erreur) {
    return echec(erreur)
  }
}

/** Edite le contenu et/ou l'etat de publication d'une note. */
export async function modifierNote(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const noteId = texte(donnees, 'noteId')
    const note = await prisma.note.findUnique({ where: { id: noteId } })
    if (!note) throw new Error('Note introuvable.')

    const { utilisateur, projet } = await projetAccessible(note.projectId)

    const data: { contenu?: string; publiee?: boolean } = {}
    const journal: string[] = []

    if (donnees.has('contenu')) {
      const contenu = texte(donnees, 'contenu')
      if (!contenu) throw new Error('La note ne peut pas être vide.')
      if (contenu !== note.contenu) {
        data.contenu = contenu
        journal.push('a modifié une note de suivi')
      }
    }

    if (donnees.has('publiee')) {
      const publiee = texte(donnees, 'publiee') === '1'
      if (publiee !== note.publiee) {
        data.publiee = publiee
        journal.push(publiee ? 'a publié une note de suivi' : 'a repassé une note en brouillon')
      }
    }

    if (Object.keys(data).length === 0) return SUCCES

    await prisma.note.update({ where: { id: note.id }, data })
    for (const message of journal) {
      await journaliser(utilisateur, 'COMMENTAIRE', message, projet.id)
    }

    revalider(projet.id)
    return SUCCES
  } catch (erreur) {
    return echec(erreur)
  }
}

export async function supprimerNote(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const noteId = texte(donnees, 'noteId')
    const note = await prisma.note.findUnique({ where: { id: noteId } })
    if (!note) throw new Error('Note introuvable.')

    const { utilisateur, projet } = await projetAccessible(note.projectId)

    await prisma.note.delete({ where: { id: note.id } })
    await journaliser(utilisateur, 'COMMENTAIRE', 'a supprimé une note de suivi', projet.id)

    revalider(projet.id)
    return SUCCES
  } catch (erreur) {
    return echec(erreur)
  }
}

/* ---------------------------------------------------------------- replays */

export async function creerReplay(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const projectId = texte(donnees, 'projectId')
    const { utilisateur, projet } = await projetAccessible(projectId)

    const titre = texte(donnees, 'titre')
    if (!titre) throw new Error('Le titre du replay est obligatoire.')

    const url = urlValide(texte(donnees, 'url'))

    const dateBrute = texte(donnees, 'date')
    const date = dateBrute ? new Date(dateBrute) : null
    if (date && Number.isNaN(date.getTime())) throw new Error('Date invalide.')

    await prisma.replay.create({ data: { projectId: projet.id, titre, url, date } })
    await journaliser(utilisateur, 'LIVRABLE', `a ajouté le replay « ${titre} »`, projet.id)

    revalider(projet.id)
    return SUCCES
  } catch (erreur) {
    return echec(erreur)
  }
}

export async function modifierReplay(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const replayId = texte(donnees, 'replayId')
    const replay = await prisma.replay.findUnique({ where: { id: replayId } })
    if (!replay) throw new Error('Replay introuvable.')

    const { utilisateur, projet } = await projetAccessible(replay.projectId)

    const data: { titre?: string; url?: string; date?: Date | null } = {}

    if (donnees.has('titre')) {
      const titre = texte(donnees, 'titre')
      if (!titre) throw new Error('Le titre du replay ne peut pas être vide.')
      if (titre !== replay.titre) data.titre = titre
    }

    if (donnees.has('url')) {
      const url = urlValide(texte(donnees, 'url'))
      if (url !== replay.url) data.url = url
    }

    if (donnees.has('date')) {
      const brute = texte(donnees, 'date')
      const date = brute ? new Date(brute) : null
      if (date && Number.isNaN(date.getTime())) throw new Error('Date invalide.')
      if ((replay.date?.getTime() ?? null) !== (date?.getTime() ?? null)) data.date = date
    }

    if (Object.keys(data).length === 0) return SUCCES

    await prisma.replay.update({ where: { id: replay.id }, data })
    await journaliser(
      utilisateur,
      'LIVRABLE',
      `a mis à jour le replay « ${data.titre ?? replay.titre} »`,
      projet.id,
    )

    revalider(projet.id)
    return SUCCES
  } catch (erreur) {
    return echec(erreur)
  }
}

export async function supprimerReplay(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const replayId = texte(donnees, 'replayId')
    const replay = await prisma.replay.findUnique({ where: { id: replayId } })
    if (!replay) throw new Error('Replay introuvable.')

    const { utilisateur, projet } = await projetAccessible(replay.projectId)

    await prisma.replay.delete({ where: { id: replay.id } })
    await journaliser(
      utilisateur,
      'LIVRABLE',
      `a supprimé le replay « ${replay.titre} »`,
      projet.id,
    )

    revalider(projet.id)
    return SUCCES
  } catch (erreur) {
    return echec(erreur)
  }
}

/* ------------------------------------------------------------ utilisateurs */

/**
 * Cree ou met a jour une ligne User. La personne heritera de ce role a sa
 * premiere connexion Google : l'authentification n'est pas touchee ici.
 */
export async function enregistrerUtilisateur(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const admin = await exigerAdmin()

    const email = texte(donnees, 'email').toLowerCase()
    if (!email || !email.includes('@')) throw new Error('Adresse e-mail invalide.')

    const name = texte(donnees, 'name')
    if (!name) throw new Error('Le nom est obligatoire.')

    const role = valeurEnum(ROLES, texte(donnees, 'role')) ?? 'MEMBRE'

    const existant = await prisma.user.findUnique({ where: { email } })
    await prisma.user.upsert({
      where: { email },
      update: { name, role },
      create: { email, name, role },
    })

    await journaliser(
      admin,
      'COMMENTAIRE',
      existant
        ? `a mis à jour le compte de ${name} (${ROLE_LABEL[role]})`
        : `a créé le compte de ${name} (${ROLE_LABEL[role]})`,
      null,
    )

    revalidatePath('/utilisateurs')
    revalider()
    return SUCCES
  } catch (erreur) {
    return echec(erreur)
  }
}

export async function modifierRoleUtilisateur(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const admin = await exigerAdmin()

    const utilisateurId = texte(donnees, 'utilisateurId')
    const cible = await prisma.user.findUnique({ where: { id: utilisateurId } })
    if (!cible) throw new Error('Utilisateur inconnu.')

    const role = valeurEnum(ROLES, texte(donnees, 'role'))
    if (!role) throw new Error('Rôle invalide.')
    if (role === cible.role) return SUCCES

    await prisma.user.update({ where: { id: cible.id }, data: { role } })
    await journaliser(
      admin,
      'COMMENTAIRE',
      `a fait passer ${cible.name} en ${ROLE_LABEL[role]}`,
      null,
    )

    revalidatePath('/utilisateurs')
    revalider()
    return SUCCES
  } catch (erreur) {
    return echec(erreur)
  }
}

/* ---------------------------------------------------------------- blocages */

/** Signaler un blocage est ouvert a tous les utilisateurs connectes. */
export async function creerBlocage(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const utilisateur = await exigerUtilisateur()

    const projectId = texte(donnees, 'projectId')
    const projet = await prisma.project.findUnique({ where: { id: projectId } })
    if (!projet) throw new Error('Projet introuvable.')

    const titre = texte(donnees, 'titre')
    if (!titre) throw new Error('Le titre du blocage est obligatoire.')

    const priorite = valeurEnum(PRIORITES, texte(donnees, 'priorite')) ?? 'P2'
    const description = texte(donnees, 'description')

    await prisma.issue.create({
      data: {
        titre,
        description: description || null,
        projectId: projet.id,
        reporterId: utilisateur.id,
        priorite,
        status: 'BLOQUE',
      },
    })
    await journaliser(
      utilisateur,
      'BLOCAGE_CREE',
      `a signalé le blocage « ${titre} » (${PRIORITE_LABEL[priorite]})`,
      projet.id,
    )

    revalider(projet.id)
    return SUCCES
  } catch (erreur) {
    return echec(erreur)
  }
}

export async function resoudreBlocage(
  _etatPrecedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  try {
    const blocageId = texte(donnees, 'blocageId')
    const blocage = await prisma.issue.findUnique({ where: { id: blocageId } })
    if (!blocage) throw new Error('Blocage introuvable.')
    if (!blocage.projectId) throw new Error('Blocage sans projet rattaché.')

    const { utilisateur, projet } = await projetModifiable(blocage.projectId)

    if (blocage.status === 'CLOTURE') return SUCCES

    await prisma.issue.update({
      where: { id: blocage.id },
      data: { status: 'CLOTURE', resolvedAt: new Date() },
    })
    await journaliser(
      utilisateur,
      'BLOCAGE_RESOLU',
      `a résolu le blocage « ${blocage.titre} »`,
      projet.id,
    )

    revalider(projet.id)
    return SUCCES
  } catch (erreur) {
    return echec(erreur)
  }
}
