import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsApi } from '@/lib/api'
import { Contact } from '@/types'
import { formatDate } from '@/lib/utils'
import { Plus, Pencil, Trash2, User, Mail, Phone, Building2, StickyNote, X } from 'lucide-react'

const EMPTY: Omit<Contact, 'id' | 'created_at'> = {
  name: '', company: '', email: '', phone: '', notes: '', last_contact: '', met_at: ''
}

export default function Contacts() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [form, setForm] = useState<Omit<Contact, 'id' | 'created_at'>>(EMPTY)

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: () => contactsApi.list() as Promise<Contact[]>,
  })

  const createMut = useMutation({
    mutationFn: (data: unknown) => contactsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); closeModal() },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => contactsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); closeModal() },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => contactsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })

  const f = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  function openAdd() {
    setEditing(null)
    setForm(EMPTY)
    setShowModal(true)
  }

  function openEdit(c: Contact) {
    setEditing(c)
    setForm({ name: c.name, company: c.company, email: c.email || '', phone: c.phone || '', notes: c.notes || '', last_contact: c.last_contact || '', met_at: c.met_at || '' })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setForm(EMPTY)
  }

  function handleSave() {
    if (!form.name) return
    if (editing) {
      updateMut.mutate({ id: editing.id, data: form })
    } else {
      createMut.mutate(form)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-bold text-xl">جهات الاتصال</h1>
        <span className="badge-gray">{contacts.length}</span>
        <button onClick={openAdd} className="btn-primary text-xs px-3 py-1.5 mr-auto">
          <Plus size={13} />إضافة جهة اتصال
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-32 animate-pulse bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="card p-12 text-center">
          <User size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500">لا جهات اتصال بعد</p>
          <button onClick={openAdd} className="btn-primary text-xs mt-4 px-4">
            <Plus size={13} />إضافة أول جهة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contacts.map(c => (
            <div key={c.id} className="card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                  <User size={18} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{c.name}</p>
                  {c.company && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Building2 size={10} />{c.company}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(c)} className="btn-ghost p-1.5 text-gray-400 hover:text-primary-500">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteMut.mutate(c.id)} className="btn-ghost p-1.5 text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {c.email && (
                  <a href={`mailto:${c.email}`} className="text-xs flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline">
                    <Mail size={12} />{c.email}
                  </a>
                )}
                {c.phone && (
                  <p className="text-xs flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Phone size={12} />{c.phone}
                  </p>
                )}
                {c.notes && (
                  <p className="text-xs flex items-start gap-2 text-gray-500">
                    <StickyNote size={12} className="mt-0.5 shrink-0" />{c.notes}
                  </p>
                )}
              </div>

              {(c.last_contact || c.met_at) && (
                <div className="border-t border-gray-50 dark:border-gray-800 pt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                  {c.met_at && <span>تعرّفنا: {formatDate(c.met_at)}</span>}
                  {c.last_contact && <span>آخر تواصل: {formatDate(c.last_contact)}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="card p-6 w-full max-w-md animate-slide-up space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold">{editing ? 'تعديل جهة اتصال' : 'إضافة جهة اتصال'}</h2>
              <button onClick={closeModal} className="btn-ghost p-1.5"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium block mb-1">الاسم *</label>
                <input className="input" value={form.name} onChange={f('name')} placeholder="اسم المسؤول" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium block mb-1">الشركة</label>
                <input className="input" value={form.company} onChange={f('company')} placeholder="اسم الشركة" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">الإيميل</label>
                <input className="input" type="email" value={form.email} onChange={f('email')} placeholder="email@company.com" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">الجوال</label>
                <input className="input" value={form.phone} onChange={f('phone')} placeholder="+966..." />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">تاريخ التعارف</label>
                <input className="input" type="date" value={form.met_at} onChange={f('met_at')} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">آخر تواصل</label>
                <input className="input" type="date" value={form.last_contact} onChange={f('last_contact')} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium block mb-1">ملاحظات</label>
                <textarea className="input resize-none" rows={2} value={form.notes} onChange={f('notes')} placeholder="ملاحظات..." />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={closeModal} className="btn-secondary">إلغاء</button>
              <button
                onClick={handleSave}
                disabled={!form.name || createMut.isPending || updateMut.isPending}
                className="btn-primary"
              >
                {editing ? 'حفظ التعديل' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
