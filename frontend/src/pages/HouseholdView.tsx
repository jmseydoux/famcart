import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ShoppingCart, ShoppingBag, ChevronRight, Clock } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Input'
import { PageSpinner } from '../components/ui/Spinner'

interface Supplier { id: string; name: string }
interface ShoppingList {
  id: string
  status: 'ACTIVE' | 'IN_PROGRESS'
  supplier: Supplier | null
  creator: { name: string }
  created_at: string
  _count: { items: number }
  sessions: Array<{ shopper: { id: string; name: string } }>
}

export default function HouseholdView() {
  const { hid } = useParams<{ hid: string }>()
  const { appUser } = useAuth()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [createError, setCreateError] = useState('')

  const { data: listsData, isLoading } = useQuery({
    queryKey: ['lists', hid],
    queryFn: () => api.get<{ lists: ShoppingList[] }>(`/households/${hid}/lists`),
    enabled: !!hid,
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', hid],
    queryFn: () => api.get<{ suppliers: Supplier[] }>(`/households/${hid}/suppliers`),
    enabled: !!hid,
  })

  const createList = useMutation({
    mutationFn: () => api.post<{ list: ShoppingList }>(`/households/${hid}/lists`, {
      supplier_id: supplierId || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists', hid] })
      setShowCreate(false)
      setSupplierId('')
    },
    onError: (err: Error) => setCreateError(err.message),
  })

  const lists = listsData?.lists ?? []
  const suppliers = suppliersData?.suppliers ?? []
  const activeLists = lists.filter(l => l.status === 'ACTIVE')
  const inProgressLists = lists.filter(l => l.status === 'IN_PROGRESS')

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      {/* In-progress lists */}
      {inProgressLists.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Courses en cours
          </h2>
          <div className="space-y-2">
            {inProgressLists.map(list => (
              <ListCard key={list.id} list={list} hid={hid!} currentUserId={appUser?.id} />
            ))}
          </div>
        </div>
      )}

      {/* Active lists */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Listes actives</h2>
          <Button size="sm" onClick={() => { setShowCreate(true); setCreateError('') }}>
            <Plus className="w-4 h-4" />
            Nouvelle liste
          </Button>
        </div>

        {activeLists.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
            <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 font-medium">Aucune liste active</p>
            <p className="text-sm text-gray-400 mt-1">Créez une liste pour commencer</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeLists.map(list => (
              <ListCard key={list.id} list={list} hid={hid!} currentUserId={appUser?.id} />
            ))}
          </div>
        )}
      </div>

      {/* Create list modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle liste de courses">
        <div className="space-y-4">
          <Select
            label="Fournisseur (optionnel)"
            value={supplierId}
            onChange={e => setSupplierId(e.target.value)}
          >
            <option value="">— Sans fournisseur —</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          {createError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{createError}</p>}
          <Button className="w-full" size="lg" loading={createList.isPending} onClick={() => createList.mutate()}>
            Créer la liste
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function ListCard({ list, hid, currentUserId }: { list: ShoppingList; hid: string; currentUserId?: string }) {
  const isInProgress = list.status === 'IN_PROGRESS'
  const shopper = list.sessions[0]?.shopper
  const isMySession = shopper?.id === currentUserId

  return (
    <Link
      to={`/household/${hid}/lists/${list.id}`}
      className={`block rounded-2xl border p-4 transition-all active:scale-[0.98] ${
        isInProgress
          ? 'bg-orange-50 border-orange-200 hover:border-orange-400'
          : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`p-1.5 rounded-lg ${isInProgress ? 'bg-orange-100' : 'bg-blue-50'}`}>
              {isInProgress ? (
                <ShoppingBag className="w-4 h-4 text-orange-600" />
              ) : (
                <ShoppingCart className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <h3 className="font-semibold text-gray-900 truncate">
              {list.supplier?.name ?? 'Liste générale'}
            </h3>
            {isInProgress && (
              <Badge variant="orange">En cours</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400 ml-9">
            <span>{list._count.items} article{list._count.items > 1 ? 's' : ''}</span>
            {isInProgress && shopper && (
              <span className="text-orange-600 font-medium">
                {isMySession ? '👤 Vous faites les courses' : `🛒 ${shopper.name} fait les courses`}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
      </div>
    </Link>
  )
}
