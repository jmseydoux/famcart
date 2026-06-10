import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Clock, Package, ChevronDown, ChevronUp, XCircle } from 'lucide-react'
import { api } from '../lib/api'
import { PageSpinner } from '../components/ui/Spinner'

interface ArchivedItem {
  id: string
  name: string
  quantity: number
  unit: string | null
  status: 'BOUGHT' | 'SKIPPED'
}

interface ArchivedList {
  id: string
  closed_at: string
  supplier: { name: string } | null
  sessions: Array<{ shopper: { name: string }; started_at: string; ended_at: string | null }>
  items: ArchivedItem[]
  _count: { items: number }
}

export default function History() {
  const { hid } = useParams<{ hid: string }>()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['history', hid],
    queryFn: () => api.get<{ lists: ArchivedList[] }>(`/households/${hid}/lists/history`),
    enabled: !!hid,
  })

  const lists = data?.lists ?? []

  function toggle(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

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
            const isOpen = expanded[list.id] ?? false
            const boughtItems = list.items.filter(i => i.status === 'BOUGHT')
            const unavailableItems = list.items.filter(i => i.status === 'SKIPPED')

            return (
              <div key={list.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Card header */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {list.supplier?.name ?? 'Liste générale'}
                      </p>
                      {session && (
                        <p className="text-sm text-gray-400 mt-0.5">Par {session.shopper.name}</p>
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

                  <button
                    onClick={() => toggle(list.id)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <Package className="w-3.5 h-3.5" />
                    {list._count.items} article{list._count.items > 1 ? 's' : ''} acheté{list._count.items > 1 ? 's' : ''}
                    {list.items.length > 0 && (
                      isOpen
                        ? <ChevronUp className="w-3.5 h-3.5 ml-1" />
                        : <ChevronDown className="w-3.5 h-3.5 ml-1" />
                    )}
                  </button>
                </div>

                {/* Expandable items list */}
                {isOpen && list.items.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                    {boughtItems.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Achetés</p>
                        <ul className="space-y-1">
                          {boughtItems.map(item => (
                            <li key={item.id} className="flex items-center gap-2 text-sm text-gray-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                              <span>{item.name}</span>
                              <span className="text-gray-400 text-xs">{item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {unavailableItems.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Indisponibles</p>
                        <ul className="space-y-1">
                          {unavailableItems.map(item => (
                            <li key={item.id} className="flex items-center gap-2 text-sm text-gray-400">
                              <XCircle className="w-3.5 h-3.5 text-red-300 flex-shrink-0" />
                              <span className="line-through">{item.name}</span>
                              <span className="text-xs">{item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
