'use client'

import { useRef, useEffect } from 'react'

interface CheckInModalProps {
  onClose: () => void
  onCapture: () => void
  onStreamReady: (stream: MediaStream) => void
}

export default function CheckInModal({ onClose, onCapture, onStreamReady }: CheckInModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let mediaStream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        mediaStream = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        onStreamReady(stream)
      })
      .catch(() => {
        // parent handles error message
      })

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop())
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(74, 74, 74, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '24px', maxWidth: '500px', width: '100%', boxShadow: 'var(--shadow-lg)', border: '2px solid var(--border)', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--error)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: 'white', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ×
        </button>
        <h3 style={{ fontSize: '20px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '16px' }}>📸 刷臉點名</h3>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: '100%', borderRadius: 'var(--radius-md)', background: '#000', marginBottom: '12px' }}
        />
        <button
          disabled
          onClick={onCapture}
          style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', background: '#B0B8B4', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'not-allowed', opacity: 0.7 }}
        >
          📸 拍照辨識（功能開發中）
        </button>
        <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', background: '#FFF8E7', border: '1px solid #F0D080', borderRadius: 'var(--radius-sm)', padding: '6px 10px' }}>
          ⚠️ AI 臉部辨識功能尚在開發中，敬請期待
        </div>
      </div>
    </div>
  )
}
