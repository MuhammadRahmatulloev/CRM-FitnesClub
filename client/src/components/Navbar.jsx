import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav style={{
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ color: 'var(--lime)', fontWeight: 800, fontSize: '20px', letterSpacing: '1px' }}>
            FITNESS<span style={{ color: 'var(--text)' }}>CRM</span>
          </span>
        </Link>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {[
            { path: '/', label: 'Home' },
            { path: '/trainers', label: 'Trainers' },
            { path: '/training', label: 'My Training' },
            { path: '/membership', label: 'Membership' },
            { path: '/shop', label: 'Shop' },
            { path: '/orders', label: 'Orders' },
          ].map(({ path, label }) => (
            <Link key={path} to={path} style={{
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: isActive(path) ? 'var(--lime)' : 'var(--text-muted)',
              background: isActive(path) ? 'rgba(163, 230, 53, 0.1)' : 'transparent',
              transition: 'all 0.2s',
            }}>
              {label}
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link to="/profile" style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--lime)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0a0f1e',
              fontWeight: 700,
              fontSize: '12px',
            }}>
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <span style={{ fontSize: '14px', color: 'var(--text)' }}>
              {user?.first_name}
            </span>
          </Link>

          <button className="btn-secondary" onClick={handleLogout} style={{ padding: '8px 16px' }}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}