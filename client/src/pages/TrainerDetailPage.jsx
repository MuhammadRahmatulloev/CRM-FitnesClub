import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function TrainerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trainer, setTrainer] = useState(null)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/trainers/${id}/`),
      api.get(`/trainers/${id}/plans/`)
    ]).then(([trainerRes, plansRes]) => {
      setTrainer(trainerRes.data)
      setPlans(plansRes.data.results || plansRes.data)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
      <p style={{ color: 'var(--lime)' }}>Loading...</p>
    </div>
  )

  if (!trainer) return (
    <div className="page">
      <p style={{ color: 'var(--text-muted)' }}>Trainer not found.</p>
    </div>
  )

  const profile = trainer.trainer_profile

  return (
    <div className="page">
      <button className="btn-secondary" onClick={() => navigate('/trainers')} style={{ marginBottom: '24px', padding: '8px 20px' }}>
        ← Back
      </button>

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
            {profile?.photo ? (
              <img src={`http://127.0.0.1:8000${profile.photo}`} alt={trainer.first_name} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--lime)' }} />
            ) : (
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(163, 230, 53, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 700, color: 'var(--lime)', border: '3px solid var(--lime)' }}>
                {trainer.first_name?.[0]}{trainer.last_name?.[0]}
              </div>
            )}
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 700 }}>{trainer.first_name} {trainer.last_name}</h2>
              <span className="badge badge-lime" style={{ marginTop: '8px' }}>Trainer</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {profile?.specialization && (
              <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Specialization</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{profile.specialization}</span>
              </div>
            )}
            {profile?.experience_years > 0 && (
              <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Experience</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{profile.experience_years} years</span>
              </div>
            )}
            <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Training Plans</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--lime)' }}>{plans.length}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>About</h3>
          {profile?.bio ? (
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', fontSize: '14px' }}>{profile.bio}</p>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No bio available.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontWeight: 700, marginBottom: '20px' }}>Training Plans</h3>
        {plans.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No training plans yet.</p>
        ) : (
          <div className="grid-3">
            {plans.map(plan => (
              <div key={plan.id} style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <p style={{ fontWeight: 600, fontSize: '15px' }}>{plan.title}</p>
                  <span className={`badge ${plan.plan_type === 'monthly' ? 'badge-lime' : plan.plan_type === 'weekly' ? 'badge-green' : 'badge-gray'}`}>
                    {plan.plan_type}
                  </span>
                </div>
                {plan.description && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {plan.description}
                  </p>
                )}
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '10px' }}>
                  {plan.plan_type === 'monthly'
                    ? `${plan.weeks?.length || 0} weeks`
                    : `${plan.days?.length || 0} days`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}