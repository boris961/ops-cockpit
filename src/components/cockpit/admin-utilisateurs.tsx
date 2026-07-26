'use client'

import { useActionState, useEffect, useRef } from 'react'
import { UserPlus } from 'lucide-react'

import { enregistrerUtilisateur, modifierRoleUtilisateur } from '@/lib/actions'
import { ETAT_INITIAL } from '@/lib/action-state'
import { ROLES, ROLE_LABEL, initiales } from '@/lib/cockpit'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BoutonSoumettre,
  MessageEtat,
  classeChamp,
  classeLibelle,
} from '@/components/cockpit/formulaire'

export type UtilisateurItem = {
  id: string
  name: string
  email: string
  role: string
  projetsPortes: number
  projetsMembre: number
}

export function AdminUtilisateurs({ utilisateurs }: { utilisateurs: UtilisateurItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="min-w-0 ring-border">
        <CardHeader>
          <CardTitle>Comptes ({utilisateurs.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {['Utilisateur', 'E-mail', 'Rôle', 'Projets'].map((colonne, index) => (
                  <TableHead
                    key={colonne}
                    className={`text-[11px] tracking-[0.1em] text-muted-foreground uppercase ${
                      index === 0 ? 'pl-5' : ''
                    }`}
                  >
                    {colonne}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {utilisateurs.map((utilisateur) => (
                <TableRow key={utilisateur.id} className="border-border">
                  <TableCell className="py-3 pl-5">
                    <span className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sand text-[11px] font-medium ring-1 ring-border">
                        {initiales(utilisateur.name)}
                      </span>
                      <span className="font-medium">{utilisateur.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-muted-foreground">{utilisateur.email}</TableCell>
                  <TableCell className="py-3">
                    <SelectRole utilisateur={utilisateur} />
                  </TableCell>
                  <TableCell className="py-3 text-xs text-muted-foreground">
                    {utilisateur.projetsPortes} porté{utilisateur.projetsPortes > 1 ? 's' : ''} ·{' '}
                    {utilisateur.projetsMembre} en équipe
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <aside className="min-w-0">
        <FormulaireNouvelUtilisateur />
      </aside>
    </div>
  )
}

function SelectRole({ utilisateur }: { utilisateur: UtilisateurItem }) {
  const [etat, action, enCours] = useActionState(modifierRoleUtilisateur, ETAT_INITIAL)

  return (
    <form action={action}>
      <input type="hidden" name="utilisateurId" value={utilisateur.id} />
      <label className="sr-only" htmlFor={`role-${utilisateur.id}`}>
        Rôle de {utilisateur.name}
      </label>
      <select
        id={`role-${utilisateur.id}`}
        name="role"
        key={utilisateur.role}
        defaultValue={utilisateur.role}
        disabled={enCours}
        onChange={(evenement) => evenement.currentTarget.form?.requestSubmit()}
        className="h-7 rounded-lg border border-border bg-background px-2 text-xs outline-none transition-colors focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:opacity-60"
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABEL[role]}
          </option>
        ))}
      </select>
      <MessageEtat etat={etat} />
    </form>
  )
}

function FormulaireNouvelUtilisateur() {
  const [etat, action] = useActionState(enregistrerUtilisateur, ETAT_INITIAL)
  const formulaire = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (etat.ok) formulaire.current?.reset()
  }, [etat])

  return (
    <Card className="ring-border xl:sticky xl:top-8">
      <CardHeader>
        <CardTitle>Nouveau compte</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formulaire} action={action} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="nouvel-email" className={classeLibelle}>
              E-mail
            </label>
            <input
              id="nouvel-email"
              name="email"
              type="email"
              required
              placeholder="prenom@entrepreneurs.com"
              className={classeChamp}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="nouvel-nom" className={classeLibelle}>
              Nom
            </label>
            <input
              id="nouvel-nom"
              name="name"
              type="text"
              required
              placeholder="Prénom Nom"
              className={classeChamp}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="nouvel-role" className={classeLibelle}>
              Rôle
            </label>
            <select id="nouvel-role" name="role" defaultValue="MEMBRE" className={classeChamp}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </select>
          </div>

          <BoutonSoumettre>
            <UserPlus className="size-3.5" strokeWidth={2} aria-hidden />
            Enregistrer le compte
          </BoutonSoumettre>

          <p className="text-xs leading-snug text-muted-foreground">
            Le compte est créé ici ; la personne récupère ce rôle à sa première connexion Google.
            Un e-mail déjà connu est mis à jour.
          </p>

          <MessageEtat etat={etat} />
        </form>
      </CardContent>
    </Card>
  )
}
