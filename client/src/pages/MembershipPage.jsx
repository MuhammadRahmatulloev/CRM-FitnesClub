import { useState, useEffect } from 'react'
import api from '../api/axios'

export default function MembershipPage() {
  const [membership, setMembership] = useState(null)
  const [payments, setPayments] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/memberships/'),
      api.get('/payments/'),
      api.get('/memberships/plans/'),
    ]).then(([mRes, pRes, plRes]) => {
      const memberships = mRes.data.results || mRes.data
      setMembership(memberships[0] || null)
      setPayments(pRes.data.results || pRes.data)
      setPlans(plRes.data.results || plRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const statusColor = (status) => {
    if (status === 'active') return 'badge-green'
    if (status === 'expired') return 'badge-red'
    if (status === 'frozen') return 'badge-gray'
    return 'badge-gray'
  }

  const paymentStatusColor = (status) => status === 'paid' ? 'badge-green' : 'badge-red'

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

  const getEndDate = (membership) => {
    if (!membership) return '—'
    const start = new Date(membership.start_date)
    start.setMonth(start.getMonth() + membership.months_count)
    return formatDate(start)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
      <p style={{ color: 'var(--lime)' }}>Loading...</p>
    </div>
  )

  return (
    <div className="page">
      <h1 className="page-title">Membership</h1>

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '20px' }}>Current Membership</h3>
          {membership ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '20px', background: 'rgba(163,230,53,0.08)', borderRadius: '10px', border: '1px solid rgba(163,230,53,0.2)', marginBottom: '8px' }}>
                <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--lime)' }}>{membership.plan_detail?.name}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>{membership.plan_detail?.description}</p>
              </div>
              {[
                { label: 'Status', value: <span className={`badge ${statusColor(membership.status)}`}>{membership.status}</span> },
                { label: 'Price / month', value: `${membership.plan_detail?.price_per_month} TJS` },
                { label: 'Duration', value: `${membership.months_count} month${membership.months_count > 1 ? 's' : ''}` },
                { label: 'Start Date', value: formatDate(membership.start_date) },
                { label: 'End Date', value: getEndDate(membership) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>No active membership</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Contact admin to get a membership plan</p>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '20px' }}>Available Plans</h3>
          {plans.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No plans available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {plans.filter(p => p.is_active).map(plan => (
                <div
                  key={plan.id}
                  style={{
                    padding: '16px',
                    background: membership?.plan_detail?.id === plan.id ? 'rgba(163,230,53,0.08)' : 'var(--bg-input)',
                    borderRadius: '10px',
                    border: `1px solid ${membership?.plan_detail?.id === plan.id ? 'rgba(163,230,53,0.4)' : 'var(--border)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <p style={{ fontWeight: 700, fontSize: '15px' }}>{plan.name}</p>
                    <p style={{ color: 'var(--lime)', fontWeight: 700 }}>{plan.price_per_month} TJS/mo</p>
                  </div>
                  {plan.description && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{plan.description}</p>
                  )}
                  {membership?.plan_detail?.id === plan.id && (
                    <span className="badge badge-lime" style={{ marginTop: '8px' }}>Current Plan</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontWeight: 700, marginBottom: '20px' }}>Payment History</h3>
        {payments.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No payments yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', padding: '10px 16px' }}>
              {['Date', 'Amount', 'Status', 'Paid At'].map(h => (
                <p key={h} style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</p>
              ))}
            </div>
            {payments.map(payment => (
              <div key={payment.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', padding: '14px 16px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)', alignItems: 'center' }}>
                <p style={{ fontSize: '14px' }}>{formatDate(payment.created_at)}</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--lime)' }}>{payment.amount} TJS</p>
                <span className={`badge ${paymentStatusColor(payment.status)}`}>{payment.status}</span>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{payment.paid_at ? formatDate(payment.paid_at) : '—'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}