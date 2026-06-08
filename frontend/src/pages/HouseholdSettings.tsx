import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Store, Link2, Trash2, Crown, UserMinus, Plus, Copy, Check } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal, ConfirmModal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'

interface Member { id: string; role: string; user: { id: string; name: string; email: string } }
interface Supplier { id: string; name: string }
interface Invitation { id: string; code: string; token: string; email: string | null; expires_at: string; used_at: string | null }

export default function HouseholdSettings() {
  const { hid } = useParams<{ hid: string }>()
  const { appUser } = useAuth()
  const queryClient = useQueryClient()

  // Household name
  const { data: householdData } = useQuery({
    queryKey: ['household', hid],
    queryFn: () => api.get<{ household: { id: string; name: string; role: string } }>(`/households/${hid}`),
    enabled: !!hid,
  })
  const [editName, setEditName] = useState(false)
  const [newHouseholdName, setNewHouseholdName] = useState('')

  // Members
  const { data: membersData, isLoading } = useQuery({
    queryKey: ['members', hid],
    queryFn: () => api.get<{ members: Member[] }>(`/households/${hid}/members`),
    enabled: !!hid,
  })
  const [removeMember, setRemoveMember] = useState<Member | null>(null)

  // Suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', hid],
    queryFn: () => api.get<{ suppliers: Supplier[] }>(`/households/${hid}/suppliers`),
    enabled: !!hid,
  })
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null)

  // Invitations
  const { data: invitationsData } = useQuery({
    queryKey: ['invitations', hid],
    queryFn: () => api.get<{ invitations: Invitation[] }>(`/households/${hid}/invitations`),
    enabled: !!hid,
  })
  const [showCreateInvite, setShowCreateInvite] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const updateName = useMutation({
    mutationFn: (name: string) => api.patch(`/households/${hid}`, { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['household', hid] }); setEditName(false) },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (uid: string) => api.delete(`/households/${hid}/members/${uid}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['members', hid] }); setRemoveMember(null) },
  })

  const addSupplier = useMutation({
    mutationFn: (name: string) => api.post(`/households/${hid}/suppliers`, { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers', hid] }); setShowAddSupplier(false); setNewSupplierName('') },
  })

  const deleteSupplierMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/households/${hid}/suppliers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers', hid] }); setDeleteSupplier(null) },
  })

  const createInvitation = useMutation({
    mutationFn: () => api.post(`/households/${hid}/invitations`, { expires_in_days: 7 }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invitations', hid] }); setShowCreateInvite(false) },
  })

  const revokeInvitation = useMutation({
    mutationFn: (id: string) => api.delete(`/households/${hid}/invitations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitations', hid] }),
  })

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const members = membersData?.members ?? []
  const suppliers = suppliersData?.suppliers ?? []
  const invitations = invitationsData?.invitations ?? []
  const household = householdData?.household
  const activeInvitations = invitations.filter(i => !i.used_at && new Date(i.expires_at) > new Date())

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Réglages du ménage</h1>
      </div>

      {/* Household name */}
      <Section title="Ménage">
        {editName ? (
          <div className="flex gap-2">
            <Input value={newHouseholdName} onChange={e => setNewHouseholdName(e.target.value)} autoFocus />
            <Button size="sm" loading={updateName.isPending} onClick={() => updateName.mutate(newHouseholdName)} disabled={!newHouseholdName.trim()}>
              OK
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditName(false)}>Annuler</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900">{household?.name}</p>
            <Button variant="ghost" size="sm" onClick={() => { setNewHouseholdName(household?.name ?? ''); setEditName(true) }}>
              Modifier
            </Button>
          </div>
        )}
      </Section>

      {/* Members */}
      <Section title="Membres" icon={<Users className="w-4 h-4" />} action={
        <Button size="sm" onClick={() => setShowCreateInvite(true)}>
          <Plus className="w-3.5 h-3.5" />
          Inviter
        </Button>
      }>
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold flex items-center justify-center flex-shrink-0">
                {m.user.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{m.user.name}</p>
                <p className="text-xs text-gray-400 truncate">{m.user.email}</p>
              </div>
              <div className="flex items-center gap-1">
                {m.role === 'ADMIN' && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                <Badge variant={m.role === 'ADMIN' ? 'blue' : 'gray'}>
                  {m.role === 'ADMIN' ? 'Admin' : 'Membre'}
                </Badge>
                {m.user.id !== appUser?.id && (
                  <button onClick={() => setRemoveMember(m)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 ml-1">
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Active invitations */}
      {activeInvitations.length > 0 && (
        <Section title="Invitations actives" icon={<Link2 className="w-4 h-4" />}>
          <div className="space-y-2">
            {activeInvitations.map(inv => (
              <div key={inv.id} className="bg-blue-50 rounded-xl p-3 flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 tracking-widest">{inv.code}</span>
                    <button onClick={() => copyCode(inv.code)} className="text-blue-400 hover:text-blue-600">
                      {copiedCode === inv.code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-blue-500 mt-0.5">
                    Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <button onClick={() => revokeInvitation.mutate(inv.id)} className="text-xs text-red-500 hover:underline">
                  Révoquer
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Suppliers */}
      <Section title="Fournisseurs" icon={<Store className="w-4 h-4" />} action={
        <Button size="sm" variant="ghost" onClick={() => setShowAddSupplier(true)}>
          <Plus className="w-3.5 h-3.5" />
          Ajouter
        </Button>
      }>
        {suppliers.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun fournisseur. Ajoutez vos magasins favoris.</p>
        ) : (
          <div className="space-y-1">
            {suppliers.map(s => (
              <div key={s.id} className="flex items-center justify-between py-1.5">
                <span className="text-gray-800">{s.name}</span>
                <button onClick={() => setDeleteSupplier(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Modals */}
      <Modal open={showCreateInvite} onClose={() => setShowCreateInvite(false)} title="Inviter un membre">
        <p className="text-gray-600 mb-4">Un code d'invitation à 6 caractères valable 7 jours sera généré.</p>
        <Button className="w-full" size="lg" loading={createInvitation.isPending} onClick={() => createInvitation.mutate()}>
          Générer le code
        </Button>
      </Modal>

      <Modal open={showAddSupplier} onClose={() => setShowAddSupplier(false)} title="Nouveau fournisseur">
        <div className="space-y-4">
          <Input label="Nom du fournisseur" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="Ex : Lidl, Carrefour…" autoFocus />
          <Button className="w-full" size="lg" loading={addSupplier.isPending} onClick={() => addSupplier.mutate(newSupplierName)} disabled={!newSupplierName.trim()}>
            Ajouter
          </Button>
        </div>
      </Modal>

      <ConfirmModal
        open={!!removeMember}
        onClose={() => setRemoveMember(null)}
        onConfirm={() => removeMemberMutation.mutate(removeMember!.user.id)}
        title="Retirer le membre"
        message={`Retirer ${removeMember?.user.name} du ménage ?`}
        confirmLabel="Retirer"
        confirmVariant="danger"
        loading={removeMemberMutation.isPending}
      />

      <ConfirmModal
        open={!!deleteSupplier}
        onClose={() => setDeleteSupplier(null)}
        onConfirm={() => deleteSupplierMutation.mutate(deleteSupplier!.id)}
        title="Supprimer le fournisseur"
        message={`Supprimer "${deleteSupplier?.name}" ? Les listes associées perdront leur fournisseur.`}
        confirmLabel="Supprimer"
        confirmVariant="danger"
        loading={deleteSupplierMutation.isPending}
      />
    </div>
  )
}

function Section({ title, icon, action, children }: {
  title: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 text-gray-700 font-semibold">
          {icon}
          {title}
        </div>
        {action}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}
