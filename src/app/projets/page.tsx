import { Suspense } from 'react'
import Link from 'next/link'

import { getComptesProjets, getPorteurs, getProjets, getUtilisateurs } from '@/lib/queries'
import { utilisateurCourant } from '@/lib/autorisation'
import { cn } from '@/lib/utils'
import { FiltrePorteur } from '@/components/cockpit/filtre-porteur'
import { NouveauProjet } from '@/components/cockpit/nouveau-projet'
import { VueProjets, type ProjetItem } from '@/components/cockpit/vue-projets'

export default async function Projets(props: PageProps<'/projets'>) {
  const { archives, porteur } = await props.searchParams
  const voirArchives = archives === '1'
  const porteurChoisi = typeof porteur === 'string' ? porteur : undefined

  const [projets, comptes, porteurs, utilisateurs, moi] = await Promise.all([
    getProjets({ archives: voirArchives, porteur: porteurChoisi }),
    getComptesProjets({ porteur: porteurChoisi }),
    getPorteurs(),
    getUtilisateurs(),
    utilisateurCourant(),
  ])

  const items: ProjetItem[] = projets.map((p) => ({
    id: p.id,
    nom: p.nom,
    directeur: p.owner.name,
    statut: p.status,
    sante: p.sante,
    avancement: p.avancement,
    prochainJalon: p.prochainJalon,
    blocages: p._count.blocages,
    departements: p.departements,
  }))

  // Le filtre porteur doit survivre au passage Actifs <-> Archives.
  const lienActifs = porteurChoisi ? `/projets?porteur=${porteurChoisi}` : '/projets'
  const lienArchives = porteurChoisi
    ? `/projets?archives=1&porteur=${porteurChoisi}`
    : '/projets?archives=1'

  return (
    <div className="px-6 py-8 lg:px-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl leading-tight">Projets</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {items.length} {items.length > 1 ? 'missions suivies' : 'mission suivie'} — vue liste ou
            kanban.
          </p>
        </div>

        <NouveauProjet
          utilisateurs={utilisateurs.map((u) => ({ id: u.id, name: u.name, role: u.role }))}
          utilisateurCourantId={moi?.id ?? null}
        />
      </header>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Filtre" className="flex items-center gap-2">
          <FiltreLien
            href={lienActifs}
            actif={!voirArchives}
            libelle="Actifs"
            compte={comptes.actifs}
          />
          <FiltreLien
            href={lienArchives}
            actif={voirArchives}
            libelle="Archivés"
            compte={comptes.archives}
          />
        </nav>

        <Suspense fallback={null}>
          <FiltrePorteur porteurs={porteurs} />
        </Suspense>
      </div>

      <VueProjets projets={items} />
    </div>
  )
}

function FiltreLien({
  href,
  actif,
  libelle,
  compte,
}: {
  href: string
  actif: boolean
  libelle: string
  compte: number
}) {
  return (
    <Link
      href={href}
      aria-current={actif ? 'page' : undefined}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-sm transition-colors',
        actif
          ? 'border-brand bg-brand/10 font-semibold text-brand'
          : 'border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground',
      )}
    >
      {libelle}
      <span className="text-xs tabular-nums opacity-70">{compte}</span>
    </Link>
  )
}
