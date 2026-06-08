import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Clock, Package } from 'lucide-react'
import { api } from '../lib/api'
import { PageSpinner } from '../components/ui/Spinner'

interface ArchivedList {
  id: string
  closed_at: string
  supplier: { name: string } | null
  sessions: Array<{ shopper: { name: string }; started_at: string; ended_at: string | null }>
  _count: { items: number }
}

export default function History() {
  const { hid } = useParams<{ hid: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['history', hid],
    queryFn: () => api.get<{ lists: ArchivedList[] }>(`/households/${hid}/lists/history`),
    enabled: !!hid,
  })

  const lists = data?.lists ?? []

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Historique</h1>
        <p className="text-sm text-gray-400">{lists.length} session{lists.length > 1 ? 's' : ''} archivée{lists.length > 1 ? 's' : ''}</p>
      </div>

      {lists.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-medium">Aucun historique</p>
          <p className="text-sm mt-1">Vos sessions de courses terminées apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lists.map(list => {
            const session = list.sessions[0]
            const date = new Date(list.closed_at ?? session?.ended_at ?? '')
            return (
              <div key={list.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {list.supplier?.name ?? 'Liste générale'}
                    </p>
                    {session && (
                      <p className="text-sm text-gray-400 mt-0.5">
                        Par {session.shopper.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Package className="w-3.5 h-3.5" />
                  {list._count.items} article{list._count.items > 1 ? 's' : ''} acheté{list._count.items > 1 ? 's' : ''}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
