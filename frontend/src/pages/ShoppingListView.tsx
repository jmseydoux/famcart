import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2, Check, ShoppingBag, ArrowLeft } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Modal, ConfirmModal } from '../components/ui/Modal'
import { PageSpinner } from '../components/ui/Spinner'
import { UNITS } from '../lib/constants'

interface Product { id: string; name: string; category: string }
interface ListItem {
  id: string; name: string; quantity: number; unit: string | null
  notes: string | null; status: string; added_by: { id: string; name: string }
  product: Product | null; sessionItems: Array<{ status: string }>
}
interface ShoppingList {
  id: string; status: string; supplier: { name: string } | null
  creator: { name: string }; items: ListItem[]
  sessions: Array<{ id: string; shopper: { id: string; name: string } }>
}

const emptyItem = { name: '', quantity: '1', unit: '', notes: '', product_id: '' }

export default function ShoppingListView() {
  const { hid, lid } = useParams<{ hid: string; lid: string }>()
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<ListItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<ListItem | null>(null)
  const [showStartConfirm, setShowStartConfirm] = useState(false)
  const [form, setForm] = useState(emptyItem)

  const { data, isLoading } = useQuery({
    queryKey: ['list', lid],
    queryFn: () => api.get<{ list: ShoppingList }>(`/households/${hid}/lists/${lid}`),
    enabled: !!hid && !!lid,
  })

  const { data: productsData } = useQuery({
    queryKey: ['products', hid],
    queryFn: () => api.get<{ products: Product[] }>(`/households/${hid}/products`),
    enabled: !!hid,
  })

  const addItem = useMutation({
    mutationFn: (d: typeof emptyItem) => api.post(`/households/${hid}/lists/${lid}/items`, {
      name: d.name || productsData?.products.find(p => p.id === d.product_id)?.name || d.name,
      quantity: Number(d.quantity),
      unit: d.unit || undefined,
      notes: d.notes || undefined,
      product_id: d.product_id || undefined,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['list', lid] }); setShowAdd(false); setForm(emptyItem) },
  })

  const updateItem = useMutation({
    mutationFn: (d: { id: string } & typeof emptyItem) => api.patch(`/households/${hid}/lists/${lid}/items/${d.id}`, {
      name: d.name, quantity: Number(d.quantity), unit: d.unit || null, notes: d.notes || null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['list', lid] }); setEditItem(null) },
  })

  const removeItem = useMutation({
    mutationFn: (id: string) => api.delete(`/households/${hid}/lists/${lid}/items/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['list', lid] }); setDeleteItem(null) },
  })

  const startSession = useMutation({
    mutationFn: () => api.post(`/households/${hid}/lists/${lid}/session/start`),
    onSuccess: () => { setShowStartConfirm(false); navigate(`/household/${hid}/lists/${lid}/shop`) },
  })

  const list = data?.list
  const products = productsData?.products ?? []
  const toBuyItems = list?.items.filter(i => i.status === 'TO_BUY') ?? []
  const doneItems = list?.items.filter(i => i.status !== 'TO_BUY') ?? []
  const isInProgress = list?.status === 'IN_PROGRESS'
  const activeSession = list?.sessions[0]
  const isMySession = activeSession?.shopper.id === appUser?.id

  if (isLoading) return <PageSpinner />
  if (!list) return <p className="text-center text-gray-400 py-8">Liste introuvable</p>

  function selectProduct(pid: string) {
    const p = products.find(x => x.id === pid)
    setForm(f => ({ ...f, product_id: pid, name: p?.name ?? f.name }))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            {list.supplier?.name ?? 'Liste générale'}
          </h1>
          <p className="text-sm text-gray-400">{list.items.length} article{list.items.length > 1 ? 's' : ''}</p>
        </div>
        {list.status === 'ACTIVE' && toBuyItems.length > 0 && (
          <Button size="sm" onClick={() => setShowStartConfirm(true)}>
            <ShoppingBag className="w-4 h-4" />
            Commencer
          </Button>
        )}
        {isInProgress && isMySession && (
          <Button size="sm" variant="secondary" onClick={() => navigate(`/household/${hid}/lists/${lid}/shop`)}>
            Reprendre
          </Button>
        )}
      </div>

      {/* In-progress banner */}
      {isInProgress && activeSession && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <p className="text-sm text-orange-800">
            {isMySession
              ? 'Vous êtes en train de faire les courses'
              : `${activeSession.shopper.name} fait les courses en ce moment`}
          </p>
        </div>
      )}

      {/* Add item button */}
      {list.status !== 'ARCHIVED' && (
        <Button variant="outline" className="w-full" onClick={() => { setShowAdd(true); setForm(emptyItem) }}>
          <Plus className="w-4 h-4" />
          Ajouter un article
        </Button>
      )}

      {/* Items to buy */}
      {toBuyItems.length === 0 && doneItems.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>Liste vide — ajoutez des articles</p>
        </div>
      ) : (
        <div className="space-y-2">
          {toBuyItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              currentUserId={appUser?.id}
              canEdit={list.status !== 'ARCHIVED'}
              onEdit={() => { setEditItem(item); setForm({ name: item.name, quantity: String(item.quantity), unit: item.unit ?? '', notes: item.notes ?? '', product_id: item.product?.id ?? '' }) }}
              onDelete={() => setDeleteItem(item)}
            />
          ))}

          {doneItems.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Terminés</p>
              {doneItems.map(item => (
                <ItemCard key={item.id} item={item} currentUserId={appUser?.id} canEdit={false} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add item modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Ajouter un article">
        <ItemForm
          form={form}
          setForm={setForm}
          products={products}
          onSelectProduct={selectProduct}
          onSubmit={() => addItem.mutate(form)}
          loading={addItem.isPending}
          submitLabel="Ajouter"
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Modifier l'article">
        <ItemForm
          form={form}
          setForm={setForm}
          products={products}
          onSelectProduct={selectProduct}
          onSubmit={() => updateItem.mutate({ id: editItem!.id, ...form })}
          loading={updateItem.isPending}
          submitLabel="Enregistrer"
        />
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => removeItem.mutate(deleteItem!.id)}
        title="Supprimer l'article"
        message={`Supprimer "${deleteItem?.name}" de la liste ?`}
        confirmLabel="Supprimer"
        confirmVariant="danger"
        loading={removeItem.isPending}
      />

      {/* Start shopping confirm */}
      <ConfirmModal
        open={showStartConfirm}
        onClose={() => setShowStartConfirm(false)}
        onConfirm={() => startSession.mutate()}
        title="Commencer les courses"
        message={`Vous allez démarrer une session de courses${list.supplier ? ` chez ${list.supplier.name}` : ''}. Les autres membres seront notifiés.`}
        confirmLabel="C'est parti !"
        loading={startSession.isPending}
      />
    </div>
  )
}

function ItemCard({ item, currentUserId, canEdit, onEdit, onDelete }: {
  item: ListItem; currentUserId?: string; canEdit: boolean
  onEdit?: () => void; onDelete?: () => void
}) {
  const isDone = item.status !== 'TO_BUY'
  return (
    <div className={`bg-white rounded-2xl border p-4 flex items-center gap-3 transition-colors ${isDone ? 'border-gray-100 opacity-60' : 'border-gray-200'}`}>
      <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isDone ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
        {isDone && <Check className="w-3.5 h-3.5 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-gray-900 ${isDone ? 'line-through text-gray-400' : ''}`}>{item.name}</p>
        <p className="text-sm text-gray-400">
          {item.quantity} {item.unit ?? ''} · {item.added_by.name}
          {item.notes && ` · ${item.notes}`}
        </p>
      </div>
      {canEdit && !isDone && (
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
            <Edit2 className="w-4 h-4" />
          </button>
          {item.added_by.id === currentUserId && (
            <button onClick={onDelete} className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ItemForm({ form, setForm, products, onSelectProduct, onSubmit, loading, submitLabel }: {
  form: typeof emptyItem; setForm: (f: typeof emptyItem) => void
  products: Product[]; onSelectProduct: (id: string) => void
  onSubmit: () => void; loading: boolean; submitLabel: string
}) {
  return (
    <div className="space-y-3">
      {products.length > 0 && (
        <Select label="Produit favori (optionnel)" value={form.product_id} onChange={e => onSelectProduct(e.target.value)}>
          <option value="">— Saisie libre —</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      )}
      <Input label="Nom de l'article" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex : Lait entier" required />
      <div className="flex gap-3">
        <div className="w-28 shrink-0">
          <Input label="Quantité" type="number" min="0.1" step="0.1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
        </div>
        <div className="flex-1 min-w-0">
          <Select label="Unité" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
            <option value="">—</option>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </Select>
        </div>
      </div>
      <Input label="Notes (optionnel)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Ex : marque préférée" />
      <Button className="w-full" size="lg" loading={loading} onClick={onSubmit} disabled={!form.name.trim() && !form.product_id}>
        {submitLabel}
      </Button>
    </div>
  )
}
