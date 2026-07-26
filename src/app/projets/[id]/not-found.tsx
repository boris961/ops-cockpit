import Link from 'next/link'

export default function ProjetIntrouvable() {
  return (
    <div className="px-6 py-16 lg:px-10">
      <h1 className="font-heading text-3xl">Projet introuvable</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Ce projet a peut-être été supprimé, ou le lien est incorrect.
      </p>
      <Link
        href="/projets"
        className="mt-6 inline-flex h-9 items-center rounded-lg bg-brand-fonce px-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand"
      >
        Retour aux projets
      </Link>
    </div>
  )
}
