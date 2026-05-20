import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function CartPage() {
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: '' })
  const navigate = useNavigate()

  const fetchCart = () => {
    api.get('/shop/cart/')
      .then(res => setCart(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCart() }, [])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 2500)
  }

  const updateQuantity = async (itemId, quantity) => {
    if (quantity < 1) return
    try {
      await api.patch(`/shop/cart/items/${itemId}/`, { quantity })
      fetchCart()
    } catch {
      showToast('Failed to update', 'error')
    }
  }

  const removeItem = async (itemId) => {
    try {
      await api.delete(`/shop/cart/items/${itemId}/delete/`)
      fetchCart()
      showToast('Item removed')
    } catch {
      showToast('Failed to remove', 'error')
    }
  }

  const clearCart = async () => {
    try {
      await api.delete('/shop/cart/clear/')
      fetchCart()
      showToast('Cart cleared')
    } catch {
      showToast('Failed to clear', 'error')
    }
  }

  const checkout = async () => {
    setCheckingOut(true)
    try {
      const res = await api.post('/shop/checkout/')
      showToast('Order placed successfully!')
      setTimeout(() => navigate(`/orders`), 1500)
    } catch {
      showToast('Checkout failed', 'error')
    } finally {
      setCheckingOut(false)
    }
  }

  const items = cart?.items || []
  const total = cart?.total || 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      {toast.msg && (
        <div style={{
          position: 'fixed', top: '80px', right: '24px', zIndex: 999,
          background: toast.type === 'error' ? '#ef4444' : 'var(--lime)',
          color: toast.type === 'error' ? '#fff' : '#0a0f1e',
          padding: '12px 24px', borderRadius: '10px',
          fontWeight: 700, fontSize: '14px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              Cart
            </h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '15px' }}>
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          <button
            onClick={() => navigate('/shop')}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '10px 20px',
              color: 'var(--text-muted)', fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Continue Shopping
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '80px 0' }}>
            Loading cart...
          </div>
        ) : items.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 0',
            background: 'var(--bg-card)', borderRadius: '16px',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>🛒</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', margin: '0 0 20px' }}>
              Your cart is empty
            </p>
            <button
              onClick={() => navigate('/shop')}
              style={{
                background: 'var(--lime)', color: '#0a0f1e',
                border: 'none', borderRadius: '10px',
                padding: '12px 28px', fontWeight: 700,
                fontSize: '14px', cursor: 'pointer',
              }}
            >
              Go to Shop
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map(item => (
              <div key={item.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '14px', padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: '16px',
              }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '10px',
                  background: 'var(--bg-input)', flexShrink: 0,
                  overflow: 'hidden', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.product_detail?.image ? (
                    <img src={item.product_detail.image.startsWith('http') ? item.product_detail.image : `http://127.0.0.1:8000${item.product_detail.image}`}
                      alt={item.product_detail.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '24px', opacity: 0.3 }}>🛍</span>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '15px' }}>
                    {item.product_detail?.name}
                  </div>
                  <div style={{ color: 'var(--lime)', fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>
                    ${item.product_detail?.price}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: 'var(--bg-input)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontSize: '18px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >−</button>
                  <span style={{
                    minWidth: '32px', textAlign: 'center',
                    fontWeight: 700, color: 'var(--text)', fontSize: '15px',
                  }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: 'var(--bg-input)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontSize: '18px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >+</button>
                </div>

                <div style={{
                  minWidth: '80px', textAlign: 'right',
                  fontWeight: 800, color: 'var(--text)', fontSize: '16px',
                }}>
                  ${(item.product_detail?.price * item.quantity).toFixed(2)}
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  style={{
                    background: 'transparent', border: 'none',
                    color: '#ef4444', cursor: 'pointer',
                    fontSize: '18px', padding: '4px',
                  }}
                >✕</button>
              </div>
            ))}

            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '14px', padding: '20px 24px', marginTop: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Subtotal</span>
                <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: '15px' }}>${Number(total).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text)', fontWeight: 800, fontSize: '20px' }}>Total</span>
                <span style={{ color: 'var(--lime)', fontWeight: 800, fontSize: '24px' }}>${Number(total).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={clearCart}
                style={{
                  flex: 1, background: 'transparent',
                  border: '1px solid var(--border)', borderRadius: '12px',
                  padding: '14px', color: 'var(--text-muted)',
                  fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                }}
              >
                Clear Cart
              </button>
              <button
                onClick={checkout}
                disabled={checkingOut}
                style={{
                  flex: 2, background: 'var(--lime)',
                  border: 'none', borderRadius: '12px',
                  padding: '14px', color: '#0a0f1e',
                  fontWeight: 800, fontSize: '16px',
                  cursor: checkingOut ? 'not-allowed' : 'pointer',
                  opacity: checkingOut ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {checkingOut ? 'Placing Order...' : 'Checkout'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}