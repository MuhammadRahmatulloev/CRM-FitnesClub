import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import VideoCall from './VideoCall'

const WS_BASE  = 'ws://127.0.0.1:8000'
const API_BASE = 'http://127.0.0.1:8000'

/* ── SVG icons ─────────────────────────────────────────────────────────────── */
const IconMic      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
const IconCamera   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7 16 12l7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
const IconClip     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
const IconSend     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const IconDownload = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconEdit     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IconTrash    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>

/* ── helpers ── */
const fmtTime = iso => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
const fmtDate = iso => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const fmtSecs = s   => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const ROLE_COLOR = { admin: '#a3e635', trainer: '#38bdf8', client: '#a78bfa' }
const roleColor  = u => ROLE_COLOR[u?.role] || '#a3e635'
const initials   = u => `${(u?.first_name || '')[0] || ''}${(u?.last_name || '')[0] || ''}`

const buildFileUrl = msg => {
  const raw = msg.file_url || msg.file
  if (!raw) return null
  if (raw.startsWith('http')) return raw
  if (raw.startsWith('/'))    return `${API_BASE}${raw}`
  return `${API_BASE}/media/${raw}`
}

const bestAudioMime = () => {
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'])
    if (MediaRecorder.isTypeSupported(t)) return t
  return ''
}
const bestVideoMime = () => {
  for (const t of ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'])
    if (MediaRecorder.isTypeSupported(t)) return t
  return ''
}

/* ══════════════════════════════════════════════════════════════════════════════
   ChatPage
══════════════════════════════════════════════════════════════════════════════ */
export default function ChatPage() {
  const { user } = useAuth()

  /* ── state ── */
  const [users,        setUsers]        = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages,     setMessages]     = useState([])
  const [input,        setInput]        = useState('')
  const [connected,    setConnected]    = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [callOpen,     setCallOpen]     = useState(false)
  const [incomingCall, setIncomingCall] = useState(null)
  const [recVoice,     setRecVoice]     = useState(false)
  const [voiceSec,     setVoiceSec]     = useState(0)
  const [recVideo,     setRecVideo]     = useState(false)
  const [videoSec,     setVideoSec]     = useState(0)
  const [uploading,    setUploading]    = useState(false)

  /* ── edit / delete state ── */
  const [hoveredMsgId,  setHoveredMsgId]  = useState(null)
  const [menuMsgId,     setMenuMsgId]     = useState(null)
  const [editingMsgId,  setEditingMsgId]  = useState(null)
  const [editText,      setEditText]      = useState('')

  /* ── refs ── */
  const wsRef       = useRef(null)
  const bottomRef   = useRef(null)
  const fileRef     = useRef(null)
  const videoPreRef = useRef(null)
  const isVoiceRef  = useRef(false)
  const isVideoRef  = useRef(false)
  const voiceRecRef = useRef(null)
  const voiceTimer  = useRef(null)
  const voiceChunks = useRef([])
  const videoRecRef = useRef(null)
  const videoTimer  = useRef(null)
  const videoChunks = useRef([])

  /* ── load contacts ── */
  useEffect(() => {
    api.get('/chat/users/')
      .then(r => setUsers(r.data.results || r.data))
      .catch(() => {})
  }, [])

  /* ── WS + history ── */
  useEffect(() => {
    if (!selectedUser) return
    setLoading(true)
    setMessages([])
    setIncomingCall(null)
    setCallOpen(false)
    setMenuMsgId(null)
    setEditingMsgId(null)

    api.get(`/chat/messages/${selectedUser.id}/`)
      .then(r => { const d = r.data; setMessages(Array.isArray(d) ? d : (d.results || [])) })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false))

    const token = localStorage.getItem('access')
    if (wsRef.current) wsRef.current.close()

    const ws = new WebSocket(`${WS_BASE}/ws/chat/${selectedUser.id}/?token=${token}`)
    wsRef.current = ws

    ws.onopen  = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)

    ws.onmessage = e => {
      try {
        const d = JSON.parse(e.data)
        if (d.error) return

        /* удаление у собеседника */
        if (d.action === 'message_deleted') {
          setMessages(prev => prev.filter(m => m.id !== d.id))
          return
        }

        /* редактирование у собеседника */
        if (d.action === 'message_edited') {
          setMessages(prev => prev.map(m =>
            m.id === d.id ? { ...m, content: d.content, is_edited: true } : m
          ))
          return
        }

        if (d.file_type === 'call_request' && d.sender_id !== user.id) {
          setIncomingCall({ from_name: d.sender_name })
          return
        }
        if (d.file_type === 'call_ended_notify') {
          setIncomingCall(null)
          if (d.sender_id !== user.id) setCallOpen(false)
          return
        }

        setMessages(prev => [...prev, d])
      } catch {}
    }

    return () => { ws.close(); setConnected(false) }
  }, [selectedUser]) // eslint-disable-line

  /* ── auto-scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ── close menu on outside click ── */
  useEffect(() => {
    const handler = () => setMenuMsgId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  /* ────────────────────────────────────────────────────────────────────────────
     Send text
  ──────────────────────────────────────────────────────────────────────────── */
  const sendMsg = useCallback(() => {
    const ws = wsRef.current
    if (!input.trim() || !ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ message: input.trim(), file_type: 'text' }))
    setInput('')
  }, [input])

  const onKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() }
  }

  /* ────────────────────────────────────────────────────────────────────────────
     Delete message
  ──────────────────────────────────────────────────────────────────────────── */
  const deleteMsg = async (id) => {
    setMenuMsgId(null)
    try {
      await api.delete(`/chat/messages/${id}/edit/`)
      setMessages(prev => prev.filter(m => m.id !== id))
      wsRef.current?.send(JSON.stringify({ action: 'message_delete', id }))
    } catch {
      alert('Не удалось удалить сообщение')
    }
  }

  /* ────────────────────────────────────────────────────────────────────────────
     Edit message
  ──────────────────────────────────────────────────────────────────────────── */
  const startEdit = (msg) => {
    setMenuMsgId(null)
    setEditingMsgId(msg.id)
    setEditText(msg.content || '')
  }

  const cancelEdit = () => {
    setEditingMsgId(null)
    setEditText('')
  }

  const saveEdit = async (id) => {
    const trimmed = editText.trim()
    if (!trimmed) return
    try {
      await api.patch(`/chat/messages/${id}/edit/`, { content: trimmed })
      setMessages(prev => prev.map(m =>
        m.id === id ? { ...m, content: trimmed, is_edited: true } : m
      ))
      wsRef.current?.send(JSON.stringify({ action: 'message_edit', id, content: trimmed }))
      cancelEdit()
    } catch {
      alert('Не удалось изменить сообщение')
    }
  }

  /* ────────────────────────────────────────────────────────────────────────────
     Upload helper
  ──────────────────────────────────────────────────────────────────────────── */
  const upload = async (blob, name) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', blob, name)
      const r = await api.post('/chat/upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      return r.data
    } catch { return null }
    finally { setUploading(false) }
  }

  const sendFile = useCallback(fd => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ file_url: fd.file_url, file_type: fd.file_type, file_name: fd.file_name, content: '' }))
  }, [])

  /* ────────────────────────────────────────────────────────────────────────────
     Voice recording
  ──────────────────────────────────────────────────────────────────────────── */
  const startVoice = async () => {
    if (isVoiceRef.current || uploading) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      voiceChunks.current = []
      const mime = bestAudioMime()
      const rec  = new MediaRecorder(stream, mime ? { mimeType: mime } : {})
      voiceRecRef.current = rec
      rec.ondataavailable = e => { if (e.data.size > 0) voiceChunks.current.push(e.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(voiceChunks.current, { type: mime || 'audio/webm' })
        const fd   = await upload(blob, `voice_${Date.now()}.webm`)
        if (fd) sendFile({ ...fd, file_type: 'audio' })
      }
      rec.start()
      isVoiceRef.current = true
      setRecVoice(true)
      setVoiceSec(0)
      voiceTimer.current = setInterval(() => setVoiceSec(s => s + 1), 1000)
    } catch { alert('Microphone access denied') }
  }

  const stopVoice = () => {
    if (!isVoiceRef.current) return
    isVoiceRef.current = false
    voiceRecRef.current?.stop()
    clearInterval(voiceTimer.current)
    setRecVoice(false)
    setVoiceSec(0)
  }

  /* ────────────────────────────────────────────────────────────────────────────
     Video recording
  ──────────────────────────────────────────────────────────────────────────── */
  const startVideo = async () => {
    if (isVideoRef.current || uploading) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      videoChunks.current = []
      if (videoPreRef.current) videoPreRef.current.srcObject = stream
      const mime = bestVideoMime()
      const rec  = new MediaRecorder(stream, mime ? { mimeType: mime } : {})
      videoRecRef.current = rec
      rec.ondataavailable = e => { if (e.data.size > 0) videoChunks.current.push(e.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (videoPreRef.current) videoPreRef.current.srcObject = null
        const blob = new Blob(videoChunks.current, { type: mime || 'video/webm' })
        const fd   = await upload(blob, `video_${Date.now()}.webm`)
        if (fd) sendFile({ ...fd, file_type: 'video' })
      }
      rec.start()
      isVideoRef.current = true
      setRecVideo(true)
      setVideoSec(0)
      videoTimer.current = setInterval(() => setVideoSec(s => s + 1), 1000)
    } catch { alert('Camera access denied') }
  }

  const stopVideo = () => {
    if (!isVideoRef.current) return
    isVideoRef.current = false
    videoRecRef.current?.stop()
    clearInterval(videoTimer.current)
    setRecVideo(false)
    setVideoSec(0)
  }

  /* ── File picker ── */
  const onFileChange = async e => {
    const f = e.target.files[0]
    if (!f) return
    e.target.value = ''
    const fd = await upload(f, f.name)
    if (fd) sendFile(fd)
  }

  /* ── Call controls ── */
  const startCall = () => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ message: '', file_type: 'call_request' }))
    setCallOpen(true)
  }
  const answerCall  = () => { setIncomingCall(null); setCallOpen(true) }
  const declineCall = () => { setIncomingCall(null); wsRef.current?.send(JSON.stringify({ message: '', file_type: 'call_ended_notify' })) }
  const endCall     = () => { setCallOpen(false);    wsRef.current?.send(JSON.stringify({ message: '', file_type: 'call_ended_notify' })) }

  /* ────────────────────────────────────────────────────────────────────────────
     Render message content
  ──────────────────────────────────────────────────────────────────────────── */
  const renderContent = (msg, isMine) => {
    const url = buildFileUrl(msg)

    /* режим редактирования */
    if (editingMsgId === msg.id) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }}>
          <textarea
            autoFocus
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg.id) }
              if (e.key === 'Escape') cancelEdit()
            }}
            style={{
              resize: 'none', padding: '6px 10px', borderRadius: 8,
              background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              color: isMine ? '#0a0f1e' : 'var(--text)', fontSize: 14, lineHeight: 1.5,
              outline: 'none', minHeight: 60,
            }}
          />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button
              onClick={cancelEdit}
              style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.2)',
                background: 'rgba(0,0,0,0.15)', color: isMine ? '#0a0f1e' : 'var(--text)',
                fontSize: 12, cursor: 'pointer', fontWeight: 600,
              }}
            >Отмена</button>
            <button
              onClick={() => saveEdit(msg.id)}
              style={{
                padding: '4px 10px', borderRadius: 6, border: 'none',
                background: isMine ? 'rgba(0,0,0,0.25)' : 'var(--lime)',
                color: isMine ? '#0a0f1e' : '#0a0f1e',
                fontSize: 12, cursor: 'pointer', fontWeight: 700,
              }}
            >Сохранить</button>
          </div>
        </div>
      )
    }

    if (msg.file_type === 'audio' && url)
      return (
        <div style={{ minWidth: 240, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
            background: isMine ? 'rgba(0,0,0,0.15)' : 'var(--bg-input)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🎙</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, marginBottom: 4 }}>Voice message</div>
            <audio controls src={url} style={{ width: '100%', height: 28 }} />
          </div>
        </div>
      )

    if (msg.file_type === 'video' && url)
      return (
        <video src={url} controls playsInline style={{
          width: 200, height: 200, objectFit: 'cover', borderRadius: '50%', display: 'block',
          border: isMine ? '3px solid rgba(255,255,255,.3)' : '3px solid var(--border)',
        }} />
      )

    if (msg.file_type === 'file' && url)
      return (
        <a href={url} download={msg.file_name || 'file'} target="_blank" rel="noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: isMine ? '#0a0f1e' : 'var(--lime)',
            textDecoration: 'none', fontWeight: 600, fontSize: 13,
          }}>
          <IconDownload />
          <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {msg.file_name || 'Download file'}
          </span>
        </a>
      )

    return (
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>
        {msg.content}
      </p>
    )
  }

  /* ── button style helper ── */
  const btnStyle = (bg, color, extra = {}) => ({
    width: 42, height: 42, borderRadius: 12,
    border: '1px solid var(--border)', background: bg, color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0, transition: 'all .2s', ...extra,
  })

  /* ══════════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <video
        ref={videoPreRef} autoPlay muted playsInline
        style={{
          position: 'fixed', bottom: 100, right: 24, zIndex: 200,
          width: 130, height: 130, borderRadius: '50%', objectFit: 'cover',
          border: '3px solid #ef4444', boxShadow: '0 4px 24px rgba(239,68,68,.4)',
          display: recVideo ? 'block' : 'none',
        }}
      />

      {incomingCall && !callOpen && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 500, background: 'var(--bg-card)', border: '1px solid var(--lime)',
          borderRadius: 16, padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 20,
          boxShadow: '0 8px 40px rgba(163,230,53,.25)', animation: 'pulse 1.5s infinite',
        }}>
          <style>{`@keyframes pulse{0%,100%{box-shadow:0 8px 40px rgba(163,230,53,.25)}50%{box-shadow:0 8px 48px rgba(163,230,53,.5)}}`}</style>
          <div style={{ fontSize: 36 }}>📞</div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16 }}>Incoming call</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{incomingCall.from_name}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={declineCall} style={{ background: '#ef4444', border: 'none', borderRadius: 10, padding: '10px 20px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Decline</button>
            <button onClick={answerCall}  style={{ background: 'var(--lime)', border: 'none', borderRadius: 10, padding: '10px 20px', color: '#0a0f1e', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Answer</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', height: 'calc(100vh - 64px)', background: 'var(--bg)', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)' }}>
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Messages</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{users.length} contacts</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {users.length === 0
              ? <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No contacts</div>
              : users.map(u => (
                <div key={u.id} onClick={() => setSelectedUser(u)} style={{
                  padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer', transition: 'all .15s',
                  background:  selectedUser?.id === u.id ? 'rgba(163,230,53,.08)' : 'transparent',
                  borderLeft: `3px solid ${selectedUser?.id === u.id ? 'var(--lime)' : 'transparent'}`,
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                    background: `${roleColor(u)}20`, border: `2px solid ${roleColor(u)}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: roleColor(u), fontWeight: 800, fontSize: 13,
                  }}>{initials(u)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.first_name} {u.last_name}
                    </div>
                    <div style={{ fontSize: 12, color: roleColor(u), fontWeight: 600, marginTop: 2 }}>{u.role}</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selectedUser ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 48, opacity: .2 }}>💬</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>Select a contact to start chatting</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: `${roleColor(selectedUser)}20`, border: `2px solid ${roleColor(selectedUser)}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: roleColor(selectedUser), fontWeight: 800, fontSize: 13,
                }}>{initials(selectedUser)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{selectedUser.first_name} {selectedUser.last_name}</div>
                  <div style={{ fontSize: 12, color: roleColor(selectedUser), fontWeight: 600 }}>{selectedUser.role}</div>
                </div>
                <button onClick={startCall} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--lime)', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#0a0f1e', cursor: 'pointer' }}>
                  📞 Call
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444' }} />
                  <span style={{ fontSize: 12, color: connected ? '#22c55e' : 'var(--text-muted)' }}>{connected ? 'Online' : 'Connecting...'}</span>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {loading ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No messages yet. Say hello! 👋</div>
                ) : messages.map((msg, i) => {
                  if (!msg.created_at) return null
                  const isMine   = (msg.sender_id || msg.sender) === user.id
                  const prev     = messages[i - 1]
                  const showDate = !prev || !prev.created_at || fmtDate(msg.created_at) !== fmtDate(prev.created_at)
                  const isCircle = msg.file_type === 'video'
                  const isHovered = hoveredMsgId === msg.id

                  return (
                    <div
                      key={msg.id || i}
                      onMouseEnter={() => isMine && setHoveredMsgId(msg.id)}
                      onMouseLeave={() => { setHoveredMsgId(null) }}
                    >
                      {showDate && (
                        <div style={{ textAlign: 'center', margin: '16px 0 8px' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '4px 12px', borderRadius: 20 }}>
                            {fmtDate(msg.created_at)}
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 6, marginBottom: 4 }}>

                        {/* ⋯ кнопка меню — только для своих, слева от пузыря */}
                          {isMine && (
                            <div style={{ position: 'relative', order: -1 }}>
                            <button
                              onClick={e => { e.stopPropagation(); setMenuMsgId(menuMsgId === msg.id ? null : msg.id) }}
                              style={{
                                width: 26, height: 26, borderRadius: 8,
                                border: '1px solid var(--border)',
                                background: 'var(--bg-input)',
                                color: 'var(--text-muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', fontSize: 16, lineHeight: 1,
                                opacity: isHovered || menuMsgId === msg.id ? 1 : 0,
                                transition: 'opacity .15s',
                                pointerEvents: isHovered || menuMsgId === msg.id ? 'auto' : 'none',
                              }}
                            >⋯</button>

                            {/* Dropdown меню */}
                            {menuMsgId === msg.id && (
                              <div
                                onClick={e => e.stopPropagation()}
                                style={{
                                  position: 'absolute', bottom: '110%', right: 0, zIndex: 100,
                                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                                  borderRadius: 10, overflow: 'hidden',
                                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                                  minWidth: 140,
                                }}
                              >
                                {/* Редактировать — только для текста */}
                                {msg.file_type === 'text' && (
                                  <div
                                    onClick={() => startEdit(msg)}
                                    style={{
                                      padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                                      cursor: 'pointer', fontSize: 13, color: 'var(--text)',
                                      transition: 'background .15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(163,230,53,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <IconEdit /> Изменить
                                  </div>
                                )}
                                {/* Удалить — для всех типов */}
                                <div
                                  onClick={() => deleteMsg(msg.id)}
                                  style={{
                                    padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                                    cursor: 'pointer', fontSize: 13, color: '#ef4444',
                                    transition: 'background .15s',
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <IconTrash /> Удалить
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Пузырь сообщения */}
                        <div style={{
                          maxWidth: isCircle ? 210 : '65%',
                          padding:  isCircle ? 0 : '10px 14px',
                          borderRadius: isCircle ? 0 : isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isCircle ? 'transparent' : isMine ? 'var(--lime)' : 'var(--bg-card)',
                          border: isCircle ? 'none' : isMine ? 'none' : '1px solid var(--border)',
                          color: isMine ? '#0a0f1e' : 'var(--text)',
                        }}>
                          {renderContent(msg, isMine)}
                          {!isCircle && editingMsgId !== msg.id && (
                            <p style={{ margin: '4px 0 0', fontSize: 10, opacity: .6, textAlign: 'right' }}>
                              {msg.is_edited && <span style={{ marginRight: 4 }}>изменено ·</span>}
                              {fmtTime(msg.created_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={onFileChange} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading} title="Attach file" style={btnStyle('var(--bg-input)', 'var(--text-muted)')}>
                  <IconClip />
                </button>

                <button
                  onMouseDown={startVideo} onMouseUp={stopVideo} onMouseLeave={stopVideo}
                  onTouchStart={e => { e.preventDefault(); startVideo() }} onTouchEnd={e => { e.preventDefault(); stopVideo() }}
                  disabled={uploading} title="Hold to record video"
                  style={btnStyle(recVideo ? '#ef4444' : 'var(--bg-input)', recVideo ? '#fff' : 'var(--text-muted)', recVideo ? { width: 'auto', padding: '0 12px', gap: 6 } : {})}
                >
                  <IconCamera />
                  {recVideo && <span style={{ fontSize: 11, fontWeight: 700 }}>{fmtSecs(videoSec)}</span>}
                </button>

                <textarea
                  value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                  placeholder={uploading ? 'Uploading...' : recVoice ? `🔴 Recording voice  ${fmtSecs(voiceSec)}` : recVideo ? `🔴 Recording video  ${fmtSecs(videoSec)}` : 'Type a message…  (Enter to send)'}
                  rows={1} disabled={uploading || recVoice || recVideo}
                  style={{
                    flex: 1, resize: 'none', padding: '11px 16px',
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: 12, color: 'var(--text)', fontSize: 14,
                    outline: 'none', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
                    opacity: (uploading || recVoice || recVideo) ? .5 : 1,
                  }}
                />

                <button
                  onMouseDown={startVoice} onMouseUp={stopVoice} onMouseLeave={stopVoice}
                  onTouchStart={e => { e.preventDefault(); startVoice() }} onTouchEnd={e => { e.preventDefault(); stopVoice() }}
                  disabled={uploading} title="Hold to record voice"
                  style={btnStyle(recVoice ? '#ef4444' : 'var(--bg-input)', recVoice ? '#fff' : 'var(--text-muted)', recVoice ? { width: 'auto', padding: '0 12px', gap: 6 } : {})}
                >
                  <IconMic />
                  {recVoice && <span style={{ fontSize: 11, fontWeight: 700 }}>{fmtSecs(voiceSec)}</span>}
                </button>

                <button
                  onClick={sendMsg} disabled={!input.trim() || !connected || uploading}
                  style={btnStyle(
                    (input.trim() && connected && !uploading) ? 'var(--lime)' : 'var(--bg-input)',
                    (input.trim() && connected && !uploading) ? '#0a0f1e' : 'var(--text-muted)',
                    { width: 'auto', padding: '0 18px' },
                  )}
                >
                  <IconSend />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {callOpen && selectedUser && (
        <VideoCall user={user} otherUser={selectedUser} token={localStorage.getItem('access')} onClose={endCall} />
      )}
    </>
  )
}