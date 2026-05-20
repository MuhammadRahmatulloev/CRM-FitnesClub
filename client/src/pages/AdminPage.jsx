import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const BASE_URL = 'http://127.0.0.1:8000'

const TABS = [
  { key: 'users', label: 'Users' },
  { key: 'products', label: 'Products' },
  { key: 'categories', label: 'Categories' },
  { key: 'memberships', label: 'Memberships' },
  { key: 'payments', label: 'Payments' },
  { key: 'orders', label: 'Orders' },
]

const emptyUser = { first_name: '', last_name: '', email: '', phone_number: '', age: '', address: '', role: 'client' }
const emptyProduct = { name: '', description: '', price: '', stock: '', category: '', is_available: true }
const emptyPlan = { name: '', description: '', price_per_month: '', is_active: true }
const emptyMembership = { client: '', plan: '', start_date: '', months_count: 1, status: 'active' }

function F({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      {children}
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('users')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'success' })

  const [users, setUsers] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [plans, setPlans] = useState([])
  const [memberships, setMemberships] = useState([])
  const [payments, setPayments] = useState([])
  const [orders, setOrders] = useState([])

  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [catName, setCatName] = useState('')

  useEffect(() => { if (user && user.role !== 'admin') navigate('/') }, [user])
  useEffect(() => { fetchTab(tab) }, [tab])

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast({ msg: '', type: 'success' }), 3000) }

  const fetchTab = async (t) => {
    setLoading(true)
    try {
      if (t === 'users') { const r = await api.get('/admin/users/'); setUsers(r.data.results || r.data) }
      if (t === 'products') {
        const [p, c] = await Promise.all([api.get('/shop/products/'), api.get('/shop/categories/')])
        setProducts(p.data.results || p.data)
        setCategories(c.data.results || c.data)
      }
      if (t === 'categories') { const r = await api.get('/shop/categories/'); setCategories(r.data.results || r.data) }
      if (t === 'memberships') {
        const [m, p, u] = await Promise.all([api.get('/memberships/'), api.get('/memberships/plans/'), api.get('/admin/users/')])
        setMemberships(m.data.results || m.data)
        setPlans(p.data.results || p.data)
        setUsers(u.data.results || u.data)
      }
      if (t === 'payments') { const r = await api.get('/payments/'); setPayments(r.data.results || r.data) }
      if (t === 'orders') { const r = await api.get('/shop/orders/'); setOrders(r.data.results || r.data) }
    } catch {}
    setLoading(false)
  }

  const openModal = (type, data = null) => {
    setModal({ type, editing: data })
    setImageFile(null)
    setImagePreview(null)
    if (type === 'user') setForm(data ? { first_name: data.first_name, last_name: data.last_name, email: data.email, phone_number: data.phone_number, age: data.age || '', address: data.address || '', role: data.role } : { ...emptyUser })
    if (type === 'product') { setForm(data ? { name: data.name, description: data.description || '', price: data.price, stock: data.stock, category: data.category || '', is_available: data.is_available } : { ...emptyProduct }); if (data?.image) setImagePreview(`${BASE_URL}${data.image}`) }
    if (type === 'plan') setForm(data ? { name: data.name, description: data.description || '', price_per_month: data.price_per_month, is_active: data.is_active } : { ...emptyPlan })
    if (type === 'membership') setForm(data ? { client: data.client, plan: data.plan, start_date: data.start_date, months_count: data.months_count, status: data.status } : { ...emptyMembership })
  }

  const closeModal = () => { setModal(null); setForm({}) }

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const saveUser = async () => {
    setSaving(true)
    try {
      if (modal.editing) { await api.patch(`/admin/users/${modal.editing.id}/`, form); showToast('User updated') }
      else { await api.post('/admin/users/', form); showToast('User created — password sent to email') }
      closeModal(); fetchTab('users')
    } catch (e) { showToast(JSON.stringify(e.response?.data || 'Error'), 'error') }
    setSaving(false)
  }

  const deleteUser = async (id) => {
    if (!confirm('Delete this user?')) return
    await api.delete(`/admin/users/${id}/`)
    showToast('User deleted')
    fetchTab('users')
  }

  const saveProduct = async () => {
    setSaving(true)
    try {
      const data = new FormData()
      Object.entries(form).forEach(([k, v]) => data.append(k, v))
      if (imageFile) data.append('image', imageFile)
      const config = { headers: { 'Content-Type': 'multipart/form-data' } }
      if (modal.editing) { await api.patch(`/shop/products/${modal.editing.id}/`, data, config); showToast('Product updated') }
      else { await api.post('/shop/products/', data, config); showToast('Product added') }
      closeModal(); fetchTab('products')
    } catch { showToast('Error saving product', 'error') }
    setSaving(false)
  }

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return
    await api.delete(`/shop/products/${id}/`)
    showToast('Product deleted')
    fetchTab('products')
  }

  const addCategory = async () => {
    if (!catName.trim()) return
    try {
      await api.post('/shop/categories/', { name: catName })
      setCatName('')
      showToast('Category added')
      fetchTab('categories')
      if (tab === 'products') fetchTab('products')
    } catch { showToast('Error adding category', 'error') }
  }

  const savePlan = async () => {
    setSaving(true)
    try {
      if (modal.editing) { await api.patch(`/memberships/plans/${modal.editing.id}/`, form); showToast('Plan updated') }
      else { await api.post('/memberships/plans/', form); showToast('Plan added') }
      closeModal(); fetchTab('memberships')
    } catch { showToast('Error saving plan', 'error') }
    setSaving(false)
  }

  const saveMembership = async () => {
    setSaving(true)
    try {
      if (modal.editing) { await api.patch(`/memberships/${modal.editing.id}/`, form); showToast('Membership updated') }
      else { await api.post('/memberships/', form); showToast('Membership assigned') }
      closeModal(); fetchTab('memberships')
    } catch { showToast('Error saving membership', 'error') }
    setSaving(false)
  }

  const updatePayment = async (id, status) => {
    await api.patch(`/payments/${id}/`, { status })
    showToast('Payment updated')
    fetchTab('payments')
  }

  const updateOrder = async (id, status) => {
    await api.patch(`/shop/orders/${id}/status/`, { status })
    showToast('Order updated')
    fetchTab('orders')
  }

  const roleColor = { admin: '#a3e635', trainer: '#38bdf8', client: '#a78bfa' }
  const statusColor = { active: '#22c55e', frozen: '#f59e0b', expired: '#ef4444', paid: '#22c55e', unpaid: '#ef4444', pending: '#f59e0b', ready: '#38bdf8', picked_up: '#22c55e', cancelled: '#ef4444' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      {toast.msg && (
        <div style={{
          position: 'fixed', top: '80px', right: '24px', zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : 'var(--lime)',
          color: toast.type === 'error' ? '#fff' : '#0a0f1e',
          padding: '12px 24px', borderRadius: '10px', fontWeight: 700, fontSize: '14px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)', maxWidth: '400px',
        }}>{toast.msg}</div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 700 }}>
                {modal.editing ? 'Edit' : 'Add'} {modal.type.charAt(0).toUpperCase() + modal.type.slice(1)}
              </h2>
              <button onClick={closeModal} style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '20px', padding: '4px 8px' }}>&#x2715;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {modal.type === 'user' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <F label="First Name">
                      <input value={form.first_name || ''} onChange={e => setForm(prev => ({ ...prev, first_name: e.target.value }))} />
                    </F>
                    <F label="Last Name">
                      <input value={form.last_name || ''} onChange={e => setForm(prev => ({ ...prev, last_name: e.target.value }))} />
                    </F>
                  </div>
                  <F label="Email">
                    <input type="email" value={form.email || ''} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} />
                  </F>
                  <F label="Phone Number">
                    <input value={form.phone_number || ''} onChange={e => setForm(prev => ({ ...prev, phone_number: e.target.value }))} placeholder="+992901234567" />
                  </F>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <F label="Age">
                      <input type="number" value={form.age || ''} onChange={e => setForm(prev => ({ ...prev, age: e.target.value }))} />
                    </F>
                    <F label="Role">
                      <select value={form.role || 'client'} onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}>
                        <option value="client">Client</option>
                        <option value="trainer">Trainer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </F>
                  </div>
                  <F label="Address">
                    <input value={form.address || ''} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} />
                  </F>
                  {!modal.editing && <p style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '10px', borderRadius: '8px' }}>Password will be auto-generated and sent to email</p>}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button className="btn-secondary" onClick={closeModal} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={saveUser} disabled={saving} style={{ flex: 2, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : modal.editing ? 'Save Changes' : 'Create User'}</button>
                  </div>
                </>
              )}

              {modal.type === 'product' && (
                <>
                  <div
                    style={{ width: '100%', height: '160px', borderRadius: '12px', border: '2px dashed var(--border)', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() => document.getElementById('img-input').click()}
                  >
                    {imagePreview
                      ? <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}><div style={{ fontSize: '28px' }}>+</div><div style={{ fontSize: '12px' }}>Upload image</div></div>}
                    <input id="img-input" type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
                  </div>
                  <F label="Product Name">
                    <input value={form.name || ''} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
                  </F>
                  <F label="Description">
                    <textarea value={form.description || ''} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
                  </F>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <F label="Price">
                      <input type="number" value={form.price || ''} onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))} />
                    </F>
                    <F label="Stock">
                      <input type="number" value={form.stock || ''} onChange={e => setForm(prev => ({ ...prev, stock: e.target.value }))} />
                    </F>
                  </div>
                  <F label="Category">
                    <select value={form.category || ''} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}>
                      <option value="">No category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </F>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text)', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.is_available} onChange={e => setForm(prev => ({ ...prev, is_available: e.target.checked }))} style={{ width: 'auto' }} />
                    Available in shop
                  </label>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button className="btn-secondary" onClick={closeModal} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={saveProduct} disabled={saving} style={{ flex: 2, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : modal.editing ? 'Save Changes' : 'Add Product'}</button>
                  </div>
                </>
              )}

              {modal.type === 'plan' && (
                <>
                  <F label="Plan Name">
                    <input value={form.name || ''} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
                  </F>
                  <F label="Description">
                    <textarea value={form.description || ''} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
                  </F>
                  <F label="Price per Month">
                    <input type="number" value={form.price_per_month || ''} onChange={e => setForm(prev => ({ ...prev, price_per_month: e.target.value }))} />
                  </F>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text)', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))} style={{ width: 'auto' }} />
                    Active plan
                  </label>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button className="btn-secondary" onClick={closeModal} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={savePlan} disabled={saving} style={{ flex: 2, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : modal.editing ? 'Save' : 'Add Plan'}</button>
                  </div>
                </>
              )}

              {modal.type === 'membership' && (
                <>
                  <F label="Client">
                    <select value={form.client || ''} onChange={e => setForm(prev => ({ ...prev, client: e.target.value }))}>
                      <option value="">Select client</option>
                      {users.filter(u => u.role === 'client').map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                    </select>
                  </F>
                  <F label="Plan">
                    <select value={form.plan || ''} onChange={e => setForm(prev => ({ ...prev, plan: e.target.value }))}>
                      <option value="">Select plan</option>
                      {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price_per_month}/mo</option>)}
                    </select>
                  </F>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <F label="Start Date">
                      <input type="date" value={form.start_date || ''} onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))} />
                    </F>
                    <F label="Months">
                      <input type="number" min="1" value={form.months_count || 1} onChange={e => setForm(prev => ({ ...prev, months_count: e.target.value }))} />
                    </F>
                  </div>
                  <F label="Status">
                    <select value={form.status || 'active'} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}>
                      <option value="active">Active</option>
                      <option value="frozen">Frozen</option>
                      <option value="expired">Expired</option>
                    </select>
                  </F>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button className="btn-secondary" onClick={closeModal} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={saveMembership} disabled={saving} style={{ flex: 2, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : modal.editing ? 'Save' : 'Assign'}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>Admin Panel</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '15px' }}>Full control over the fitness club</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '10px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '14px',
              background: tab === t.key ? 'var(--lime)' : 'var(--bg-card)',
              color: tab === t.key ? '#0a0f1e' : 'var(--text-muted)',
              border: `1px solid ${tab === t.key ? 'var(--lime)' : 'var(--border)'}`,
            }}>{t.label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '80px' }}>Loading...</div>
        ) : (
          <>
            {tab === 'users' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                  <button className="btn-primary" onClick={() => openModal('user')} style={{ padding: '12px 24px' }}>+ Add User</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {users.map(u => (
                    <div key={u.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: roleColor[u.role] || 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0f1e', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>
                        {u.first_name?.[0]}{u.last_name?.[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '15px' }}>{u.first_name} {u.last_name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{u.phone_number} · {u.email}</div>
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: `${roleColor[u.role]}20`, color: roleColor[u.role] }}>{u.role}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-secondary" onClick={() => openModal('user', u)} style={{ padding: '8px 16px', fontSize: '13px' }}>Edit</button>
                        <button className="btn-danger" onClick={() => deleteUser(u.id)} style={{ padding: '8px 16px', fontSize: '13px' }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'products' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                  <button className="btn-primary" onClick={() => openModal('product')} style={{ padding: '12px 24px' }}>+ Add Product</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                  {products.map(p => (
                    <div key={p.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                      <div style={{ height: '160px', background: 'var(--bg-input)', position: 'relative' }}>
                        {p.image
                          ? <img src={p.image.startsWith('http') ? p.image : `${BASE_URL}${p.image}`} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', opacity: 0.2 }}>&#x1F6CD;</div>}
                        <div style={{ position: 'absolute', top: '8px', right: '8px', background: p.is_available ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.9)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px' }}>
                          {p.is_available ? 'On' : 'Off'}
                        </div>
                      </div>
                      <div style={{ padding: '14px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>{p.category_name || '—'}</div>
                        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>{p.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span style={{ color: 'var(--lime)', fontWeight: 800, fontSize: '18px' }}>${p.price}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{p.stock} left</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-secondary" onClick={() => openModal('product', p)} style={{ flex: 1, padding: '8px', fontSize: '13px' }}>Edit</button>
                          <button className="btn-danger" onClick={() => deleteProduct(p.id)} style={{ flex: 1, padding: '8px', fontSize: '13px' }}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'categories' && (
              <div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                  <input
                    placeholder="New category name"
                    value={catName}
                    onChange={e => setCatName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCategory()}
                    style={{ maxWidth: '320px' }}
                  />
                  <button className="btn-primary" onClick={addCategory} style={{ padding: '12px 24px', whiteSpace: 'nowrap' }}>+ Add Category</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {categories.length === 0
                    ? <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>No categories yet</div>
                    : categories.map(c => (
                      <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{c.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{products.filter(p => p.category === c.id).length} products</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {tab === 'memberships' && (
              <div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginBottom: '16px' }}>
                  <button className="btn-secondary" onClick={() => openModal('plan')} style={{ padding: '12px 20px' }}>+ Add Plan</button>
                  <button className="btn-primary" onClick={() => openModal('membership')} style={{ padding: '12px 20px' }}>+ Assign Membership</button>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Plans</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                    {plans.map(p => (
                      <div key={p.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{p.name}</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--lime)', marginBottom: '8px' }}>${p.price_per_month}<span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 400 }}>/mo</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: p.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: p.is_active ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{p.is_active ? 'Active' : 'Inactive'}</span>
                          <button className="btn-secondary" onClick={() => openModal('plan', p)} style={{ padding: '6px 12px', fontSize: '12px' }}>Edit</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <h3 style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Assigned Memberships</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {memberships.map(m => (
                    <div key={m.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{m.client_name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{m.plan_detail?.name} · {m.months_count} month{m.months_count > 1 ? 's' : ''} · from {m.start_date}</div>
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: `${statusColor[m.status] || '#64748b'}20`, color: statusColor[m.status] || '#64748b' }}>{m.status}</span>
                      <button className="btn-secondary" onClick={() => openModal('membership', m)} style={{ padding: '8px 16px', fontSize: '13px' }}>Edit</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'payments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {payments.map(p => (
                  <div key={p.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{p.client_name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Created: {p.created_at?.slice(0, 10)} {p.paid_at ? `· Paid: ${p.paid_at?.slice(0, 10)}` : ''}</div>
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--lime)' }}>${p.amount}</span>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: `${statusColor[p.status]}20`, color: statusColor[p.status] }}>{p.status}</span>
                    {p.status === 'unpaid' && (
                      <button className="btn-primary" onClick={() => updatePayment(p.id, 'paid')} style={{ padding: '8px 16px', fontSize: '13px' }}>Mark Paid</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === 'orders' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {orders.map(o => (
                  <div key={o.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{o.order_number}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{o.client_name} · {o.created_at?.slice(0, 10)} · {o.items?.length} item{o.items?.length !== 1 ? 's' : ''}</div>
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--lime)' }}>${o.total_price}</span>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: `${statusColor[o.status] || '#64748b'}20`, color: statusColor[o.status] || '#64748b' }}>{o.status}</span>
                    <select
                      value={o.status}
                      onChange={e => updateOrder(o.id, e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '13px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', width: 'auto' }}
                    >
                      {['pending', 'paid', 'ready', 'picked_up', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}