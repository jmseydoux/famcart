import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Circle, RefreshCw, Flag, ArrowLeft } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '../components/ui/Button'
import { ConfirmModal } from '../components/ui/Modal'
import { PageSpinner } from '../components/ui/Spinner'

interface SessionItem {
  id: string
  status: 'PENDING' | 'BOUGHT' | 'UNAVAILABLE' | 'SKIPPED'
  item: {
    id: string; name: string; quantity: number; unit: string | null
    notes: string | null; added_by: { name: string }
  }
}
interface Session {
  id: string
  shopper: { id: string; name: string }
  items: SessionItem[]
  ended_at: string | null
}

export default function ShoppingMode() {
  const { hid, lid } = useParams<{ hid: string; lid: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<string | null>(null)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['session', lid],
    queryFn: () => api.get<{ session: Session | null }>(`/households/${hid}/lists/${lid}/session`),
    enabled: !!hid && !!lid,
  })

  const toggleItem = useMutation({
    mutationFn: ({ siid, status }: { siid: string; status: string }) =>
      api.patch(`/households/${hid}/lists/${lid}/session/items/${siid}`, { status }),
    onMutate: ({ siid }) => setPendingToggle(siid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', lid] })
      setPendingToggle(null)
    },
    onError: () => setPendingToggle(null),
  })

  const refreshSession = useMutation({
    mutationFn: () => api.post(`/households/${hid}/lists/${lid}/session/refresh`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['session', lid] }),
  })

  const endSession = useMutation({
    mutationFn: () => api.post(`/households/${hid}/lists/${lid}/session/end`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists', hid] })
      navigate(`/household/${hid}/lists`)
    },
  })

  const session = data?.session
  const pendingItems = session?.items.filter(i => i.status === 'PENDING') ?? []
  const boughtItems = session?.items.filter(i => i.status === 'BOUGHT') ?? []
  const total = session?.items.length ?? 0

  if (isLoading) return <PageSpinner />
  if (!session) return (
    <div className="text-center py-12">
      <p className="text-gray-500 mb-4">Aucune session active pour cette liste</p>
      <Button variant="secondary" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4" />
        Retour
      </Button>
    </div>
  )

  const progress = total > 0 ? Math.round((boughtItems.length / total) * 100) : 0

  function handleToggle(item: SessionItem) {
    const newStatus = item.status === 'BOUGHT' ? 'PENDING' : 'BOUGHT'
    toggleItem.mutate({ siid: item.id, status: newStatus })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Mode courses 🛒</h1>
          <p className="text-sm text-gray-400">{boughtItems.length}/{total} article{total > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progression</span>
          <span className="text-sm font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          loading={refreshSession.isPending || isFetching}
          onClick={() => { refreshSession.mutate(); refetch() }}
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={() => setShowEndConfirm(true)}
        >
          <Flag className="w-4 h-4" />
          Terminer
        </Button>
      </div>

      {/* Shopping items */}
      <div className="space-y-2">
        {pendingItems.length === 0 && boughtItems.length === 0 && (
          <p className="text-center text-gray-400 py-6">Aucun article</p>
        )}

        {/* Pending items */}
        {pendingItems.map(item => (
          <ShoppingItemCard
            key={item.id}
            item={item}
            onToggle={() => handleToggle(item)}
            isPending={pendingToggle === item.id}
          />
        ))}

        {/* Bought items section */}
        {boughtItems.length > 0 && (
          <>
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mt-4 mb-2">
              ✓ Achetés ({boughtItems.length})
            </p>
            {boughtItems.map(item => (
              <ShoppingItemCard
                key={item.id}
                item={item}
                onToggle={() => handleToggle(item)}
                isPending={pendingToggle === item.id}
              />
            ))}
          </>
        )}
      </div>

      {/* End session confirm */}
      <ConfirmModal
        open={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        onConfirm={() => endSession.mutate()}
        title="Terminer les courses"
        message={`Vous avez acheté ${boughtItems.length} article${boughtItems.length > 1 ? 's' : ''} sur ${total}. ${pendingItems.length > 0 ? `Les ${pendingItems.length} articles restants seront reportés dans une nouvelle liste.` : 'Tous les articles ont été achetés !'}`}
        confirmLabel="Terminer les courses"
        loading={endSession.isPending}
      />
    </div>
  )
}

function ShoppingItemCard({ item, onToggle, isPending }: {
  item: SessionItem; onToggle: () => void; isPending: boolean
}) {
  const isBought = item.status === 'BOUGHT'

  return (
    <button
      onClick={onToggle}
      disabled={isPending}
      className={`w-full text-left rounded-2xl border p-4 flex items-center gap-4 transition-all active:scale-[0.98] ${
        isBought
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
      }`}
    >
      <div className="flex-shrink-0">
        {isPending ? (
          <div className="w-7 h-7 rounded-full border-2 border-blue-400 animate-pulse" />
        ) : isBought ? (
          <CheckCircle className="w-7 h-7 text-green-500" />
        ) : (
          <Circle className="w-7 h-7 text-gray-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-lg font-medium leading-snug ${isBought ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {item.item.name}
        </p>
        <p className="text-sm text-gray-400">
          {item.item.quantity} {item.item.unit ?? ''}
          {item.item.notes && ` · ${item.item.notes}`}
        </p>
      </div>
    </button>
  )
}
