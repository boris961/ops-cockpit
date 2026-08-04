# 🎩 Jarvis × ops-cockpit × Atlas Brain

Première fonctionnalité de Jarvis : **l'interconnexion** entre le cockpit (exécution, source de vérité de l'équipe) et l'Atlas Brain (supervision, mémoire personnelle de Boris).

```
              lecture/écriture SQL (Neon)
  n8n  ◄────────────────────────────────────►  ops-cockpit (Vercel + Neon Postgres)
   │  serveur MCP « jarvis-cockpit »                    ▲
   │  etat_cockpit · creer_blocage                      │ Prisma (lecture)
   │  resoudre_blocage · creer_tache                    │
   ▼                                          scripts/atlas-sync.ts  (sur le Mac)
 Jarvis v1 (Telegram) · Claude · Jarvis v2              │
                                                        ▼
                                        Atlas-Brain (Obsidian, local)
                                        cartes 05_Projects + 🎛️ Synthèse
                                        → la 🗼 Tour de contrôle (Dataview) suit
```

**Philosophie** : le cockpit reste la source de vérité de l'exécution (multi-utilisateurs). L'Atlas reste la couche de supervision de Boris. La sync descend l'état live dans les cartes ; les écritures remontent **uniquement** par des outils explicites (blocage, tâche), journalisées dans l'Activity du cockpit.

---

## 1. Sync Cockpit → Atlas (`scripts/atlas-sync.ts`)

### Ce qu'elle fait
- Met à jour, dans chaque carte `05_Projects/*.md` appariée : `sante` (🟢🟠🔴), `statut` (actif / bloqué / terminé), `echeance` (si date cible en base), et les clés `cockpit_*` (id, avancement, blocages, retards, maj).
- Réécrit un bloc `%% cockpit:debut %% … %% cockpit:fin %%` en fin de carte : jalon, tâches en cours / en retard, blocages ouverts, dernière activité, lien vers l'app.
- Régénère `05_Projects/🎛️ Cockpit — Synthèse.md` (tableau global + alertes).
- **Ne touche jamais** : `domaine`, `owner`, `prochaine`, `revue`, `execution`, `tags`, ni ta prose.

### Appariement carte ↔ projet
1. `cockpit_id` dans le front-matter (prioritaire — pose-le à la main en cas de doute) ;
2. sinon, rapprochement par nom (accents/emoji ignorés) ;
3. ambiguïté → signalée, rien n'est modifié.

### Lancer
```bash
npm run atlas:sync:dry   # 1er lancement : montre tout, n'écrit rien
npm run atlas:sync       # applique
npx tsx scripts/atlas-sync.ts --creer   # + crée les cartes manquantes
```
Variables optionnelles : `ATLAS_VAULT` (défaut `~/Documents/Atlas-Brain`), `COCKPIT_URL` (défaut `http://localhost:3000` — mets l'URL Vercel pour des liens cliquables partout).

> ⚠️ Si la base contient encore les projets du seed (« Refonte site web »…), fais le ménage avant le premier `--creer`, sinon ils auront leur carte dans le vault.

### Automatiser (7h15 chaque matin, avant le brief)
```bash
cp launchd/com.boris.jarvis-atlas-sync.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.boris.jarvis-atlas-sync.plist
# logs : ~/Library/Logs/jarvis-atlas-sync.log
```

## 2. Cockpit → outils Jarvis (`n8n/jarvis-cockpit-mcp.json`)

Workflow n8n **serveur MCP** exposant 4 outils : `etat_cockpit`, `creer_blocage`, `resoudre_blocage`, `creer_tache` (SQL direct sur Neon, journalisation Activity au nom de Boris — mêmes conventions que l'app).

Import → credential Postgres (valeurs de `DATABASE_URL`, l'URL *pooled*) → credential Bearer sur le trigger → activer. Puis brancher :
- **Jarvis v1 Telegram** : ajouter un nœud *MCP Client Tool* à l'agent (URL du serveur + Bearer).
- **Claude** : Paramètres → Connecteurs → ajouter le connecteur personnalisé.
- **Jarvis v2 (daemon)** : entrée `mcpServers` de l'Agent SDK.

### Phrases qui marchent ensuite
- « Jarvis, l'état du cockpit ? » / « Quels projets sont au rouge ? »
- « Signale un blocage P1 sur NAS Dubaï : l'export Google Drive est corrompu. »
- « Le blocage VPN est réglé, clôture-le. »
- « Ajoute une tâche au sprint cybersec : relancer la campagne phishing, pour vendredi. »
- Et après une sync : « Qu'est-ce qui a changé dans la Tour de contrôle ? » (répond depuis le vault)

## 3. Calls Sembly → Atlas (`scripts/calls-sync.ts` + `n8n/jarvis-calls-sembly.json`)

Chaque call enregistré par **Sembly** est poussé (automation Custom → webhook n8n) dans la table Neon `jarvis_calls`, puis le script local les range dans **`15_Resources/Calls/AAAA-MM-JJ - Titre.md`** : front-matter (participants, date), notes Sembly, tâches détectées et transcript intégral — en sections balisées, fusionnées si Sembly envoie notes et transcription séparément.

Mise en route : importer le workflow n8n (credential Postgres existant) → l'activer → copier la Production URL du webhook → dans Sembly, *My Automations → Custom → Add* : une automation **Transcription** + une **Meeting Notes** (+ **Tasks** en option), Destination = cette URL. Côté Mac :
```bash
npx tsx scripts/calls-sync.ts --dry-run   # premier test
cp launchd/com.boris.jarvis-calls-sync.plist ~/Library/LaunchAgents/ && launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.boris.jarvis-calls-sync.plist
```
La sync tourne toutes les 30 min (log : `~/Library/Logs/jarvis-calls-sync.log`). Test sans attendre un vrai call : dans Sembly, ouvrir une réunion passée → bouton **Zap** → déclencher l'automation manuellement. NB : le schéma exact du payload Sembly n'étant pas documenté publiquement, le nœud « Normaliser » extrait au mieux et conserve le brut en base (`jarvis_calls.brut`) — si une note sort mal formée, ajuster le mapping dans ce nœud.

## 4. Dépannage
- **`DIRECT_DB` manquant** : le script lit `.env` à la racine du repo — lance-le depuis `ops-cockpit/ops-cockpit`.
- **Carte non appariée** : ajoute `cockpit_id: <id>` (listé par la sync et dans la Synthèse) au front-matter de la carte.
- **Champ écrasé à tort** : `sante`/`statut`/`echeance` suivent désormais le cockpit pour les cartes appariées — c'est le contrat. Pour qu'une carte reste 100 % manuelle, retire son `cockpit_id` et renomme-la assez différemment du projet cockpit.
- **launchd muet** : `launchctl list | grep jarvis` puis regarde le log ; `npx` doit être dans le PATH de zsh (nvm ok car `-lc`).
