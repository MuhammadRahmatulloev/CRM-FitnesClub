import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function TrainersPage() {
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/trainers/').then(res => {
      setTrainers(res.data.results || res.data)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = trainers.filter(t =>
    `${t.first_name} ${t.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    t.trainer_profile?.specialization?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
      <p style={{ color: 'var(--lime)' }}>Loading...</p>
    </div>
  )

  return (
    <div className="page">
      <h1 className="page-title">Our Trainers</h1>

      <div style={{ marginBottom: '24px', maxWidth: '400px' }}>
        <input
          type="text"
          placeholder="Search by name or specialization..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No trainers found</p>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(trainer => (
            <div
              key={trainer.id}
              className="card"
              onClick={() => navigate(`/trainers/${trainer.id}`)}
              style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--lime)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                {trainer.trainer_profile?.photo ? (
                  <img
                    src={`http://127.0.0.1:8000${trainer.trainer_profile.photo}`}
                    alt={trainer.first_name}
                    style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'rgba(163, 230, 53, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'var(--lime)',
                  }}>
                    {trainer.first_name?.[0]}{trainer.last_name?.[0]}
                  </div>
                )}
                <div>
                  <p style={{ fontWeight: 700, fontSize: '16px' }}>
                    {trainer.first_name} {trainer.last_name}
                  </p>
                  <span className="badge badge-lime" style={{ marginTop: '4px' }}>Trainer</span>
                </div>
              </div>

              {trainer.trainer_profile?.specialization && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {trainer.trainer_profile.specialization}
                </p>
              )}

              {trainer.trainer_profile?.experience_years > 0 && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {trainer.trainer_profile.experience_years} years experience
                </p>
              )}

              {trainer.trainer_profile?.bio && (
                <p style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  marginTop: '12px',
                  lineHeight: '1.5',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {trainer.trainer_profile.bio}
                </p>
              )}

              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)',
                color: 'var(--lime)',
                fontSize: '13px',
                fontWeight: 600,
              }}>
                View Profile →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 