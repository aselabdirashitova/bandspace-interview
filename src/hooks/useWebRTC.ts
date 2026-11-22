import { useCallback, useRef, useState } from 'react'

const SIGNALING_URL = 'wss://inai-col3.fishrungames.com/signaling/'

type SignalMessage =
  | { type: 'hello'; id: string }
  | { type: 'hello-ack'; id: string }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit }
  | { type: 'peer-left' }

type ConnectionState = 'idle' | 'connecting' | 'waiting' | 'connected' | 'disconnected'

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function useWebRTC() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [error, setError] = useState('')

  const socketRef = useRef<WebSocket | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const localIdRef = useRef(createId())
  const peerIdRef = useRef<string | null>(null)
  const offerStartedRef = useRef(false)

  const sendSignal = useCallback((message: SignalMessage) => {
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
    }
  }, [])

  const closePeer = useCallback(() => {
    peerRef.current?.close()
    peerRef.current = null
    pendingCandidatesRef.current = []
    setRemoteStream(null)
    offerStartedRef.current = false
  }, [])

  const makePeer = useCallback(() => {
    if (peerRef.current) return peerRef.current

    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    })

    const stream = localStreamRef.current
    stream?.getTracks().forEach((track) => peer.addTrack(track, stream))

    peer.ontrack = (event) => {
      const [streamFromPeer] = event.streams
      if (streamFromPeer) setRemoteStream(streamFromPeer)
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
        })
      }
    }

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') {
        setConnectionState('connected')
      } else if (
        peer.connectionState === 'failed' ||
        peer.connectionState === 'disconnected' ||
        peer.connectionState === 'closed'
      ) {
        if (peer.connectionState !== 'closed') setConnectionState('disconnected')
      }
    }

    peerRef.current = peer
    return peer
  }, [sendSignal])

  const flushCandidates = useCallback(async (peer: RTCPeerConnection) => {
    const candidates = pendingCandidatesRef.current
    pendingCandidatesRef.current = []
    for (const candidate of candidates) {
      try {
        await peer.addIceCandidate(candidate)
      } catch (err) {
        console.warn('Не удалось добавить отложенный ICE candidate', err)
      }
    }
  }, [])

  const startOffer = useCallback(async () => {
    if (offerStartedRef.current || !peerIdRef.current) return
    // A stable ID comparison elects exactly one of the two browsers as offerer.
    if (localIdRef.current > peerIdRef.current) return

    const peer = makePeer()
    offerStartedRef.current = true
    try {
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      if (peer.localDescription) {
        sendSignal({ type: 'offer', sdp: peer.localDescription.toJSON() })
      }
    } catch (err) {
      offerStartedRef.current = false
      setError(`Не удалось начать звонок: ${err instanceof Error ? err.message : 'неизвестная ошибка'}`)
    }
  }, [makePeer, sendSignal])

  const handleSignal = useCallback(async (message: SignalMessage) => {
    if (message.type === 'peer-left') {
      peerIdRef.current = null
      closePeer()
      setConnectionState('waiting')
      return
    }

    if (message.type === 'hello') {
      peerIdRef.current = message.id
      setConnectionState('waiting')
      sendSignal({ type: 'hello-ack', id: localIdRef.current })
      await startOffer()
      return
    }

    if (message.type === 'hello-ack') {
      peerIdRef.current = message.id
      setConnectionState('waiting')
      await startOffer()
      return
    }

    if (message.type === 'offer') {
      const peer = makePeer()
      await peer.setRemoteDescription(new RTCSessionDescription(message.sdp))
      await flushCandidates(peer)
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      if (peer.localDescription) {
        sendSignal({ type: 'answer', sdp: peer.localDescription.toJSON() })
      }
      return
    }

    if (message.type === 'answer') {
      const peer = makePeer()
      await peer.setRemoteDescription(new RTCSessionDescription(message.sdp))
      await flushCandidates(peer)
      return
    }

    if (message.type === 'ice-candidate') {
      const peer = makePeer()
      if (peer.remoteDescription) {
        try {
          await peer.addIceCandidate(message.candidate)
        } catch (err) {
          console.warn('Не удалось добавить ICE candidate', err)
        }
      } else {
        pendingCandidatesRef.current.push(message.candidate)
      }
    }
  }, [closePeer, flushCandidates, makePeer, sendSignal, startOffer])

  const startCall = useCallback(async () => {
    setError('')
    setConnectionState('connecting')

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Браузер не поддерживает доступ к камере. Откройте сайт через HTTPS или localhost.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      localStreamRef.current = stream
      setLocalStream(stream)
      setMicEnabled(true)
      setCameraEnabled(true)

      const socket = new WebSocket(SIGNALING_URL)
      socketRef.current = socket

      socket.onopen = () => {
        setConnectionState('waiting')
        makePeer()
        sendSignal({ type: 'hello', id: localIdRef.current })
      }

      socket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data) as SignalMessage
          await handleSignal(message)
        } catch (err) {
          console.error('Ошибка обработки signaling-сообщения', err)
          setError('Не удалось обработать сообщение сервера. Проверьте соединение.')
        }
      }

      socket.onerror = () => {
        setError('Не удалось подключиться к signaling-серверу.')
        setConnectionState('disconnected')
      }

      socket.onclose = () => {
        if (connectionState !== 'idle') {
          setConnectionState('disconnected')
        }
      }
    } catch (err) {
      streamCleanup()
      setConnectionState('idle')
      setError(err instanceof Error ? err.message : 'Не удалось включить камеру и микрофон.')
    }
  // connectionState intentionally is not a dependency: this callback starts a new session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSignal, makePeer, sendSignal])

  const streamCleanup = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    setLocalStream(null)
  }

  const toggleMic = useCallback(() => {
    const next = !micEnabled
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = next })
    setMicEnabled(next)
  }, [micEnabled])

  const toggleCamera = useCallback(() => {
    const next = !cameraEnabled
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = next })
    setCameraEnabled(next)
  }, [cameraEnabled])

  const endCall = useCallback(() => {
    sendSignal({ type: 'peer-left' })
    socketRef.current?.close()
    socketRef.current = null
    closePeer()
    streamCleanup()
    peerIdRef.current = null
    setConnectionState('idle')
    setMicEnabled(true)
    setCameraEnabled(true)
    setError('')
  }, [closePeer, sendSignal])

  return {
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
  }
}
