import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2, Package, Filter } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Modal, ConfirmModal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'
import { DEFAULT_CATEGORIES } from '../lib/constants'

interface Supplier { id: string; name: string }
interface Product {
  id: string; name: string; category: string
  suppliers: Array<{ supplier: Supplier }>
}

const emptyForm = { name: '', category: '', supplier_ids: [] as string[] }

export default function ProductCatalog() {
  const { hid } = useParams<{ hid: string }>()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [form, setForm] = useState(emptyForm)

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', hid, filterCategory],
    queryFn: () => api.get<{ products: Product[] }>(
      `/households/${hid}/products${filterCategory ? `?category=${encodeURIComponent(filterCategory)}` : ''}`
    ),
    enabled: !!hid,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories', hid],
    queryFn: () => api.get<{ categories: string[] }>(`/households/${hid}/products/categories`),
    enabled: !!hid,
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', hid],
    queryFn: () => api.get<{ suppliers: Supplier[] }>(`/households/${hid}/suppliers`),
    enabled: !!hid,
  })

  const addProduct = useMutation({
    mutationFn: (d: typeof emptyForm) => api.post(`/households/${hid}/products`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products', hid] }); setShowAdd(false); setForm(emptyForm) },
  })

  const updateProduct = useMutation({
    mutationFn: (d: { id: string } & typeof emptyForm) => api.patch(`/households/${hid}/products/${d.id}`, {
      name: d.name, category: d.category, supplier_ids: d.supplier_ids,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products', hid] }); setEditProduct(null) },
  })

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/households/${hid}/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products', hid] }); setDeleteProduct(null) },
  })

  const products = productsData?.products ?? []
  const categories = categoriesData?.categories ?? DEFAULT_CATEGORIES
  const suppliers = suppliersData?.suppliers ?? []

  function openEdit(p: Product) {
    setEditProduct(p)
    setForm({ name: p.name, category: p.category, supplier_ids: p.suppliers.map(s => s.supplier.id) })
  }

  const groupedByCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Catalogue produits</h1>
          <p className="text-sm text-gray-400">{products.length} produit{products.length > 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => { setShowAdd(true); setForm(emptyForm) }}>
          <Plus className="w-4 h-4" />
          Ajouter
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Toutes les catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Products */}
      {products.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-medium">Aucun produit</p>
          <p className="text-sm mt-1">Ajoutez vos produits favoris pour les retrouver rapidement</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByCategory).map(([cat, prods]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{cat}</p>
              <div className="space-y-2">
                {prods.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      {p.suppliers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.suppliers.map(s => (
                            <Badge key={s.supplier.id} variant="gray">{s.supplier.name}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(p)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteProduct(p)} className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouveau produit">
        <ProductForm form={form} setForm={setForm} categories={categories} suppliers={suppliers}
          onSubmit={() => addProduct.mutate(form)} loading={addProduct.isPending} submitLabel="Ajouter" />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editProduct} onClose={() => setEditProduct(null)} title="Modifier le produit">
        <ProductForm form={form} setForm={setForm} categories={categories} suppliers={suppliers}
          onSubmit={() => updateProduct.mutate({ id: editProduct!.id, ...form })} loading={updateProduct.isPending} submitLabel="Enregistrer" />
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onConfirm={() => deleteProductMutation.mutate(deleteProduct!.id)}
        title="Supprimer le produit"
        message={`Supprimer "${deleteProduct?.name}" du catalogue ?`}
        confirmLabel="Supprimer"
        confirmVariant="danger"
        loading={deleteProductMutation.isPending}
      />
    </div>
  )
}

function ProductForm({ form, setForm, categories, suppliers, onSubmit, loading, submitLabel }: {
  form: typeof emptyForm; setForm: (f: typeof emptyForm) => void
  categories: string[]; suppliers: Supplier[]
  onSubmit: () => void; loading: boolean; submitLabel: string
}) {
  const [customCat, setCustomCat] = useState('')
  const showCustom = form.category === '__custom__'

  function toggleSupplier(id: string) {
    setForm({
      ...form,
      supplier_ids: form.supplier_ids.includes(id)
        ? form.supplier_ids.filter(x => x !== id)
        : [...form.supplier_ids, id],
    })
  }

  return (
    <div className="space-y-3">
      <Input label="Nom du produit" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex : Lait entier" />
      <div>
        <Select label="Catégorie" value={showCustom ? '__custom__' : form.category} onChange={e => {
          if (e.target.value === '__custom__') setForm({ ...form, category: '__custom__' })
          else setForm({ ...form, category: e.target.value })
        }}>
          <option value="">— Choisir —</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
          <option value="__custom__">+ Catégorie personnalisée…</option>
        </Select>
        {showCustom && (
          <Input className="mt-2" placeholder="Nom de la catégorie" value={customCat} onChange={e => {
            setCustomCat(e.target.value)
            setForm({ ...form, category: e.target.value })
          }} />
        )}
      </div>
      {suppliers.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1.5">Fournisseurs associés</p>
          <div className="flex flex-wrap gap-2">
            {suppliers.map(s => (
              <button key={s.id} type="button" onClick={() => toggleSupplier(s.id)}
                className={`px-3 py-1.5 rounded-xl border text-sm transition-colors ${
                  form.supplier_ids.includes(s.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                }`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <Button className="w-full" size="lg" loading={loading} onClick={onSubmit} disabled={!form.name.trim() || !form.category.trim()}>
        {submitLabel}
      </Button>
    </div>
  )
}
