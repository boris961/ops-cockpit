'use client'

import { FileText, FolderOpen, LayoutList } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/**
 * Onglets de la fiche projet. Les panneaux sont rendus cote serveur et
 * passes en props : seul le basculement est client.
 */
export function OngletsProjet({
  detail,
  suivi,
  ressources,
}: {
  detail: React.ReactNode
  suivi: React.ReactNode
  ressources: React.ReactNode
}) {
  return (
    <Tabs defaultValue="detail" className="gap-5">
      <TabsList className="self-start bg-card">
        <TabsTrigger value="detail" className="px-3">
          <LayoutList className="size-4" strokeWidth={1.75} />
          Détail
        </TabsTrigger>
        <TabsTrigger value="suivi" className="px-3">
          <FileText className="size-4" strokeWidth={1.75} />
          Suivi
        </TabsTrigger>
        <TabsTrigger value="ressources" className="px-3">
          <FolderOpen className="size-4" strokeWidth={1.75} />
          Ressources
        </TabsTrigger>
      </TabsList>

      <TabsContent value="detail">{detail}</TabsContent>
      <TabsContent value="suivi">{suivi}</TabsContent>
      <TabsContent value="ressources">{ressources}</TabsContent>
    </Tabs>
  )
}
