import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const boris = await prisma.user.upsert({
    where: { email: 'boris@entrepreneurs.com' }, update: {},
    create: { email: 'boris@entrepreneurs.com', name: 'Boris', role: 'COO' },
  })
  const dir = await prisma.user.upsert({
    where: { email: 'directeur@entrepreneurs.com' }, update: {},
    create: { email: 'directeur@entrepreneurs.com', name: 'Directeur Demo', role: 'DIRECTEUR' },
  })

  const projets = [
    { nom: 'Refonte site web',       status: 'EN_COURS',      sante: 'VERT',   avancement: 90, prochainJalon: 'Livraison maquettes' },
    { nom: 'Deploiement CRM',        status: 'A_RISQUE',      sante: 'ROUGE',  avancement: 45, prochainJalon: 'Recette module 2' },
    { nom: 'Audit cybersecurite',    status: 'EN_COURS',      sante: 'VERT',   avancement: 60, prochainJalon: 'Rapport final' },
    { nom: 'Cadrage strategie data', status: 'CADRAGE',       sante: 'VERT',   avancement: 30, prochainJalon: 'Kickoff' },
    { nom: 'Campagne Q3',            status: 'EN_VALIDATION', sante: 'ORANGE', avancement: 75, prochainJalon: 'Go / No-go' },
  ] as const

  for (const p of projets) {
    await prisma.project.create({ data: { ...p, ownerId: dir.id } })
  }

  const crm = await prisma.project.findFirst({ where: { nom: 'Deploiement CRM' } })
  await prisma.issue.create({
    data: {
      titre: 'Integration API paiement bloquee',
      priorite: 'P0', status: 'BLOQUE',
      reporterId: boris.id, ownerId: dir.id, projectId: crm?.id, categorie: 'Tech',
    },
  })

  await prisma.activity.create({
    data: { actorId: dir.id, projectId: crm?.id, type: 'SANTE', message: 'Sante passee au rouge' },
  })

  console.log('Seed OK')
}

main().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error(e); await prisma.$disconnect(); process.exit(1)
})
