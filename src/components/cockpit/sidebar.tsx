'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarClock, FolderKanban, LayoutDashboard, Users } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ROLE_LABEL, initiales } from '@/lib/cockpit'

const NAV = [
  { href: '/', label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: '/projets', label: 'Projets', icon: FolderKanban },
  { href: '/taches', label: 'Tâches à venir', icon: CalendarClock },
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
    <aside className="verre sticky top-4 m-4 flex h-[calc(100vh-2rem)] w-60 shrink-0 flex-col rounded-xl bg-sidebar ring-1 ring-white/10">
      <div className="px-5 py-6">
        <Link href="/" className="block">
          <span className="text-lg leading-none font-semibold tracking-tight">
            Entrepreneurs
          </span>
          <span className="text-brand">.</span>
          <p className="mt-1.5 text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
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
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                actif
                  ? 'nav-actif font-semibold text-white'
                  : 'text-foreground/70 hover:bg-white/[0.05] hover:text-foreground',
              )}
            >
              <Icone
                className={cn(
                  'size-4 shrink-0 transition-all',
                  actif
                    ? 'text-brand-clair drop-shadow-[0_0_6px_var(--brand)]'
                    : 'text-muted-foreground group-hover:text-foreground',
                )}
                strokeWidth={1.75}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-white/8 px-4 py-4">
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.04] p-2 ring-1 ring-white/8">
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand/20 text-[11px] font-semibold text-brand-clair ring-1 ring-brand/30">
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
