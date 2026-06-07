import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

interface Supplier {
  id: string
  name: string
}

interface ShoppingList {
  id: string
  created_at: string
  status: 'OPEN' | 'CLOSED'
  pending_count: number
  creator: { id: string; name: string }
  supplier: Supplier | null
}

export default function Home() {
  const { appUser } = useAuth()
  const queryClient = useQueryClient()
  const [showNewListForm, setShowNewListForm] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [error, setError] = useState('')

  const { data: listsData, isLoading: loadingLists } = useQuery({
    queryKey: ['lists'],
    queryFn: () => api.get<{ lists: ShoppingList[] }>('/lists'),
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get<{ suppliers: Supplier[] }>('/suppliers'),
  })

  const createList = useMutation({
    mutationFn: (supplier_id: string | null) =>
      api.post<{ list: ShoppingList }>('/lists', { supplier_id: supplier_id || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      setShowNewListForm(false)
      setSelectedSupplierId('')
      setError('')
    },
    onError: (err: Error) => setError(err.message),
  })

  const lists = listsData?.lists ?? []
  const suppliers = suppliersData?.suppliers ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listes de courses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bonjour, {appUser?.name}</p>
        </div>
        <button
          onClick={() => setShowNewListForm(v => !v)}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Nouvelle liste
        </button>
      </div>

      {showNewListForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Nouvelle liste</h2>
          <div className="flex gap-3">
            <select
              value={selectedSupplierId}
              onChange={e => setSelectedSupplierId(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Aucun fournisseur (liste générale)</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button
              onClick={() => createList.mutate(selectedSupplierId || null)}
              disabled={createList.isPending}
              className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {createList.isPending ? 'Création…' : 'Créer'}
            </button>
            <button
              onClick={() => { setShowNewListForm(false); setError('') }}
              className="text-gray-500 hover:text-gray-700 px-2 text-sm"
            >
              Annuler
            </button>
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      )}

      {loadingLists ? (
        <div className="text-center py-16 text-gray-400 text-sm">Chargement…</div>
      ) : lists.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">Aucune liste ouverte pour le moment.</p>
          <p className="text-sm text-gray-400 mt-1">Créez une nouvelle liste pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lists.map(list => (
            <Link
              key={list.id}
              to={`/lists/${list.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {list.supplier?.name ?? 'Liste générale'}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Par {list.creator.name} · {new Date(list.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    {list.pending_count} article{list.pending_count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-gray-200">
        <Link to="/history" className="text-sm text-gray-500 hover:text-gray-700">
          Voir l'historique des courses →
        </Link>
      </div>
    </div>
  )
}
