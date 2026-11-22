type Props = {
  micEnabled: boolean
  cameraEnabled: boolean
  onToggleMic: () => void
  onToggleCamera: () => void
  onEndCall: () => void
}

export default function CallControls({
  micEnabled,
  cameraEnabled,
  onToggleMic,
  onToggleCamera,
  onEndCall,
}: Props) {
  return (
    <div className="controls">
      <button className={`control-button ${!micEnabled ? 'is-off' : ''}`} onClick={onToggleMic}>
        <span className="control-icon">{micEnabled ? '♩' : '×'}</span>
        <span>{micEnabled ? 'Микрофон' : 'Включить звук'}</span>
      </button>
      <button className={`control-button ${!cameraEnabled ? 'is-off' : ''}`} onClick={onToggleCamera}>
        <span className="control-icon">{cameraEnabled ? '▣' : '×'}</span>
        <span>{cameraEnabled ? 'Камера' : 'Включить камеру'}</span>
      </button>
      <button className="end-button" onClick={onEndCall}>
        <span>☎</span>
        Завершить
      </button>
    </div>
  )
}
