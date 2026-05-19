import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    badge: 'badge-gray',  dot: '#64748b' },
  processing: { label: 'Processing', badge: 'badge-lime',  dot: '#a3e635' },
  shipped:    { label: 'Shipped',    badge: 'badge-green', dot: '#22c55e' },
  picked_up:  { label: 'Picked Up', badge: 'badge-green', dot: '#22c55e' },
  cancelled:  { label: 'Cancelled', badge: 'badge-red',   dot: '#ef4444' },
}

const ALL_STATUSES = ['pending', 'processing', 'shipped', 'picked_up', 'cancelled']

export default function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [receiptLoading, setReceiptLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: '' })

  const isAdmin = user?.role === 'admin'

  const fetchOrders = () => {
    setLoading(true)
    api.get('/shop/orders/')
      .then(res => setOrders(res.data.results || res.data))
      .catch(() => showToast('Failed to load orders', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchOrders() }, [])

  useEffect(() => {
    if (!selectedOrder) { setReceipt(null); return }
    if (selectedOrder.status === 'picked_up') {
      setReceiptLoading(true)
      api.get(`/shop/orders/${selectedOrder.id}/receipt/`)
        .then(res => setReceipt(res.data))
        .catch(() => setReceipt(null))
        .finally(() => setReceiptLoading(false))
    } else {
      setReceipt(null)
    }
  }, [selectedOrder])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 2500)
  }

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingStatus(true)
    try {
      const res = await api.patch(`/shop/orders/${orderId}/status/`, { status: newStatus })
      showToast('Status updated')
      fetchOrders()
      setSelectedOrder(prev => prev?.id === orderId ? { ...prev, status: newStatus } : prev)
    } catch {
      showToast('Failed to update status', 'error')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter)

  const cfg = (status) => STATUS_CONFIG[status] || { label: status, badge: 'badge-gray', dot: '#64748b' }

  return (
    <div className="page">
      {/* Toast */}
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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>Orders</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
            {statusFilter !== 'all' ? ` · ${cfg(statusFilter).label}` : ''}
          </p>
        </div>

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', ...ALL_STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '7px 16px',
                borderRadius: '20px',
                border: '1px solid',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                borderColor: statusFilter === s ? 'var(--lime)' : 'var(--border)',
                background: statusFilter === s ? 'rgba(163,230,53,0.1)' : 'var(--bg-input)',
                color: statusFilter === s ? 'var(--lime)' : 'var(--text-muted)',
              }}
            >
              {s === 'all' ? 'All' : cfg(s).label}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout: list + detail */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 420px' : '1fr', gap: '20px', alignItems: 'start' }}>

        {/* Orders list */}
        <div>
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              Loading orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '80px 40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📦</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>No orders found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredOrders.map(order => {
                const c = cfg(order.status)
                const isSelected = selectedOrder?.id === order.id
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(isSelected ? null : order)}
                    style={{
                      background: 'var(--bg-card)',
                      border: `1px solid ${isSelected ? 'var(--lime)' : 'var(--border)'}`,
                      borderRadius: '14px',
                      padding: '18px 22px',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                      boxShadow: isSelected ? '0 0 0 1px var(--lime)' : 'none',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#2d4060' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      {/* Left: order info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '42px', height: '42px', borderRadius: '10px',
                          background: 'var(--bg-input)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '18px',
                        }}>
                          📦
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)', letterSpacing: '0.3px' }}>
                            #{order.order_number}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
                            {isAdmin && order.client_name && (
                              <span style={{ marginRight: '10px' }}>👤 {order.client_name}</span>
                            )}
                            {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                            {' · '}
                            {new Date(order.created_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right: price + status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--lime)' }}>
                          ${Number(order.total_price).toFixed(2)}
                        </span>
                        <span className={`badge ${c.badge}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.dot, display: 'inline-block' }} />
                          {c.label}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Order detail panel */}
        {selectedOrder && (
          <div style={{ position: 'sticky', top: '80px' }}>
            <div className="card" style={{ padding: '24px' }}>
              {/* Panel header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontWeight: 700, fontSize: '16px' }}>Order Details</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: '8px', width: '32px', height: '32px',
                    color: 'var(--text-muted)', fontSize: '16px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >✕</button>
              </div>

              {/* Order number + status */}
              <div style={{ padding: '14px 16px', background: 'var(--bg-input)', borderRadius: '10px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Order Number</div>
                <div style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '0.5px' }}>
                  #{selectedOrder.order_number}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div style={{ padding: '12px 14px', background: 'var(--bg-input)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Date</div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>
                    {new Date(selectedOrder.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </div>
                </div>
                <div style={{ padding: '12px 14px', background: 'var(--bg-input)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Status</div>
                  <span className={`badge ${cfg(selectedOrder.status).badge}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg(selectedOrder.status).dot, display: 'inline-block' }} />
                    {cfg(selectedOrder.status).label}
                  </span>
                </div>
              </div>

              {isAdmin && selectedOrder.client_name && (
                <div style={{ padding: '12px 14px', background: 'var(--bg-input)', borderRadius: '10px', marginBottom: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Client: </span>
                  <span style={{ fontWeight: 600 }}>{selectedOrder.client_name}</span>
                </div>
              )}

              {/* Items */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Items
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedOrder.items?.map(item => (
                    <div key={item.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', background: 'var(--bg-input)',
                      borderRadius: '8px', gap: '10px',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{item.product_name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
                          {item.quantity} × ${Number(item.price).toFixed(2)}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                        ${(item.quantity * item.price).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', borderRadius: '10px',
                background: 'rgba(163, 230, 53, 0.08)',
                border: '1px solid rgba(163, 230, 53, 0.2)',
                marginBottom: '16px',
              }}>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: '20px', color: 'var(--lime)' }}>
                  ${Number(selectedOrder.total_price).toFixed(2)}
                </span>
              </div>

              {/* QR Code */}
              {selectedOrder.qr_code && (
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    QR Code
                  </div>
                  <div style={{
                    display: 'inline-block', padding: '12px',
                    background: '#fff', borderRadius: '10px',
                  }}>
                    <img
                      src={`http://127.0.0.1:8000${selectedOrder.qr_code}`}
                      alt="QR Code"
                      style={{ width: '120px', height: '120px', display: 'block' }}
                    />
                  </div>
                </div>
              )}

              {/* Receipt (if picked_up) */}
              {selectedOrder.status === 'picked_up' && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Receipt
                  </div>
                  {receiptLoading ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0' }}>Loading receipt...</div>
                  ) : receipt ? (
                    <div style={{
                      padding: '14px 16px', background: 'var(--bg-input)',
                      borderRadius: '10px', border: '1px solid var(--border)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Receipt #</span>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{receipt.id}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Issued by</span>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{receipt.issued_by_name}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Issued at</span>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>
                          {new Date(receipt.issued_at).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No receipt available</div>
                  )}
                </div>
              )}

              {/* Admin: status update */}
              {isAdmin && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Update Status
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {ALL_STATUSES.map(s => (
                      <button
                        key={s}
                        disabled={selectedOrder.status === s || updatingStatus}
                        onClick={() => handleStatusUpdate(selectedOrder.id, s)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: selectedOrder.status === s ? 'default' : 'pointer',
                          transition: 'all 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          borderColor: selectedOrder.status === s ? 'var(--lime)' : 'var(--border)',
                          background: selectedOrder.status === s ? 'rgba(163,230,53,0.1)' : 'var(--bg-input)',
                          color: selectedOrder.status === s ? 'var(--lime)' : 'var(--text-muted)',
                          opacity: updatingStatus && selectedOrder.status !== s ? 0.5 : 1,
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg(s).dot, flexShrink: 0 }} />
                        {cfg(s).label}
                        {selectedOrder.status === s && (
                          <span style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.7 }}>current</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}