'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Camera, SwitchCamera, X, Check, ImageUp } from 'lucide-react'

interface CameraCaptureProps {
  mode: 'ocr' | 'solve' | 'table'
  onCapture: (blob: Blob, mode: string) => void
  onClose: () => void
}

async function getCameraStream(facingMode: 'environment' | 'user'): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: { facingMode }, audio: false },
    { video: true, audio: false },
  ]
  let lastError: unknown
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}

function getCameraErrorMessage(err: unknown): string {
  if (!(err instanceof DOMException)) return '摄像头不可用，请使用相册上传'
  if (err.name === 'NotAllowedError' || err.message.includes('Permission')) {
    return '摄像头权限被拒绝\n请在浏览器设置中允许访问摄像头'
  }
  if (err.name === 'NotFoundError' || err.message.includes('NotFound')) {
    return '未检测到摄像头设备'
  }
  if (err.name === 'NotReadableError') {
    return '摄像头被其他应用占用\n请关闭后重试'
  }
  if (err.name === 'OverconstrainedError') {
    return '当前设备不支持该摄像头配置\n请使用相册上传'
  }
  return '摄像头不可用，请使用相册上传'
}

export default function CameraCapture({ mode, onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [captured, setCaptured] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [hasCamera, setHasCamera] = useState(true)
  const [started, setStarted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const attachStream = useCallback(async (stream: MediaStream) => {
    const video = videoRef.current
    if (!video) {
      stream.getTracks().forEach(t => t.stop())
      throw new Error('视频元素未就绪')
    }
    video.srcObject = stream
    await video.play()
    setReady(true)
  }, [])

  const startCamera = useCallback(async () => {
    if (!window.isSecureContext) {
      setError('摄像头需要在 HTTPS 安全连接下使用\n请使用 https:// 访问本网站')
      setHasCamera(false)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('当前浏览器不支持摄像头\n请使用相册上传')
      setHasCamera(false)
      return
    }

    try {
      setError('')
      setReady(false)
      setStarted(true)
      stopCamera()

      const stream = await getCameraStream(facingMode)
      streamRef.current = stream
      await attachStream(stream)
    } catch (err: unknown) {
      stopCamera()
      setError(getCameraErrorMessage(err))
      setHasCamera(false)
      setStarted(false)
    }
  }, [facingMode, attachStream])

  useEffect(() => {
    return () => stopCamera()
  }, [])

  async function switchCamera() {
    const newMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newMode)
    stopCamera()
    setReady(false)
    setStarted(true)
    setError('')

    try {
      const stream = await getCameraStream(newMode)
      streamRef.current = stream
      await attachStream(stream)
    } catch (err: unknown) {
      stopCamera()
      setError(getCameraErrorMessage(err))
      setStarted(false)
    }
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
    }, 'image/jpeg', 0.4)
  }

  function confirmPhoto() {
    if (!canvasRef.current || !captured) return
    canvasRef.current.toBlob(blob => {
      if (!blob) return
      onCapture(blob, mode)
    }, 'image/jpeg', 0.4)
  }

  function retakePhoto() {
    setCaptured(null)
    setReady(false)
    setStarted(false)
    startCamera()
  }

  function openAlbum() {
    stopCamera()
    setStarted(false)
    setReady(false)
    setError('')
    fileInputRef.current?.click()
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      setCaptured(reader.result as string)
      setHasCamera(false)
      setError('')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
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
      }, 'image/jpeg', 0.4)
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
        ) : (
          <>
            {/* Always mount video so ref is available when getUserMedia resolves */}
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${ready ? 'block' : 'hidden'}`}
              playsInline
              muted
              autoPlay
            />
            {ready && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-8 left-8 w-8 h-8 border-t-[3px] border-l-[3px] border-white/60 rounded-tl-lg" />
                <div className="absolute top-8 right-8 w-8 h-8 border-t-[3px] border-r-[3px] border-white/60 rounded-tr-lg" />
                <div className="absolute bottom-8 left-8 w-8 h-8 border-b-[3px] border-l-[3px] border-white/60 rounded-bl-lg" />
                <div className="absolute bottom-8 right-8 w-8 h-8 border-b-[3px] border-r-[3px] border-white/60 rounded-br-lg" />
              </div>
            )}
            {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-8 text-center">
                <Camera className="w-16 h-16 text-gray-600 mb-5" />
                <p className="text-gray-400 text-[15px] whitespace-pre-line leading-relaxed">{error}</p>
              </div>
            ) : !started ? (
              <button onClick={startCamera} className="absolute inset-0 flex flex-col items-center justify-center w-full text-white">
                <Camera className="w-20 h-20 mb-4 opacity-60" />
                <span className="text-[17px] font-semibold">点击打开摄像头</span>
                <span className="text-[13px] text-gray-400 mt-2">使用后置摄像头拍摄</span>
              </button>
            ) : !ready ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin w-10 h-10 border-[3px] border-white/30 border-t-white rounded-full" />
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Controls */}
      {!captured && ready && (
        <div className="flex items-center justify-around px-6 py-4 bg-black/90" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)' }}>
          <button onClick={openAlbum} className="w-[52px] h-[52px] flex items-center justify-center rounded-full active:bg-white/10 transition-colors">
            <ImageUp className="w-6 h-6 text-white" />
          </button>

          <button onClick={takePhoto} className="w-[68px] h-[68px] rounded-full border-[3px] border-white flex items-center justify-center active:scale-95 transition-transform">
            <div className="w-[54px] h-[54px] rounded-full bg-white" />
          </button>

          <button onClick={switchCamera} className="w-[52px] h-[52px] flex items-center justify-center rounded-full active:bg-white/10 transition-colors">
            <SwitchCamera className="w-6 h-6 text-white" />
          </button>
        </div>
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

      {/* Hidden file input — no capture attr so mobile opens photo library */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
        onChange={handleFileUpload}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Upload fallback */}
      {!captured && (error || !started) && (
        <div className="flex justify-center px-6 py-4 bg-black/90" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)' }}>
          <button
            type="button"
            onClick={openAlbum}
            className="bg-blue-600 text-white px-6 h-[48px] rounded-2xl text-[15px] font-semibold flex items-center gap-2 active:scale-[0.98] transition-transform"
          >
            <ImageUp className="w-5 h-5" />
            从相册选择
          </button>
        </div>
      )}
    </div>
  )
}
