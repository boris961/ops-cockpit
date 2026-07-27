import Link from 'next/link'

export default function ProjetIntrouvable() {
  return (
    <div className="px-6 py-16 lg:px-10">
      <h1 className="text-3xl font-light tracking-tight">Projet introuvable</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Ce projet a peut-être été supprimé, ou le lien est incorrect.
      </p>
      <Link
        href="/projets"
        className="violet-plein mt-6 inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-semibold transition-all"
      >
        Retour aux projets
      </Link>
    </div>
  )
}
