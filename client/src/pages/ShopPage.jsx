import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function ShopPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(null)
  const [toast, setToast] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([api.get('/shop/products/'), api.get('/shop/categories/')])
      .then(([p, c]) => {
        setProducts(p.data.results || p.data)
        setCategories(c.data.results || c.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = products.filter(p => {
    const matchCat = selectedCategory ? p.category === Number(selectedCategory) : true
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const addToCart = async (productId) => {
    setAdding(productId)
    try {
      await api.post('/shop/cart/add/', { product: productId, quantity: 1 })
      showToast('Added to cart')
    } catch {
      showToast('Failed to add')
    } finally {
      setAdding(null)
    }
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '24px', zIndex: 999,
          background: 'var(--lime)', color: '#0a0f1e',
          padding: '12px 24px', borderRadius: '10px',
          fontWeight: 700, fontSize: '14px',
          boxShadow: '0 4px 24px rgba(163,230,53,0.3)',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Shop
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '15px' }}>
            Supplements, gear and accessories
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            style={{
              flex: 1, minWidth: '200px',
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '10px 16px',
              color: 'var(--text)', fontSize: '14px', outline: 'none',
            }}
          />
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '10px 16px',
              color: 'var(--text)', fontSize: '14px', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value=''>All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => navigate('/cart')}
            style={{
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '10px 20px',
              color: 'var(--lime)', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            View Cart
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '80px 0' }}>
            Loading products...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '80px 0' }}>
            No products found.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '20px',
          }}>
            {filtered.map(product => (
              <div key={product.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                overflow: 'hidden',
                transition: 'transform 0.2s, border-color 0.2s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.borderColor = 'var(--lime)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                <div style={{
                  height: '180px', background: 'var(--bg-input)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {product.image ? (
                    <img src={product.image.startsWith('http') ? product.image : `http://127.0.0.1:8000${product.image}`} alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '48px', opacity: 0.3 }}>🛍</span>
                  )}
                </div>

                <div style={{ padding: '16px' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 600,
                      color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '1px',
                    }}>
                      {product.category_name || 'General'}
                    </span>
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                    {product.name}
                  </h3>
                  <p style={{
                    margin: '0 0 14px', fontSize: '13px',
                    color: 'var(--text-muted)', lineHeight: '1.5',
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {product.description || 'No description'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--lime)' }}>
                        ${product.price}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {product.stock} in stock
                      </div>
                    </div>
                    <button
                      onClick={() => addToCart(product.id)}
                      disabled={adding === product.id || product.stock === 0}
                      style={{
                        background: product.stock === 0 ? 'var(--bg-input)' : 'var(--lime)',
                        color: product.stock === 0 ? 'var(--text-muted)' : '#0a0f1e',
                        border: 'none', borderRadius: '10px',
                        padding: '10px 18px', fontWeight: 700,
                        fontSize: '13px', cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
                        transition: 'opacity 0.2s',
                        opacity: adding === product.id ? 0.6 : 1,
                      }}
                    >
                      {product.stock === 0 ? 'Out of stock' : adding === product.id ? '...' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}