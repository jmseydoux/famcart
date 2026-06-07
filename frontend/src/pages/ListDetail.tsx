import { useState, FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

interface ShoppingItem {
  id: string
  name: string
  quantity: number
  unit: string | null
  status: 'PENDING' | 'BOUGHT' | 'UNAVAILABLE'
  requester: { id: string; name: string }
}

interface ShoppingList {
  id: string
  status: 'OPEN' | 'CLOSED'
  created_at: string
  supplier: { id: string; name: string } | null
  creator: { id: string; name: string }
  items: ShoppingItem[]
}

export default function ListDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('')
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['list', id],
    queryFn: () => api.get<{ list: ShoppingList }>(`/lists/${id}`),
  })

  const addItem = useMutation({
    mutationFn: (body: { name: string; quantity: number; unit?: string }) =>
      api.post<{ item: ShoppingItem }>(`/lists/${id}/items`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', id] })
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      setName('')
      setQuantity('1')
      setUnit('')
      setError('')
    },
    onError: (err: Error) => setError(err.message),
  })

  const removeItem = useMutation({
    mutationFn: (itemId: string) => api.delete(`/lists/${id}/items/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', id] })
      queryClient.invalidateQueries({ queryKey: ['lists'] })
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    addItem.mutate({
      name: name.trim(),
      quantity: parseFloat(quantity) || 1,
      unit: unit.trim() || undefined,
    })
  }

  if (isLoading) return <div className="text-center py-16 text-gray-400 text-sm">Chargement…</div>
  if (!data) return <div className="text-center py-16 text-gray-500">Liste introuvable.</div>

  const { list } = data
  const pendingItems = list.items.filter(i => i.status === 'PENDING')

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">← Retour</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {list.supplier?.name ?? 'Liste générale'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Par {list.creator.name} · {new Date(list.created_at).toLocaleDateString('fr-FR')}
          {list.status === 'CLOSED' && (
            <span className="ml-2 inline-flex items-center bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
              Clôturée
            </span>
          )}
        </p>
      </div>

      {list.status === 'OPEN' && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Ajouter un article</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nom de l'article"
              required
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              min="0.1"
              step="0.1"
              className="w-20 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={unit}
              onChange={e => setUnit(e.target.value)}
              placeholder="unité"
              className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={addItem.isPending}
              className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Ajouter
            </button>
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </form>
      )}

      {list.items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Aucun article pour l'instant.</div>
      ) : (
        <div className="space-y-2">
          {pendingItems.map(item => (
            <div
              key={item.id}
              className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm flex items-center justify-between"
            >
              <div>
                <span className="font-medium text-gray-900">{item.name}</span>
                <span className="text-gray-500 text-sm ml-2">
                  {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                </span>
                <span className="text-gray-400 text-xs ml-2">· {item.requester.name}</span>
              </div>
              {list.status === 'OPEN' && (
                <button
                  onClick={() => removeItem.mutate(item.id)}
                  disabled={removeItem.isPending}
                  className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none px-1"
                  title="Supprimer"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
