/**
 * 🎩 Jarvis — Sync Calls (Sembly) → Atlas Brain
 * =============================================
 * Récupère les calls poussés par Sembly (via le webhook n8n « Jarvis — Calls »
 * qui les stocke dans la table Neon `jarvis_calls`) et les range dans le vault :
 *
 *   15_Resources/Calls/AAAA-MM-JJ - Titre du call.md
 *
 * Chaque note contient : front-matter (type: call, participants, source), les
 * notes Sembly, les tâches détectées et la transcription intégrale — chacune
 * dans une section balisée (%% ... %%) mise à jour indépendamment si Sembly
 * envoie les morceaux en plusieurs fois (Notes puis Transcription).
 *
 * Usage (depuis la racine du repo ops-cockpit) :
 *   npx tsx scripts/calls-sync.ts --dry-run   # montre sans écrire
 *   npx tsx scripts/calls-sync.ts             # ingère et marque comme traité
 *
 * Env : DIRECT_DB (lu depuis .env), ATLAS_VAULT (défaut ~/Documents/Atlas-Brain)
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

/* ------------------------------------------------------------------ env */

const REPO = process.cwd()

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
const DOSSIER_CALLS = path.join(VAULT, '15_Resources', 'Calls')
const DRY_RUN = process.argv.includes('--dry-run')

const DDL = `CREATE TABLE IF NOT EXISTS jarvis_calls (
  id serial PRIMARY KEY,
  cle text NOT NULL,
  type text NOT NULL,
  titre text,
  date_call timestamptz,
  participants jsonb,
  contenu text,
  brut jsonb,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
)`

/* --------------------------------------------------------------- helpers */

const horodatage = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris',
}).format(new Date())

function nomFichierSur(s: string) {
  return s.replace(/[/\\:|#^[\]"*?<>]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80)
}

function isoJour(d: Date | string | null | undefined) {
  if (!d) return new Date().toISOString().slice(0, 10)
  const date = d instanceof Date ? d : new Date(d)
  return isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10)
}

type Ligne = {
  id: number
  cle: string
  type: string
  titre: string | null
  date_call: Date | null
  participants: unknown
  contenu: string | null
}

function listeParticipants(rows: Ligne[]): string[] {
  const noms = new Set<string>()
  for (const r of rows) {
    const p = r.participants
    if (Array.isArray(p)) for (const x of p) if (typeof x === 'string' && x.trim()) noms.add(x.trim())
  }
  return [...noms]
}

/* ------------------------------------------------------- rendu des sections */

const SECTIONS: Record<string, { debut: string; fin: string; titre: string }> = {
  notes: { debut: '%% notes:debut %%', fin: '%% notes:fin %%', titre: '## 📝 Notes (Sembly)' },
  task: { debut: '%% taches:debut %%', fin: '%% taches:fin %%', titre: '## ✅ Tâches détectées' },
  transcription: { debut: '%% transcript:debut %%', fin: '%% transcript:fin %%', titre: '## 🎙️ Transcript intégral' },
}

function rendreSection(type: string, contenu: string): string {
  const s = SECTIONS[type]
  return [
    s.debut,
    s.titre,
    `> Màj ${horodatage} — section gérée par Jarvis, ne pas éditer entre les marqueurs.`,
    '',
    contenu.trim(),
    s.fin,
  ].join('\n')
}

function poserSection(texte: string, type: string, contenu: string): string {
  const s = SECTIONS[type]
  const bloc = rendreSection(type, contenu)
  // remplacement par découpage littéral (évite les surprises regex)
  const i = texte.indexOf(s.debut)
  const j = texte.indexOf(s.fin)
  if (i !== -1 && j !== -1 && j > i) {
    return texte.slice(0, i) + bloc + texte.slice(j + s.fin.length)
  }
  return texte.replace(/\s*$/, '') + '\n\n' + bloc + '\n'
}

function nouvelleNote(titre: string, date: string, participants: string[]): string {
  const fm = [
    '---',
    'type: call',
    `date: ${date}`,
    'source: sembly',
    `participants: [${participants.map((p) => `"${p.replace(/"/g, "'")}"`).join(', ')}]`,
    'sensitivity: confidential',
    'tags: [call, sembly]',
    '---',
  ].join('\n')
  return [
    fm,
    '',
    `# ${titre}`,
    '',
    `> 📞 Call ingéré automatiquement par Jarvis depuis Sembly (${horodatage}).`,
    '',
  ].join('\n')
}

/* -------------------------------------------------------------------- main */

async function main() {
  if (!fs.existsSync(VAULT)) {
    console.error(`✗ Vault introuvable : ${VAULT}`)
    process.exit(1)
  }
  fs.mkdirSync(DOSSIER_CALLS, { recursive: true })

  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_DB } } })

  await prisma.$executeRawUnsafe(DDL)
  const lignes = await prisma.$queryRawUnsafe<Ligne[]>(
    `SELECT id, cle, type, titre, date_call, participants, contenu
     FROM jarvis_calls
     WHERE processed_at IS NULL
     ORDER BY created_at ASC`,
  )

  console.log(`🎩 Jarvis · sync Calls → Atlas ${DRY_RUN ? '(DRY-RUN)' : ''}`)
  console.log(`   en attente : ${lignes.length} élément(s)\n`)

  if (lignes.length === 0) {
    console.log('Rien à ingérer. Silence radio, Monsieur.')
    await prisma.$disconnect()
    return
  }

  // Regroupe par call (cle = date + titre normalisé, calculée côté n8n)
  const parCall = new Map<string, Ligne[]>()
  for (const l of lignes) {
    const liste = parCall.get(l.cle) ?? []
    liste.push(l)
    parCall.set(l.cle, liste)
  }

  const traites: number[] = []

  for (const [cle, rows] of parCall) {
    const titre = rows.map((r) => r.titre).find(Boolean) ?? 'Call sans titre'
    const date = isoJour(rows.map((r) => r.date_call).find(Boolean))
    const participants = listeParticipants(rows)
    const fichier = path.join(DOSSIER_CALLS, `${date} - ${nomFichierSur(titre)}.md`)

    let texte = fs.existsSync(fichier)
      ? fs.readFileSync(fichier, 'utf8')
      : nouvelleNote(titre, date, participants)

    // dernier contenu par type (si Sembly renvoie plusieurs fois, le plus récent gagne)
    const parType = new Map<string, string>()
    const taches: string[] = []
    for (const r of rows) {
      if (!r.contenu?.trim()) continue
      if (r.type === 'task') taches.push(r.contenu.trim())
      else if (SECTIONS[r.type]) parType.set(r.type, r.contenu)
    }
    if (taches.length) parType.set('task', taches.map((t) => (t.startsWith('- ') ? t : `- [ ] ${t}`)).join('\n'))

    for (const [type, contenu] of parType) {
      texte = poserSection(texte, type, contenu)
    }

    if (parType.size === 0) {
      console.log(`·  « ${titre} » : éléments sans contenu exploitable (marqués traités, bruts conservés en base).`)
    } else if (!DRY_RUN) {
      fs.writeFileSync(fichier, texte)
      console.log(`✓  ${path.basename(fichier)} ← ${[...parType.keys()].join(' + ')} (${rows.length} élément(s))`)
    } else {
      console.log(`✓  [dry-run] ${path.basename(fichier)} ← ${[...parType.keys()].join(' + ')}`)
    }

    traites.push(...rows.map((r) => r.id))
  }

  if (!DRY_RUN && traites.length) {
    await prisma.$executeRawUnsafe(
      `UPDATE jarvis_calls SET processed_at = now() WHERE id IN (${traites.join(',')})`,
    )
  }

  console.log(`\nBilan : ${parCall.size} call(s), ${traites.length} élément(s) ${DRY_RUN ? 'seraient traités' : 'traités'}.`)
  console.log('Vos conversations rejoignent votre mémoire, Monsieur.')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('✗ Échec de la sync calls :', e?.message ?? e)
  process.exit(1)
})
