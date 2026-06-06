'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Camera, SwitchCamera, Zap, ZapOff, X, Check, ImageUp } from 'lucide-react'

interface CameraCaptureProps {
  mode: 'ocr' | 'solve' | 'table'
  onCapture: (blob: Blob, mode: string) => void
  onClose: () => void
}

export default function CameraCapture({ mode, onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [flash, setFlash] = useState(false)
  const [captured, setCaptured] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [hasCamera, setHasCamera] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = useCallback(async () => {
    try {
      setError('')
      const constraints: MediaStreamConstraints = {
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setReady(true)
      }
    } catch (err: unknown) {
      const msg = err instanceof DOMException ? err.message : '摄像头不可用'
      if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        setError('摄像头权限被拒绝\n请在浏览器设置中允许访问摄像头')
      } else if (msg.includes('NotFound') || msg.includes('Devices')) {
        setError('未检测到摄像头设备')
      } else {
        setError('摄像头不可用，请使用相册上传')
      }
      setHasCamera(false)
    }
  }, [facingMode])

  useEffect(() => {
    startCamera()
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [startCamera])

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  function switchCamera() {
    stopCamera()
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
  }

  function takePhoto() {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 1920
    canvas.height = video.videoHeight || 1080
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      setCaptured(url)
      stopCamera()
    }, 'image/jpeg', 0.85)
  }

  function confirmPhoto() {
    if (!canvasRef.current || !captured) return
    canvasRef.current.toBlob(blob => {
      if (!blob) return
      onCapture(blob, mode)
    }, 'image/jpeg', 0.85)
  }

  function retakePhoto() {
    setCaptured(null)
    startCamera()
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCaptured(reader.result as string)
      setHasCamera(false)
    }
    reader.readAsDataURL(file)
  }

  function confirmFileUpload() {
    if (!canvasRef.current) return
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current!
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(blob => {
        if (!blob) return
        onCapture(blob, mode)
      }, 'image/jpeg', 0.85)
    }
    img.src = captured!
  }

  const modeLabel = mode === 'ocr' ? '拍照识别' : mode === 'solve' ? '拍照解题' : '拍照上传'

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[52px] bg-black/90" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <button onClick={() => { stopCamera(); onClose() }} className="w-[44px] h-[44px] flex items-center justify-center">
          <X className="w-6 h-6 text-white" />
        </button>
        <span className="text-white text-[15px] font-semibold">{modeLabel}</span>
        <div className="w-[44px]" />
      </div>

      {/* Camera area */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {captured ? (
          <img src={captured} alt="captured" className="w-full h-full object-contain" />
        ) : ready ? (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {/* Viewfinder corners */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-8 left-8 w-8 h-8 border-t-[3px] border-l-[3px] border-white/60 rounded-tl-lg" />
              <div className="absolute top-8 right-8 w-8 h-8 border-t-[3px] border-r-[3px] border-white/60 rounded-tr-lg" />
              <div className="absolute bottom-8 left-8 w-8 h-8 border-b-[3px] border-l-[3px] border-white/60 rounded-bl-lg" />
              <div className="absolute bottom-8 right-8 w-8 h-8 border-b-[3px] border-r-[3px] border-white/60 rounded-br-lg" />
            </div>
          </>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-white px-8 text-center">
            <Camera className="w-16 h-16 text-gray-600 mb-5" />
            <p className="text-gray-400 text-[15px] whitespace-pre-line leading-relaxed">{error}</p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-10 h-10 border-[3px] border-white/30 border-t-white rounded-full" />
          </div>
        )}
      </div>

      {/* Controls */}
      {!captured && ready && (
        <div className="flex items-center justify-around px-6 py-4 bg-black/90" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)' }}>
          <button onClick={switchCamera} className="w-[52px] h-[52px] flex items-center justify-center rounded-full active:bg-white/10 transition-colors">
            <SwitchCamera className="w-6 h-6 text-white" />
          </button>

          <button onClick={takePhoto} className="w-[68px] h-[68px] rounded-full border-[3px] border-white flex items-center justify-center active:scale-95 transition-transform">
            <div className="w-[54px] h-[54px] rounded-full bg-white" />
          </button>

          <button onClick={() => setFlash(!flash)} className="w-[52px] h-[52px] flex items-center justify-center rounded-full active:bg-white/10 transition-colors">
            {flash ? <Zap className="w-6 h-6 text-yellow-400" /> : <ZapOff className="w-6 h-6 text-white/70" />}
          </button>
        </div>
      )}

      {/* Flash overlay */}
      {flash && !captured && (
        <div className="absolute inset-0 bg-white pointer-events-none opacity-50" />
      )}

      {/* After capture: confirm/retake */}
      {captured && (
        <div className="flex items-center justify-around px-6 py-4 bg-black/90" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)' }}>
          <button onClick={hasCamera ? retakePhoto : () => setCaptured(null)} className="flex flex-col items-center gap-1 text-white">
            <div className="w-[52px] h-[52px] flex items-center justify-center rounded-full active:bg-white/10 transition-colors">
              <X className="w-7 h-7" />
            </div>
            <span className="text-[11px]">重拍</span>
          </button>

          <button onClick={hasCamera ? confirmPhoto : confirmFileUpload} className="w-[52px] h-[52px] bg-blue-600 rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-lg shadow-blue-600/40">
            <Check className="w-7 h-7 text-white" />
          </button>

          <div className="w-[52px]" />
        </div>
      )}

      {/* Upload button in error state */}
      {error && !captured && (
        <div className="flex justify-center px-6 py-4 bg-black/90" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)' }}>
          <label className="bg-blue-600 text-white px-6 h-[48px] rounded-2xl text-[15px] font-semibold flex items-center gap-2 active:scale-[0.98] transition-transform">
            <ImageUp className="w-5 h-5" />
            从相册选择
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      )}
    </div>
  )
}
