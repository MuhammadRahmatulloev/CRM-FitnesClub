import { useEffect, useRef, useState, useCallback } from 'react'

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

// const WS_BASE = 'ws://localhost:8000'

const WS_BASE = 'wss://muhammad.softclub.win'

export default function VideoCall({ user, otherUser, token, onClose }) {
  const [status, setStatus]       = useState('connecting') // connecting | calling | in-call | ended
  const [isMuted, setIsMuted]     = useState(false)
  const [isCamOff, setIsCamOff]   = useState(false)
  const [error, setError]         = useState(null)

  const localVideoRef  = useRef(null)
  const remoteVideoRef = useRef(null)
  const wsRef          = useRef(null)
  const pcRef          = useRef(null)
  const localStreamRef = useRef(null)

  // ─── Cleanup ────────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    pcRef.current?.close()
    wsRef.current?.close()
    pcRef.current  = null
    wsRef.current  = null
    localStreamRef.current = null
  }, [])

  // ─── Send signal via WS ──────────────────────────────────────────────────────
  const sendSignal = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  // ─── Create RTCPeerConnection ────────────────────────────────────────────────
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(STUN_SERVERS)

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({ type: 'ice-candidate', candidate: e.candidate })
      }
    }

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0]
      }
      setStatus('in-call')
    }

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setStatus('ended')
      }
    }

    return pc
  }, [sendSignal])

  // ─── Init: получить камеру + открыть WS ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }

        localStreamRef.current = stream
        if (localVideoRef.current) localVideoRef.current.srcObject = stream

        const ws = new WebSocket(`${WS_BASE}/ws/call/${otherUser.id}/?token=${token}`)
        wsRef.current = ws

        ws.onopen = () => {
          if (!cancelled) setStatus('calling')
        }

        ws.onmessage = async (e) => {
          const data = JSON.parse(e.data)

          if (data.type === 'user-joined') {
            // Мы — инициатор: создаём offer
            if (data.from !== user.id) {
              const pc = createPeerConnection()
              pcRef.current = pc
              stream.getTracks().forEach(t => pc.addTrack(t, stream))

              const offer = await pc.createOffer()
              await pc.setLocalDescription(offer)
              sendSignal({ type: 'offer', sdp: offer })
            }
            return
          }

          if (data.type === 'offer') {
            const pc = createPeerConnection()
            pcRef.current = pc
            stream.getTracks().forEach(t => pc.addTrack(t, stream))

            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            sendSignal({ type: 'answer', sdp: answer })
            return
          }

          if (data.type === 'answer') {
            await pcRef.current?.setRemoteDescription(new RTCSessionDescription(data.sdp))
            return
          }

          if (data.type === 'ice-candidate') {
            try {
              await pcRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate))
            } catch (_) {}
            return
          }

          if (data.type === 'call-ended') {
            setStatus('ended')
          }
        }

        ws.onerror = () => setError('WebSocket connection error')
        ws.onclose = () => {
          if (!cancelled && status !== 'ended') setStatus('ended')
        }

      } catch (err) {
        if (!cancelled) setError('Camera / microphone access denied')
      }
    }

    init()

    return () => {
      cancelled = true
      cleanup()
    }
  }, []) // eslint-disable-line

  // ─── End call ───────────────────────────────────────────────────────────────
  const handleEndCall = () => {
    sendSignal({ type: 'call-ended' })
    cleanup()
    setStatus('ended')
    onClose?.()
  }

  // ─── Toggle mute ────────────────────────────────────────────────────────────
  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setIsMuted(!audioTrack.enabled)
    }
  }

  // ─── Toggle camera ──────────────────────────────────────────────────────────
  const toggleCam = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setIsCamOff(!videoTrack.enabled)
    }
  }

  // ─── Status label ───────────────────────────────────────────────────────────
  const statusLabel = {
    connecting : 'Connecting...',
    calling    : `Calling ${otherUser.first_name}...`,
    'in-call'  : `In call with ${otherUser.first_name}`,
    ended      : 'Call ended',
  }[status]

  // ─── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.statusDot(status)} />
          <span style={styles.statusText}>{statusLabel}</span>
        </div>

        {error && (
          <div style={styles.error}>{error}</div>
        )}

        {/* Videos */}
        <div style={styles.videoArea}>
          {/* Remote */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={styles.remoteVideo}
          />

          {/* Local (picture-in-picture) */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={styles.localVideo}
          />

          {status !== 'in-call' && (
            <div style={styles.waitingOverlay}>
              <div style={styles.avatar}>
                {otherUser.first_name?.[0]}{otherUser.last_name?.[0]}
              </div>
              <p style={{ color: '#fff', marginTop: 16, fontSize: 18 }}>
                {statusLabel}
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={styles.controls}>
          <button
            onClick={toggleMute}
            style={styles.controlBtn(isMuted)}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🎙️'}
          </button>

          <button
            onClick={handleEndCall}
            style={styles.endBtn}
            title="End call"
          >
            📵
          </button>

          <button
            onClick={toggleCam}
            style={styles.controlBtn(isCamOff)}
            title={isCamOff ? 'Turn camera on' : 'Turn camera off'}
          >
            {isCamOff ? '🚫' : '📷'}
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    background: '#0a0f1e',
    borderRadius: 20,
    border: '1px solid #1e293b',
    width: '100%',
    maxWidth: 800,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderBottom: '1px solid #1e293b',
  },
  statusDot: (status) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: status === 'in-call' ? '#22c55e' : status === 'ended' ? '#ef4444' : '#f59e0b',
  }),
  statusText: {
    color: '#e2e8f0',
    fontWeight: 600,
    fontSize: 15,
  },
  error: {
    background: '#450a0a',
    color: '#fca5a5',
    padding: '10px 24px',
    fontSize: 14,
  },
  videoArea: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16/9',
    background: '#020617',
    overflow: 'hidden',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  localVideo: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 180,
    height: 120,
    objectFit: 'cover',
    borderRadius: 12,
    border: '2px solid #1e293b',
    background: '#0f172a',
  },
  waitingOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(2,6,23,0.9)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #a3e635, #22c55e)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 800,
    color: '#0a0f1e',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: '20px 24px',
    borderTop: '1px solid #1e293b',
  },
  controlBtn: (active) => ({
    width: 54,
    height: 54,
    borderRadius: '50%',
    border: '1px solid #1e293b',
    background: active ? '#1e293b' : '#0f172a',
    fontSize: 22,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  }),
  endBtn: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    border: 'none',
    background: '#ef4444',
    fontSize: 26,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
}