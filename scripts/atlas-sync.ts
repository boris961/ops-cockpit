/**
 * 🎩 Jarvis — Sync Cockpit → Atlas Brain
 * =======================================
 * Descend l'état live d'ops-cockpit (Neon Postgres, via Prisma) dans le vault
 * Obsidian Atlas-Brain, en respectant le contrat des cartes projet :
 *
 *   - Front-matter mis à jour : `sante` (🟢🟠🔴), `statut` (actif|bloqué|terminé),
 *     `echeance` (si dateCible en base), + clés `cockpit_*` (id, avancement, maj…).
 *   - JAMAIS touchés : `type`, `domaine`, `owner`, `prochaine`, `revue`,
 *     `execution`, `sensitivity`, `tags` — et toute la prose de la carte.
 *   - Un bloc délimité `%% cockpit:debut %% … %% cockpit:fin %%` est (ré)écrit
 *     en fin de carte : jalon, tâches, blocages, dernière activité.
 *   - Une note « 🎛️ Cockpit — Synthèse.md » est régénérée dans 05_Projects/.
 *
 * La « 🗼 Tour de contrôle » (Dataview) se met à jour toute seule puisqu'elle
 * lit `sante` / `statut` / `echeance` des cartes.
 *
 * Usage (depuis la racine du projet ops-cockpit) :
 *   npx tsx scripts/atlas-sync.ts --dry-run   # montre ce qui serait fait (1er lancement conseillé)
 *   npx tsx scripts/atlas-sync.ts             # applique
 *   npx tsx scripts/atlas-sync.ts --creer     # + crée une carte pour les projets cockpit sans carte
 *
 * Env : DIRECT_DB (lu depuis .env), ATLAS_VAULT (défaut: ~/Documents/Atlas-Brain),
 *       COCKPIT_URL (défaut: http://localhost:3000)
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

/* ------------------------------------------------------------------ env */

const REPO = process.cwd()

/** Charge .env à la racine du repo sans dépendance externe. */
function chargerEnv() {
  const fichier = path.join(REPO, '.env')
  if (!fs.existsSync(fichier)) return
  for (const ligne of fs.readFileSync(fichier, 'utf8').split('\n')) {
    const m = ligne.match(/^([A-Z0-9_]+)=("?)(.*)\2\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[3]
  }
}
chargerEnv()

const VAULT = process.env.ATLAS_VAULT ?? path.join(os.homedir(), 'Documents', 'Atlas-Brain')
const DOSSIER_PROJETS = path.join(VAULT, '05_Projects')
const COCKPIT_URL = (process.env.COCKPIT_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const NOTE_SYNTHESE = path.join(DOSSIER_PROJETS, '🎛️ Cockpit — Synthèse.md')

const DRY_RUN = process.argv.includes('--dry-run')
const CREER = process.argv.includes('--creer')

const MARQUEUR_DEBUT = '%% cockpit:debut %%'
const MARQUEUR_FIN = '%% cockpit:fin %%'

/* ------------------------------------------------------------- vocabulaire */

const SANTE_EMOJI: Record<string, string> = { VERT: '🟢', ORANGE: '🟠', ROUGE: '🔴' }
const SANTE_LABEL: Record<string, string> = { VERT: 'Au vert', ORANGE: 'Sous surveillance', ROUGE: 'En alerte' }
const STATUT_LABEL: Record<string, string> = {
  CADRAGE: 'Cadrage', EN_COURS: 'En cours', A_RISQUE: 'À risque',
  EN_VALIDATION: 'En validation', TERMINE: 'Terminé', ARCHIVE: 'Archivé',
}
const ISSUE_LABEL: Record<string, string> = {
  NEW: 'Nouveau', QUALIFIE: 'Qualifié', EN_COURS: 'En cours',
  BLOQUE: 'Bloqué', A_VERIFIER: 'À vérifier', CLOTURE: 'Clôturé',
}
const TACHE_LABEL: Record<string, string> = {
  BACKLOG: 'Backlog', CETTE_SEMAINE: 'Cette semaine', EN_COURS: 'En cours',
  EN_REVIEW: 'En review', TERMINE: 'Terminé',
}

/* --------------------------------------------------------------- helpers */

const fmtDate = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' }).format(d) : ''
const isoJour = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '')
const maintenant = new Date()
const horodatage = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris',
}).format(maintenant)

/** Normalisation pour l'appariement nom de projet ↔ nom de carte. */
function normaliser(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase()
}

/** Avancement affiché : dérivé des tâches comme dans l'app ; colonne stockée si aucune tâche. */
function avancement(p: { avancement: number; taches: { status: string }[] }) {
  if (p.taches.length === 0) return p.avancement
  return Math.round((p.taches.filter((t) => t.status === 'TERMINE').length / p.taches.length) * 100)
}

const joursDepuis = (d: Date) => Math.max(0, Math.floor((maintenant.getTime() - d.getTime()) / 86_400_000))

/* ----------------------------------------------------- front-matter (texte) */

/** Remplace (ou insère avant le `---` fermant) une clé du front-matter, sans toucher au reste. */
function poserCle(texte: string, cle: string, valeur: string): string {
  const fin = texte.indexOf('\n---', 3)
  if (!texte.startsWith('---') || fin === -1) {
    return `---\n${cle}: ${valeur}\n---\n\n${texte}` // pas de front-matter : on en crée un
  }
  const bloc = texte.slice(0, fin)
  const regex = new RegExp(`^${cle}:.*$`, 'm')
  if (regex.test(bloc)) return bloc.replace(regex, `${cle}: ${valeur}`) + texte.slice(fin)
  return bloc + `\n${cle}: ${valeur}` + texte.slice(fin)
}

function lireFrontMatter(texte: string): Record<string, string> {
  const m = texte.match(/^---\n([\s\S]*?)\n---/)
  const fm: Record<string, string> = {}
  if (!m) return fm
  for (const ligne of m[1].split('\n')) {
    const kv = ligne.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (kv) fm[kv[1]] = kv[2].replace(/^"|"$/g, '')
  }
  return fm
}

/* ------------------------------------------------------------ bloc cockpit */

type ProjetComplet = Awaited<ReturnType<typeof chargerProjets>>[number]

function blocCockpit(p: ProjetComplet): string {
  const av = avancement(p)
  const total = p.taches.length
  const faites = p.taches.filter((t) => t.status === 'TERMINE').length
  const retard = p.taches.filter((t) => t.echeance && t.echeance < maintenant && t.status !== 'TERMINE')
  const lignes: string[] = []

  lignes.push(MARQUEUR_DEBUT)
  lignes.push('## 🎛️ Cockpit — live')
  lignes.push(`> Bloc géré par Jarvis (sync ops-cockpit). Édité automatiquement — dernière màj : ${horodatage}.`)
  lignes.push('')

  const jalon = p.prochainJalon ? ` — jalon : **${p.prochainJalon}**${p.dateCible ? ` (cible ${fmtDate(p.dateCible)})` : ''}` : ''
  lignes.push(
    `**${STATUT_LABEL[p.status] ?? p.status} · ${SANTE_EMOJI[p.sante] ?? ''} ${SANTE_LABEL[p.sante] ?? ''} · ${av}%** ` +
    `(${faites}/${total} tâches${retard.length ? `, ${retard.length} en retard ⚠️` : ''})${jalon}`,
  )

  if (p.blocages.length) {
    lignes.push('', `**Blocages ouverts (${p.blocages.length})**`)
    for (const b of p.blocages) {
      const feu = b.priorite === 'P0' ? '🔥 ' : ''
      lignes.push(
        `- ${feu}**${b.priorite}** « ${b.titre} » — ${ISSUE_LABEL[b.status] ?? b.status}` +
        ` · porteur : ${b.owner?.name ?? '—'} · depuis ${joursDepuis(b.createdAt)} j`,
      )
    }
  }

  if (retard.length) {
    lignes.push('', `**Tâches en retard (${retard.length})**`)
    for (const t of retard.slice(0, 5)) {
      lignes.push(`- ⏰ ${t.titre} — ${t.owner?.name ?? 'non assignée'}, échue le ${fmtDate(t.echeance)}`)
    }
    if (retard.length > 5) lignes.push(`- … et ${retard.length - 5} autre(s)`)
  }

  const enCours = p.taches.filter((t) => t.status === 'EN_COURS' || t.status === 'EN_REVIEW')
  if (enCours.length) {
    lignes.push('', `**En cours / en review (${enCours.length})**`)
    for (const t of enCours.slice(0, 5)) {
      lignes.push(`- ${TACHE_LABEL[t.status]} · ${t.titre} — ${t.owner?.name ?? 'non assignée'}${t.echeance ? ` (échéance ${fmtDate(t.echeance)})` : ''}`)
    }
    if (enCours.length > 5) lignes.push(`- … et ${enCours.length - 5} autre(s)`)
  }

  if (p.activites.length) {
    lignes.push('', '**Dernière activité**')
    for (const a of p.activites) lignes.push(`- ${fmtDate(a.createdAt)} — ${a.actor.name} ${a.message}`)
  }

  lignes.push('', `[Ouvrir dans le cockpit](${COCKPIT_URL}/projets/${p.id})`)
  lignes.push(MARQUEUR_FIN)
  return lignes.join('\n')
}

function injecterBloc(texte: string, bloc: string): string {
  const regex = /%% cockpit:debut %%[\s\S]*?%% cockpit:fin %%/
  if (regex.test(texte)) return texte.replace(regex, bloc)
  return texte.replace(/\s*$/, '') + '\n\n' + bloc + '\n'
}

/* -------------------------------------------------------------- données DB */

async function chargerProjets() {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_DB } } })
  const projets = await prisma.project.findMany({
    where: { status: { not: 'ARCHIVE' } },
    include: {
      owner: true,
      taches: { include: { owner: true }, orderBy: [{ status: 'asc' }, { echeance: 'asc' }] },
      blocages: {
        where: { status: { not: 'CLOTURE' } },
        include: { owner: true, reporter: true },
        orderBy: [{ priorite: 'asc' }, { createdAt: 'asc' }],
      },
      activites: { include: { actor: true }, orderBy: { createdAt: 'desc' }, take: 3 },
    },
    orderBy: { updatedAt: 'desc' },
  })
  await prisma.$disconnect()
  return projets
}

/* ------------------------------------------------------------- appariement */

type Carte = { fichier: string; chemin: string; texte: string; fm: Record<string, string> }

function chargerCartes(): Carte[] {
  return fs
    .readdirSync(DOSSIER_PROJETS)
    .filter((f) => f.endsWith('.md') && !f.startsWith('🗼') && !f.startsWith('🎛️'))
    .map((fichier) => {
      const chemin = path.join(DOSSIER_PROJETS, fichier)
      const texte = fs.readFileSync(chemin, 'utf8')
      return { fichier, chemin, texte, fm: lireFrontMatter(texte) }
    })
}

function apparier(projet: { id: string; nom: string }, cartes: Carte[]): Carte | 'ambigu' | null {
  const parId = cartes.find((c) => c.fm.cockpit_id === projet.id)
  if (parId) return parId
  const cible = normaliser(projet.nom)
  if (cible.length < 4) return null
  const candidats = cartes.filter((c) => {
    if (c.fm.cockpit_id) return false // déjà lié à un autre projet
    const nom = normaliser(c.fichier.replace(/\.md$/, ''))
    return nom === cible || nom.includes(cible) || cible.includes(nom)
  })
  if (candidats.length === 1) return candidats[0]
  return candidats.length > 1 ? 'ambigu' : null
}

/* ------------------------------------------------------- création de carte */

function nouvelleCarte(p: ProjetComplet): string {
  const fm = [
    '---',
    'type: project',
    'domaine: ENT',
    `statut: ${p.status === 'TERMINE' ? 'terminé' : 'actif'}`,
    `sante: ${SANTE_EMOJI[p.sante] ?? '🟢'}`,
    `owner: "[[${p.owner.name}]]"`,
    `prochaine: "${(p.prochainJalon ?? 'À définir').replace(/"/g, "'")}"`,
    `echeance: ${isoJour(p.dateCible)}`,
    'revue: ',
    `execution: "ops-cockpit — ${COCKPIT_URL}/projets/${p.id}"`,
    'sensitivity: confidential',
    'tags: [projet, cockpit]',
    `cockpit_id: ${p.id}`,
    '---',
  ].join('\n')
  const corps = [
    '',
    `# ${p.nom}`,
    '',
    `> ${p.description ?? 'Carte créée automatiquement depuis ops-cockpit.'}`,
    '',
    blocCockpit(p),
    '',
    '## Liens',
    '- [[🗼 Tour de contrôle - Projets en cours]]',
    '',
  ].join('\n')
  return fm + corps
}

/* ---------------------------------------------------------------- synthèse */

function noteSynthese(projets: ProjetComplet[], liaisons: Map<string, string>, sansCarte: ProjetComplet[]): string {
  const actifs = projets.filter((p) => p.status !== 'TERMINE')
  const avMoyen = actifs.length
    ? Math.round(actifs.reduce((s, p) => s + avancement(p), 0) / actifs.length)
    : 0
  const blocages = projets.flatMap((p) => p.blocages.map((b) => ({ ...b, projet: p.nom })))
  const retards = projets.flatMap((p) =>
    p.taches
      .filter((t) => t.echeance && t.echeance < maintenant && t.status !== 'TERMINE')
      .map((t) => ({ ...t, projet: p.nom })),
  )

  const l: string[] = []
  l.push('---')
  l.push('type: dashboard')
  l.push('source: cockpit')
  l.push('tags: [dashboard, cockpit, jarvis]')
  l.push(`cockpit_maj: ${maintenant.toISOString().slice(0, 16)}`)
  l.push('---')
  l.push('')
  l.push('# 🎛️ Cockpit — Synthèse')
  l.push('')
  l.push(`> Note générée par Jarvis (\`atlas-sync\`) — **ne pas éditer**, toute modification sera écrasée. Dernière màj : ${horodatage}.`)
  l.push('')
  l.push(`**${actifs.length} projets actifs** · avancement moyen **${avMoyen}%** · **${blocages.length} blocage(s) ouvert(s)** (dont ${blocages.filter((b) => b.priorite === 'P0' || b.priorite === 'P1').length} P0/P1) · **${retards.length} tâche(s) en retard**`)
  l.push('')
  l.push('| Santé | Projet | Statut | Avanc. | ⏰ | Blocages | Cible | Owner |')
  l.push('|---|---|---|---|---|---|---|---|')
  for (const p of projets) {
    const lien = liaisons.get(p.id)
    const nom = lien ? `[[${lien.replace(/\.md$/, '')}]]` : p.nom
    const retard = p.taches.filter((t) => t.echeance && t.echeance < maintenant && t.status !== 'TERMINE').length
    l.push(
      `| ${SANTE_EMOJI[p.sante] ?? ''} | ${nom} | ${STATUT_LABEL[p.status] ?? p.status} | ${avancement(p)}% | ${retard || ''} | ${p.blocages.length || ''} | ${isoJour(p.dateCible)} | ${p.owner.name} |`,
    )
  }
  if (blocages.length) {
    l.push('', '## 🚨 Blocages ouverts')
    for (const b of blocages.sort((a, z) => a.priorite.localeCompare(z.priorite))) {
      l.push(`- ${b.priorite === 'P0' ? '🔥 ' : ''}**${b.priorite}** « ${b.titre} » (${b.projet}) — ${ISSUE_LABEL[b.status]} · porteur ${b.owner?.name ?? '—'} · depuis ${joursDepuis(b.createdAt)} j`)
    }
  }
  if (sansCarte.length) {
    l.push('', '## 🃏 Projets cockpit sans carte Atlas')
    l.push('> Relance avec `--creer` pour générer leurs cartes, ou ajoute `cockpit_id` à la carte correspondante.')
    for (const p of sansCarte) l.push(`- ${p.nom} (\`cockpit_id: ${p.id}\`)`)
  }
  l.push('', `[Ouvrir le cockpit](${COCKPIT_URL}) · Voir aussi [[🗼 Tour de contrôle - Projets en cours]]`)
  l.push('')
  return l.join('\n')
}

/* -------------------------------------------------------------------- main */

async function main() {
  if (!fs.existsSync(DOSSIER_PROJETS)) {
    console.error(`✗ Vault introuvable : ${DOSSIER_PROJETS} (définis ATLAS_VAULT si besoin)`)
    process.exit(1)
  }
  console.log(`🎩 Jarvis · sync Cockpit → Atlas ${DRY_RUN ? '(DRY-RUN, rien ne sera écrit)' : ''}`)
  console.log(`   vault : ${VAULT}`)

  const projets = await chargerProjets()
  console.log(`   cockpit : ${projets.length} projet(s) non archivé(s)\n`)

  const cartes = chargerCartes()
  const liaisons = new Map<string, string>() // cockpit_id -> fichier carte
  const sansCarte: ProjetComplet[] = []
  let modifiees = 0

  for (const p of projets) {
    const carte = apparier(p, cartes)
    if (carte === 'ambigu') {
      console.log(`⚠️  « ${p.nom} » : plusieurs cartes candidates — ajoute cockpit_id: ${p.id} à la bonne carte.`)
      sansCarte.push(p)
      continue
    }
    if (!carte) {
      if (CREER) {
        const nomFichier = p.nom.replace(/[/\\:|#^[\]]/g, '-').trim() + '.md'
        const chemin = path.join(DOSSIER_PROJETS, nomFichier)
        if (fs.existsSync(chemin)) {
          console.log(`⚠️  « ${p.nom} » : ${nomFichier} existe déjà, carte non créée.`)
          sansCarte.push(p)
        } else {
          const contenu = nouvelleCarte(p)
          if (!DRY_RUN) fs.writeFileSync(chemin, contenu)
          liaisons.set(p.id, nomFichier)
          modifiees++
          console.log(`✚  Carte créée : ${nomFichier}`)
        }
      } else {
        sansCarte.push(p)
        console.log(`·  « ${p.nom} » : pas de carte Atlas (utilise --creer, ou pose cockpit_id sur la carte voulue).`)
      }
      continue
    }

    // --- mise à jour de la carte existante
    let texte = carte.texte
    texte = poserCle(texte, 'sante', SANTE_EMOJI[p.sante] ?? '🟢')
    const statutVault = p.status === 'TERMINE' ? 'terminé' : p.blocages.some((b) => b.status === 'BLOQUE') ? 'bloqué' : 'actif'
    texte = poserCle(texte, 'statut', statutVault)
    if (p.dateCible) texte = poserCle(texte, 'echeance', isoJour(p.dateCible))
    texte = poserCle(texte, 'cockpit_id', p.id)
    texte = poserCle(texte, 'cockpit_avancement', String(avancement(p)))
    texte = poserCle(texte, 'cockpit_blocages', String(p.blocages.length))
    texte = poserCle(texte, 'cockpit_taches_retard', String(p.taches.filter((t) => t.echeance && t.echeance < maintenant && t.status !== 'TERMINE').length))
    texte = poserCle(texte, 'cockpit_maj', maintenant.toISOString().slice(0, 16))
    texte = injecterBloc(texte, blocCockpit(p))

    liaisons.set(p.id, carte.fichier)
    if (texte !== carte.texte) {
      modifiees++
      if (!DRY_RUN) fs.writeFileSync(carte.chemin, texte)
      console.log(`✓  ${carte.fichier} ← « ${p.nom} » (${SANTE_EMOJI[p.sante]} ${avancement(p)}%, ${p.blocages.length} blocage(s))`)
    } else {
      console.log(`=  ${carte.fichier} : déjà à jour`)
    }
  }

  // --- synthèse globale
  const synthese = noteSynthese(projets, liaisons, sansCarte)
  if (!DRY_RUN) fs.writeFileSync(NOTE_SYNTHESE, synthese)
  console.log(`\n✓  Synthèse ${DRY_RUN ? 'calculée' : 'écrite'} : ${path.basename(NOTE_SYNTHESE)}`)
  console.log(`\nBilan : ${modifiees} fichier(s) ${DRY_RUN ? 'seraient modifiés' : 'modifié(s)'}, ${sansCarte.length} projet(s) sans carte.`)
  console.log('Obsidian Git versionnera ces changements au prochain commit auto. À votre service, Monsieur.')
}

main().catch((e) => {
  console.error('✗ Échec de la sync :', e?.message ?? e)
  process.exit(1)
})
