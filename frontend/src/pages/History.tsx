import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

interface ShoppingList {
  id: string
  closed_at: string | null
  created_at: string
  supplier: { id: string; name: string } | null
  creator: { id: string; name: string }
  items: { id: string; status: string }[]
}

export default function History() {
  const { data, isLoading } = useQuery({
    queryKey: ['lists-history'],
    queryFn: () => api.get<{ lists: ShoppingList[] }>('/lists/history'),
  })

  const lists = data?.lists ?? []

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">← Retour</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Historique des courses</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Chargement…</div>
      ) : lists.length === 0 ? (
        <div className="text-center py-16 text-gray-500">Aucune liste clôturée pour l'instant.</div>
      ) : (
        <div className="space-y-3">
          {lists.map(list => {
            const boughtCount = list.items.filter(i => i.status === 'BOUGHT').length
            const total = list.items.length
            return (
              <Link
                key={list.id}
                to={`/lists/${list.id}`}
                className="block bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-gray-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {list.supplier?.name ?? 'Liste générale'}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Par {list.creator.name} ·{' '}
                      {list.closed_at
                        ? new Date(list.closed_at).toLocaleDateString('fr-FR')
                        : new Date(list.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500">
                      {boughtCount}/{total} achetés
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
