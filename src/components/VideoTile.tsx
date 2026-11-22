import { useEffect, useRef } from 'react'

type Props = {
  stream: MediaStream | null
  label: string
  muted?: boolean
  mirror?: boolean
  placeholder: string
  compact?: boolean
}

export default function VideoTile({
  stream,
  label,
  muted = false,
  mirror = false,
  placeholder,
  compact = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream])

  return (
    <section className={`video-tile ${compact ? 'video-tile--compact' : ''}`}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={mirror ? 'video-mirror' : ''}
        />
      ) : (
        <div className="video-placeholder">
          <div className="avatar">{label.slice(0, 1).toUpperCase()}</div>
          <span>{placeholder}</span>
        </div>
      )}
      <div className="video-label">
        <span className="live-dot" />
        {label}
      </div>
    </section>
  )
}
