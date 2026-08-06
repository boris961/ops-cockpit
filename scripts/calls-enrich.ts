/**
 * 🎩 Jarvis — Enrichissement des calls (palier B, phase 2)
 * ========================================================
 * Repasse derrière `calls-sync.ts` : chaque note de `15_Resources/Calls/` non
 * encore enrichie est relue par Claude avec, en contexte, tes fiches People,
 * tes cartes projet et le mapping email→fiche. Le script :
 *
 *   1. convertit les participants en wikilinks [[Fiche People]] (mapping
 *      mémorisé dans 85_Jarvis/Mapping-People.md, corrigeable à la main) ;
 *   2. insère une section « 🧭 Synthèse Atlas » (résumé, décisions, actions,
 *      risques, [[projets]] liés) dans la note, entre marqueurs %% %% ;
 *   3. dépose un brouillon de Decision Record dans 00_Inbox pour les décisions
 *      structurantes (jamais directement dans 20_Decisions) ;
 *   4. t'envoie sur Telegram les actions qui te concernent (optionnel —
 *      nécessite TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID dans le .env).
 *
 * Usage :  npx tsx scripts/calls-enrich.ts [--dry-run]
 * Env   :  ANTHROPIC_API_KEY (requis) · ATLAS_VAULT · JARVIS_MODEL
 *          TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (optionnels)
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
const D_CALLS = path.join(VAULT, '15_Resources', 'Calls')
const D_PEOPLE = path.join(VAULT, '40_People')
const D_PROJETS = path.join(VAULT, '05_Projects')
const D_INBOX = path.join(VAULT, '00_Inbox')
const F_MAPPING = path.join(VAULT, '85_Jarvis', 'Mapping-People.md')

const CLE_API = process.env.ANTHROPIC_API_KEY
const MODELE = process.env.JARVIS_MODEL ?? 'claude-sonnet-4-5'
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TG_CHAT = process.env.TELEGRAM_CHAT_ID
const DRY_RUN = process.argv.includes('--dry-run')

const M_DEBUT = '%% synthese:debut %%'
const M_FIN = '%% synthese:fin %%'

const horodatage = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris',
}).format(new Date())

/* --------------------------------------------------------------- helpers */

function lireFrontMatter(texte: string): Record<string, string> {
  const m = texte.match(/^---\n([\s\S]*?)\n---/)
  const fm: Record<string, string> = {}
  if (!m) return fm
  for (const ligne of m[1].split('\n')) {
    const kv = ligne.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (kv) fm[kv[1]] = kv[2]
  }
  return fm
}

function poserCle(texte: string, cle: string, valeur: string): string {
  const fin = texte.indexOf('\n---', 3)
  if (!texte.startsWith('---') || fin === -1) return `---\n${cle}: ${valeur}\n---\n\n${texte}`
  const bloc = texte.slice(0, fin)
  const regex = new RegExp(`^${cle}:.*$`, 'm')
  if (regex.test(bloc)) return bloc.replace(regex, `${cle}: ${valeur}`) + texte.slice(fin)
  return bloc + `\n${cle}: ${valeur}` + texte.slice(fin)
}

const nomSur = (s: string) => s.replace(/[/\\:|#^[\]"*?<>]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80)
const listerMd = (dossier: string) =>
  fs.existsSync(dossier) ? fs.readdirSync(dossier).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')) : []

/* --------------------------------------------------- mapping email→fiche */

function chargerMapping(): Map<string, string> {
  const map = new Map<string, string>()
  if (!fs.existsSync(F_MAPPING)) return map
  for (const ligne of fs.readFileSync(F_MAPPING, 'utf8').split('\n')) {
    const m = ligne.match(/^-\s*`?([^`|]+?)`?\s*(?:→|->)\s*\[\[([^\]]+)\]\]/)
    if (m) map.set(m[1].trim().toLowerCase(), m[2].trim())
  }
  return map
}

function sauverMapping(map: Map<string, string>) {
  const lignes = [
    '---',
    'type: config',
    'tags: [jarvis, mapping, people]',
    '---',
    '',
    '# 🗂️ Mapping participants → fiches People',
    '',
    '> Maintenu par Jarvis (`calls-enrich`). Corrige librement une ligne si un rapprochement est faux — le script te fait confiance.',
    '',
    ...[...map.entries()].sort().map(([email, fiche]) => `- \`${email}\` → [[${fiche}]]`),
    '',
  ]
  if (!DRY_RUN) fs.writeFileSync(F_MAPPING, lignes.join('\n'))
}

/* ------------------------------------------------------------ appel Claude */

async function demanderClaude(prompt: string): Promise<any> {
  const rep = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLE_API!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: MODELE, max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!rep.ok) throw new Error(`API Anthropic ${rep.status}: ${(await rep.text()).slice(0, 200)}`)
  const data: any = await rep.json()
  const texte: string = data?.content?.[0]?.text ?? ''
  const debut = texte.indexOf('{')
  const fin = texte.lastIndexOf('}')
  if (debut === -1 || fin <= debut) throw new Error('réponse sans JSON')
  return JSON.parse(texte.slice(debut, fin + 1))
}

function construirePrompt(note: string, people: string[], projets: string[], mapping: Map<string, string>): string {
  const contenu = note.length > 24000 ? note.slice(0, 24000) + '\n[...transcript tronqué pour l’analyse...]' : note
  return [
    "Tu enrichis la note d'un call professionnel pour l'Atlas Brain de Boris (vault Obsidian, en français).",
    'Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises markdown.',
    '',
    `FICHES PEOPLE DISPONIBLES (noms exacts, sans .md) : ${JSON.stringify(people)}`,
    `MAPPING DÉJÀ CONNU (email → fiche) : ${JSON.stringify(Object.fromEntries(mapping))}`,
    `CARTES PROJET DISPONIBLES (noms exacts, sans .md) : ${JSON.stringify(projets)}`,
    '',
    'NOTE DU CALL :',
    '"""',
    contenu,
    '"""',
    '',
    'Produis exactement ce JSON :',
    `{
  "participants": [{"brut": "email ou nom tel qu'écrit", "fiche": "Nom Exact D'une Fiche ou null"}],
  "synthese": {
    "resume": "1-2 phrases",
    "decisions": ["décision actée"],
    "actions": [{"qui": "Boris ou le prénom", "quoi": "action concrète", "echeance": "AAAA-MM-JJ ou null"}],
    "risques": ["risque ou point de vigilance"],
    "projets_lies": ["Nom Exact D'une Carte"],
    "tags": ["2-5 mots-clés kebab-case"]
  },
  "decision_records": [{"titre": "titre court", "contenu": "markdown du brouillon : contexte, décision, conséquences, à valider par Boris"}]
}`,
    '',
    "Règles : `fiche` et `projets_lies` UNIQUEMENT parmi les listes fournies (sinon null / omettre) ; actions réellement actionnables uniquement ; `decision_records` réservé aux décisions STRUCTURANTES (0 à 2 maximum, souvent 0) ; tout en français.",
  ].join('\n')
}

/* ------------------------------------------------------------- application */

function rendreSynthese(s: any): string {
  const l: string[] = [M_DEBUT, '## 🧭 Synthèse Atlas', `> Générée par Jarvis le ${horodatage} — corrige librement hors des marqueurs.`, '']
  if (s.resume) l.push(`**Résumé** — ${s.resume}`, '')
  if (s.decisions?.length) l.push('**Décisions**', ...s.decisions.map((d: string) => `- ${d}`), '')
  if (s.actions?.length) l.push('**Actions**', ...s.actions.map((a: any) => `- [ ] **${a.qui}** : ${a.quoi}${a.echeance ? ` (échéance ${a.echeance})` : ''}`), '')
  if (s.risques?.length) l.push('**Risques & vigilances**', ...s.risques.map((r: string) => `- ${r}`), '')
  if (s.projets_lies?.length) l.push(`**Projets liés** : ${s.projets_lies.map((p: string) => `[[${p}]]`).join(' · ')}`, '')
  if (s.tags?.length) l.push(`Tags : ${s.tags.map((t: string) => `#${t}`).join(' ')}`)
  l.push(M_FIN)
  return l.join('\n')
}

function insererSynthese(texte: string, bloc: string): string {
  const i = texte.indexOf(M_DEBUT)
  const j = texte.indexOf(M_FIN)
  if (i !== -1 && j > i) return texte.slice(0, i) + bloc + texte.slice(j + M_FIN.length)
  const ancre = texte.indexOf('%% notes:debut %%')
  if (ancre !== -1) return texte.slice(0, ancre) + bloc + '\n\n' + texte.slice(ancre)
  return texte.replace(/\s*$/, '') + '\n\n' + bloc + '\n'
}

async function pingTelegram(message: string) {
  if (!TG_TOKEN || !TG_CHAT || DRY_RUN) return
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text: message }),
    })
  } catch { /* le ping est un confort, jamais bloquant */ }
}

/* -------------------------------------------------------------------- main */

async function main() {
  if (!CLE_API) {
    console.error('✗ ANTHROPIC_API_KEY manquant dans le .env — ajoute-le puis relance.')
    process.exit(1)
  }
  if (!fs.existsSync(D_CALLS)) {
    console.log('Aucun dossier Calls — rien à enrichir.')
    return
  }

  const people = listerMd(D_PEOPLE)
  const projets = listerMd(D_PROJETS).filter((p) => !p.startsWith('🗼') && !p.startsWith('🎛️'))
  const mapping = chargerMapping()

  const fichiers = fs.readdirSync(D_CALLS).filter((f) => f.endsWith('.md'))
  const aTraiter = fichiers.filter((f) => {
    const fm = lireFrontMatter(fs.readFileSync(path.join(D_CALLS, f), 'utf8'))
    return fm.enrichi !== 'true'
  })

  console.log(`🎩 Jarvis · enrichissement des calls ${DRY_RUN ? '(DRY-RUN)' : ''}`)
  console.log(`   notes : ${fichiers.length} · à enrichir : ${aTraiter.length} · modèle : ${MODELE}\n`)
  if (aTraiter.length === 0) {
    console.log('Tout est déjà enrichi. La mémoire est en ordre, Monsieur.')
    return
  }

  for (const fichier of aTraiter) {
    const chemin = path.join(D_CALLS, fichier)
    let texte = fs.readFileSync(chemin, 'utf8')
    process.stdout.write(`⏳ ${fichier} … `)

    try {
      const resultat = await demanderClaude(construirePrompt(texte, people, projets, mapping))

      // 1. participants → wikilinks (et mémorisation du mapping)
      const liens: string[] = []
      for (const p of resultat.participants ?? []) {
        const brut = String(p.brut ?? '').trim()
        if (!brut) continue
        if (p.fiche && people.includes(p.fiche)) {
          liens.push(`"[[${p.fiche}]]"`)
          if (brut.includes('@')) mapping.set(brut.toLowerCase(), p.fiche)
        } else {
          liens.push(`"${brut.replace(/"/g, "'")}"`)
        }
      }
      if (liens.length) texte = poserCle(texte, 'participants', `[${liens.join(', ')}]`)

      // 2. section Synthèse Atlas
      texte = insererSynthese(texte, rendreSynthese(resultat.synthese ?? {}))
      texte = poserCle(texte, 'enrichi', 'true')
      texte = poserCle(texte, 'enrichi_le', new Date().toISOString().slice(0, 10))

      // 3. brouillons de Decision Records → 00_Inbox
      const fm = lireFrontMatter(texte)
      for (const dr of (resultat.decision_records ?? []).slice(0, 2)) {
        const nom = `Decision (draft) - ${nomSur(dr.titre ?? 'Sans titre')} - ${fm.date ?? ''}.md`.replace(/\s+\.md$/, '.md')
        const cible = path.join(D_INBOX, nom)
        if (!fs.existsSync(cible) && !DRY_RUN) {
          fs.writeFileSync(cible, [
            '---', 'type: decision', 'statut: draft', `date: ${fm.date ?? ''}`, 'source: jarvis',
            `call: "[[${fichier.replace(/\.md$/, '')}]]"`, 'tags: [decision, draft]', '---', '',
            `# ${dr.titre ?? 'Décision à valider'}`, '', '> Brouillon proposé par Jarvis depuis un call — à valider, compléter, puis ranger dans 20_Decisions (ou supprimer).', '',
            dr.contenu ?? '', '',
          ].join('\n'))
        }
        console.log(`\n   ✚ Decision draft → 00_Inbox/${nom}`)
      }

      if (!DRY_RUN) fs.writeFileSync(chemin, texte)

      // 4. actions de Boris → Telegram
      const actionsBoris = (resultat.synthese?.actions ?? []).filter((a: any) => /boris/i.test(String(a.qui ?? '')))
      if (actionsBoris.length) {
        const lignes = actionsBoris.map((a: any, i: number) => `${i + 1}. ${a.quoi}${a.echeance ? ` (${a.echeance})` : ''}`)
        await pingTelegram(`🧭 Call « ${fm.date ?? ''} ${fichier.replace(/\.md$/, '').slice(13)} » : ${actionsBoris.length} action(s) te concernent, Monsieur :\n${lignes.join('\n')}\n\nDis-moi « crée les tâches de ce call » pour les pousser au cockpit.`)
      }

      console.log(`✓ enrichi (${(resultat.synthese?.actions ?? []).length} action(s), ${(resultat.synthese?.decisions ?? []).length} décision(s))`)
    } catch (e: any) {
      console.log(`✗ ${e?.message ?? e} — sera retenté au prochain passage.`)
    }
  }

  sauverMapping(mapping)
  console.log(`\nMapping People : ${mapping.size} correspondance(s) mémorisée(s).`)
  console.log('L’information commence à vous retrouver, Monsieur.')
}

main().catch((e) => {
  console.error('✗ Échec de l’enrichissement :', e?.message ?? e)
  process.exit(1)
})
