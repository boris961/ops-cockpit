'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FolderKanban, LayoutDashboard, Users } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ROLE_LABEL, initiales } from '@/lib/cockpit'

const NAV = [
  { href: '/', label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: '/projets', label: 'Projets', icon: FolderKanban },
] as const

const NAV_ADMIN = { href: '/utilisateurs', label: 'Utilisateurs', icon: Users } as const

export function Sidebar({
  utilisateur,
  admin,
}: {
  utilisateur: { name?: string | null; email?: string | null; image?: string | null; role?: string }
  /** Le point d'entree Utilisateurs n'existe que pour les COO / HEAD. */
  admin: boolean
}) {
  const pathname = usePathname()
  const entrees = admin ? [...NAV, NAV_ADMIN] : NAV

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="px-6 py-7">
        <Link href="/" className="block">
          <span className="font-heading text-lg leading-none tracking-tight">
            Entrepreneurs
          </span>
          <span className="text-brand">.</span>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Ops cockpit
          </p>
        </Link>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {entrees.map(({ href, label, icon: Icone }) => {
          const actif = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={actif ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                actif
                  ? 'bg-brand/10 font-semibold text-brand shadow-[inset_3px_0_0_0_var(--brand)]'
                  : 'text-foreground/75 hover:bg-background hover:text-foreground',
              )}
            >
              <Icone className="size-4 shrink-0" strokeWidth={1.75} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background text-[11px] font-medium text-foreground ring-1 ring-border">
            {utilisateur.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar Google, hors pipeline next/image
              <img src={utilisateur.image} alt="" className="size-full object-cover" />
            ) : (
              initiales(utilisateur.name)
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm leading-tight">{utilisateur.name ?? 'Utilisateur'}</p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {utilisateur.role
                ? (ROLE_LABEL[utilisateur.role] ?? utilisateur.role)
                : utilisateur.email}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
