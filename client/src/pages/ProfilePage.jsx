import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function ProfilePage() {
  const { user, login } = useAuth()
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone_number: '', age: '', address: '' })
  const [clientForm, setClientForm] = useState({ nickname: '' })
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/profile/').then(res => {
      const d = res.data
      setForm({
        first_name: d.first_name || '',
        last_name: d.last_name || '',
        email: d.email || '',
        phone_number: d.phone_number || '',
        age: d.age || '',
        address: d.address || '',
      })
      if (d.client_profile) {
        setClientForm({ nickname: d.client_profile.nickname || '' })
        if (d.client_profile.photo) setPreview(`http://127.0.0.1:8000${d.client_profile.photo}`)
      }
    })
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await api.patch('/profile/', form)
      if (user?.role === 'client') {
        const data = new FormData()
        data.append('nickname', clientForm.nickname)
        if (photo) data.append('photo', photo)
        await api.patch('/profile/client/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      setSuccess('Profile updated successfully')
    } catch {
      setError('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhoto(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">My Profile</h1>
      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '24px' }}>Personal Information</h3>
          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>First Name</label>
                  <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Last Name</label>
                  <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Phone Number</label>
                <input value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Age</label>
                  <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Address</label>
                  <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
              </div>
              {user?.role === 'client' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Nickname</label>
                  <input value={clientForm.nickname} onChange={e => setClientForm({ ...clientForm, nickname: e.target.value })} />
                </div>
              )}
              {error && <p className="error-msg">{error}</p>}
              {success && <p style={{ color: 'var(--success)', fontSize: '13px' }}>{success}</p>}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '24px' }}>Account Info</h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            {preview ? (
              <img src={preview} alt="avatar" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--lime)' }} />
            ) : (
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(163, 230, 53, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', fontWeight: 700, color: 'var(--lime)', border: '3px solid var(--lime)' }}>
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
            )}
            {user?.role === 'client' && (
              <label style={{ cursor: 'pointer' }}>
                <span className="btn-secondary" style={{ padding: '8px 20px', display: 'inline-block' }}>Change Photo</span>
                <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
              </label>
            )}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Role', value: user?.role },
                { label: 'Phone', value: user?.phone_number },
                { label: 'Email', value: user?.email },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
              <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Status</span>
                <span className="badge badge-lime">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}