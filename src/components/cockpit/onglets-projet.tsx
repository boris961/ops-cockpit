'use client'

import { FileText, LayoutList } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/**
 * Onglets de la fiche projet. Les deux panneaux sont rendus cote serveur et
 * passes en props : seul le basculement est client.
 */
export function OngletsProjet({
  detail,
  suivi,
}: {
  detail: React.ReactNode
  suivi: React.ReactNode
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
      </TabsList>

      <TabsContent value="detail">{detail}</TabsContent>
      <TabsContent value="suivi">{suivi}</TabsContent>
    </Tabs>
  )
}
