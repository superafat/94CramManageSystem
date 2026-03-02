'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

interface CheckInModalProps {
  onClose: () => void
  onCapture: (base64: string) => Promise<void>
  onStreamReady: (stream: MediaStream) => void
}

export default function CheckInModal({ onClose, onCapture, onStreamReady }: CheckInModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [capturing, setCapturing] = useState(false)
  const [cameraError, setCameraError] = useState('')

  useEffect(() => {
    let mediaStream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then((stream) => {
        mediaStream = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        onStreamReady(stream)
      })
      .catch(() => {
        setCameraError('無法開啟相機，請確認瀏覽器相機權限')
      })

    return () => {
      if (mediaStream) mediaStream.getTracks().forEach(t => t.stop())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg', 0.85)

    setCapturing(true)
    try {
      await onCapture(base64)
    } finally {
      setCapturing(false)
    }
  }, [onCapture])

  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(74, 74, 74, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '24px', maxWidth: '500px', width: '100%', boxShadow: 'var(--shadow-lg)', border: '2px solid var(--border)', position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--error)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: 'white', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}
        >×</button>

        <h3 style={{ fontSize: '20px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '16px' }}>
          📸 刷臉點名
        </h3>

        {cameraError ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--error)', fontSize: '14px' }}>
            ⚠️ {cameraError}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', borderRadius: 'var(--radius-md)', background: '#000', marginBottom: '12px' }}
          />
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <button
          onClick={handleCapture}
          disabled={capturing || !!cameraError}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: capturing || cameraError ? '#B0B8B4' : 'var(--accent)',
            color: 'white',
            border: 'none',
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: capturing || cameraError ? 'not-allowed' : 'pointer',
          }}
        >
          {capturing ? '⏳ 辨識中...' : '📸 拍照辨識全班'}
        </button>

        <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
          對準全班同學後按下拍照，系統自動辨識並點名
        </div>
      </div>
    </div>
  )
}
