import { useState, useEffect } from 'react'
import api from '../api/axios'

export default function TrainingPlanPage() {
  const [plans, setPlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/training/my-plan/').then(res => {
      const data = res.data.results || res.data
      setPlans(data)
      if (data.length > 0) setSelectedPlan(data[0])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedPlan) setSelectedDay(null)
  }, [selectedPlan])

  const getDays = (plan) => {
    if (!plan) return []
    if (plan.plan_type === 'monthly') {
      return plan.weeks?.flatMap(w => w.days) || []
    }
    return plan.days || []
  }

  const todayNumber = new Date().getDay() || 7

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
      <p style={{ color: 'var(--lime)' }}>Loading...</p>
    </div>
  )

  if (plans.length === 0) return (
    <div className="page">
      <h1 className="page-title">My Training Plan</h1>
      <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: 'var(--text-muted)' }}>No training plan assigned yet.</p>
      </div>
    </div>
  )

  const days = getDays(selectedPlan)

  return (
    <div className="page">
      <h1 className="page-title">My Training Plan</h1>

      {plans.length > 1 && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {plans.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className={selectedPlan?.id === plan.id ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 20px' }}
            >
              {plan.title}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginBottom: '24px' }} className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontWeight: 700, fontSize: '20px' }}>{selectedPlan?.title}</h2>
          <span className={`badge ${selectedPlan?.plan_type === 'monthly' ? 'badge-lime' : selectedPlan?.plan_type === 'weekly' ? 'badge-green' : 'badge-gray'}`}>
            {selectedPlan?.plan_type}
          </span>
        </div>
        {selectedPlan?.description && (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{selectedPlan.description}</p>
        )}
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>
          Trainer: <span style={{ color: 'var(--text)' }}>{selectedPlan?.trainer_name}</span>
        </p>
      </div>

      {selectedPlan?.plan_type === 'monthly' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {selectedPlan.weeks?.map(week => (
            <div key={week.id} className="card">
              <h3 style={{ fontWeight: 700, marginBottom: '16px', color: 'var(--lime)' }}>Week {week.week_number}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {week.days?.map(day => (
                  <div
                    key={day.id}
                    onClick={() => setSelectedDay(selectedDay?.id === day.id ? null : day)}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '10px',
                      background: day.is_rest ? 'var(--bg-input)' : selectedDay?.id === day.id ? 'rgba(163, 230, 53, 0.2)' : 'var(--bg-input)',
                      border: `1px solid ${selectedDay?.id === day.id ? 'var(--lime)' : 'var(--border)'}`,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Day {day.day_number}</p>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: day.is_rest ? 'var(--text-muted)' : 'var(--text)' }}>
                      {day.is_rest ? 'Rest' : day.day_name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {days.map(day => (
              <div
                key={day.id}
                onClick={() => setSelectedDay(selectedDay?.id === day.id ? null : day)}
                style={{
                  padding: '16px 8px',
                  borderRadius: '10px',
                  background: 'var(--bg-input)',
                  border: `1px solid ${selectedDay?.id === day.id ? 'var(--lime)' : day.day_number === todayNumber ? 'rgba(163,230,53,0.4)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  opacity: day.is_rest ? 0.5 : 1,
                }}
              >
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Day {day.day_number}</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: selectedDay?.id === day.id ? 'var(--lime)' : 'var(--text)' }}>
                  {day.day_name}
                </p>
                {day.is_rest ? (
                  <span className="badge badge-gray" style={{ marginTop: '6px', fontSize: '10px' }}>Rest</span>
                ) : (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>{day.exercises?.length} ex</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDay && !selectedDay.is_rest && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '20px' }}>
            {selectedDay.day_name} — <span style={{ color: 'var(--lime)' }}>{selectedDay.exercises?.length} Exercises</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selectedDay.exercises?.map((ex, i) => (
              <div key={ex.id} style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(163,230,53,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--lime)', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>{ex.name}</p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {ex.sets && ex.reps && (
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Sets: <span style={{ color: 'var(--lime)', fontWeight: 600 }}>{ex.sets}</span> × Reps: <span style={{ color: 'var(--lime)', fontWeight: 600 }}>{ex.reps}</span>
                      </span>
                    )}
                    {ex.duration && (
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Duration: <span style={{ color: 'var(--lime)', fontWeight: 600 }}>{ex.duration}</span>
                      </span>
                    )}
                    {ex.rest_time && (
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Rest: <span style={{ fontWeight: 600 }}>{ex.rest_time}</span>
                      </span>
                    )}
                  </div>
                  {ex.description && (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.5' }}>{ex.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDay?.is_rest && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>😴</p>
          <p style={{ fontWeight: 700, fontSize: '18px' }}>Rest Day</p>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Take it easy and recover well.</p>
        </div>
      )}
    </div>
  )
}