import { useWebRTC } from './hooks/useWebRTC'
import VideoTile from './components/VideoTile'
import CallControls from './components/CallControls'

const statusText: Record<string, string> = {
  idle: 'Готовы к собеседованию?',
  connecting: 'Подключаем камеру и микрофон…',
  waiting: 'Ожидаем второго участника',
  connected: 'Собеседование началось',
  disconnected: 'Соединение прервано',
}

export default function App() {
  const {
    localStream,
    remoteStream,
    connectionState,
    micEnabled,
    cameraEnabled,
    error,
    startCall,
    endCall,
    toggleMic,
    toggleCamera,
  } = useWebRTC()

  const inCall = connectionState !== 'idle'

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="./" aria-label="BandSpace home">
          <span className="brand-mark">B</span>
          <span>band<span>space</span></span>
        </a>
        <div className="topbar-right">
          <span className="secure-label"><span className="secure-dot" /> Private interview room</span>
          <div className="profile-circle">A</div>
        </div>
      </header>

      <section className="page-content">
        <div className="eyebrow"><span /> VIDEO INTERVIEW</div>
        <div className="heading-row">
          <div>
            <h1>Личное <span>пространство</span><br />для общения</h1>
            <p className="subtitle">Спокойное место для важных разговоров и новых возможностей.</p>
          </div>
          <div className="room-chip"><span className="room-chip-dot" /> Комната 1 на 1</div>
        </div>

        <section className="interview-card">
          <div className="card-topline">
            <div>
              <div className="section-kicker">VIDEO ROOM</div>
              <h2>Видеособеседование</h2>
            </div>
            <div className={`status-pill status-${connectionState}`}>
              <span /> {statusText[connectionState]}
            </div>
          </div>

          <div className="video-stage">
            <VideoTile
              stream={remoteStream}
              label="Собеседник"
              placeholder={connectionState === 'connected' ? 'Подключаем видео…' : 'Ожидаем участника'}
            />
            <VideoTile
              stream={localStream}
              label="Вы"
              muted
              mirror
              compact
              placeholder="Ваша камера появится здесь"
            />
            {!inCall && (
              <div className="stage-hint">
                <div className="hint-icon">✦</div>
                <strong>Всё готово к встрече</strong>
                <span>Включите камеру, чтобы войти в комнату</span>
              </div>
            )}
          </div>

          {error && <div className="error-message" role="alert">{error}</div>}

          <div className="card-bottom">
            {inCall ? (
              <CallControls
                micEnabled={micEnabled}
                cameraEnabled={cameraEnabled}
                onToggleMic={toggleMic}
                onToggleCamera={toggleCamera}
                onEndCall={endCall}
              />
            ) : (
              <button className="join-button" onClick={startCall}>
                <span>↗</span> Войти в видеокомнату
              </button>
            )}
            <p className="privacy-note"><span>⌑</span> Ваше соединение устанавливается напрямую между участниками</p>
          </div>
        </section>

        <div className="info-row">
          <div className="info-item"><span className="info-icon">◎</span><div><strong>Личная встреча</strong><small>Только два участника</small></div></div>
          <div className="info-item"><span className="info-icon">⌁</span><div><strong>Прямое соединение</strong><small>Передача через WebRTC</small></div></div>
          <div className="info-item"><span className="info-icon">✧</span><div><strong>Просто и удобно</strong><small>Без установки приложений</small></div></div>
        </div>
        <footer>© 2026 BandSpace <span>Made for meaningful conversations</span></footer>
      </section>
    </main>
  )
}
