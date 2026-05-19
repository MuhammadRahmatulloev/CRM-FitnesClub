import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function HomePage() {
  const { user } = useAuth()
  const [membership, setMembership] = useState(null)
  const [todayPlan, setTodayPlan] = useState(null)
  const [orders, setOrders] = useState([])

  useEffect(() => {
    api.get('/memberships/').then(res => setMembership(res.data.results?.[0] || null)).catch(() => {})
    api.get('/training/my-plan/today/').then(res => setTodayPlan(res.data)).catch(() => {})
    api.get('/shop/orders/').then(res => setOrders(res.data.results || [])).catch(() => {})
  }, [])

  const statusColor = (status) => {
    if (status === 'active') return 'badge-green'
    if (status === 'expired') return 'badge-red'
    return 'badge-gray'
  }

  return (
    <div className="page">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700 }}>
          Welcome back, <span style={{ color: 'var(--lime)' }}>{user?.first_name}</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ borderLeft: '3px solid var(--lime)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Membership</p>
          {membership ? (
            <>
              <p style={{ fontWeight: 700, fontSize: '18px' }}>{membership.plan_detail?.name}</p>
              <span className={`badge ${statusColor(membership.status)}`} style={{ marginTop: '8px' }}>
                {membership.status}
              </span>
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No active membership</p>
          )}
        </div>

        <div className="card" style={{ borderLeft: '3px solid var(--lime)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Today's Training</p>
          {todayPlan && !todayPlan.detail ? (
            <>
              <p style={{ fontWeight: 700, fontSize: '18px' }}>{todayPlan.day_name}</p>
              {todayPlan.is_rest ? (
                <span className="badge badge-gray" style={{ marginTop: '8px' }}>Rest Day</span>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                  {todayPlan.exercises?.length} exercises
                </p>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No training today</p>
          )}
        </div>

        <div className="card" style={{ borderLeft: '3px solid var(--lime)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Total Orders</p>
          <p style={{ fontWeight: 700, fontSize: '32px', color: 'var(--lime)' }}>{orders.length}</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { to: '/training', label: 'View Training Plan' },
              { to: '/shop', label: 'Browse Shop' },
              { to: '/membership', label: 'My Membership' },
              { to: '/trainers', label: 'Our Trainers' },
            ].map(({ to, label }) => (
              <Link key={to} to={to} style={{
                textDecoration: 'none',
                padding: '12px 16px',
                background: 'var(--bg-input)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'border-color 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--lime)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {label}
                <span style={{ color: 'var(--lime)' }}>→</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>Today's Exercises</h3>
          {todayPlan && !todayPlan.detail && !todayPlan.is_rest && todayPlan.exercises?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {todayPlan.exercises.map((ex) => (
                <div key={ex.id} style={{
                  padding: '12px 16px',
                  background: 'var(--bg-input)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}>
                  <p style={{ fontWeight: 600, fontSize: '14px' }}>{ex.name}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                    {ex.sets && ex.reps ? `${ex.sets} sets × ${ex.reps} reps` : ex.duration}
                    {ex.rest_time && ` · Rest: ${ex.rest_time}`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>
              {todayPlan?.is_rest ? 'Rest day — recover well!' : 'No exercises scheduled'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}