/**
 * Two-way live voice guide.
 *
 * Flow: GET /api/voice/guide/token → { conversationToken } → open a realtime
 * connection to the ElevenLabs agent with @elevenlabs/client.
 *
 * Transport: the backend's conversationToken only works over WebRTC.
 * If the backend later returns a `signedUrl` instead, this connects over
 * WebSocket automatically. Both are persistent, full-duplex realtime connections.
 *
 * Start it only from a "Talk to guide" button (needs mic permission).
 */
import { Conversation } from '@elevenlabs/client'
import { getJson } from './http'
import { setVoiceMuted } from './voice'

export type GuideStatus = 'idle' | 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error'
export type GuideMode = 'speaking' | 'listening'

export interface GuideCallbacks {
  /** Transcript lines. role is 'user' or 'agent'. */
  onMessage?: (msg: { role: string; message: string }) => void
  onStatusChange?: (status: GuideStatus) => void
  /** Whether the guide is currently talking or listening. */
  onModeChange?: (mode: GuideMode) => void
  onError?: (message: string) => void
}

interface TokenResponse {
  conversationToken?: string
  signedUrl?: string
}

export interface GuideSession {
  /** Tell the agent something without the player hearing it, e.g. the new target. */
  setTarget(targetName: string): void
  sendContext(text: string): void
  /** Send a typed message as if the player said it. */
  sendText(text: string): void
  setMicMuted(muted: boolean): void
  setVolume(volume: number): void
  end(): Promise<void>
}

type ConversationInstance = Awaited<ReturnType<typeof Conversation.startSession>>

/** GET /api/voice/guide/token. A fresh token is needed for every session. */
export async function fetchGuideToken(): Promise<TokenResponse | null> {
  const res = await getJson<TokenResponse>('/api/voice/guide/token')
  return res.ok ? res.data : null
}

/**
 * Starts the live guide. Returns null if mic permission is denied or the guide
 * isn't available — callers should just hide/disable the button in that case.
 */
export async function startGuide(
  targetName: string | null,
  callbacks: GuideCallbacks = {},
): Promise<GuideSession | null> {
  callbacks.onStatusChange?.('connecting')
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch {
    callbacks.onError?.('Microphone permission denied')
    callbacks.onStatusChange?.('error')
    return null
  }

  const token = await fetchGuideToken()
  if (!token || (!token.conversationToken && !token.signedUrl)) {
    callbacks.onError?.('Guide not available')
    callbacks.onStatusChange?.('error')
    return null
  }

  const handlers = {
    onConnect: () => callbacks.onStatusChange?.('connected'),
    onDisconnect: () => {
      callbacks.onStatusChange?.('disconnected')
      setVoiceMuted(false)
    },
    onMessage: ({ message, role }: { message: string; role: string }) =>
      callbacks.onMessage?.({ role, message }),
    onModeChange: ({ mode }: { mode: GuideMode }) => callbacks.onModeChange?.(mode),
    onError: (message: string) => callbacks.onError?.(message),
  }

  setVoiceMuted(true) // keep the narrator quiet while talking
  let conversation: ConversationInstance
  try {
    conversation = token.signedUrl
      ? await Conversation.startSession({ signedUrl: token.signedUrl, connectionType: 'websocket', ...handlers })
      : await Conversation.startSession({
          conversationToken: token.conversationToken!,
          connectionType: 'webrtc',
          ...handlers,
        })
  } catch (err) {
    setVoiceMuted(false)
    callbacks.onError?.(err instanceof Error ? err.message : 'Could not connect to guide')
    callbacks.onStatusChange?.('error')
    return null
  }

  const session: GuideSession = {
    setTarget: (name) => conversation.sendContextualUpdate(`The player is walking to ${name}.`),
    sendContext: (text) => conversation.sendContextualUpdate(text),
    sendText: (text) => conversation.sendUserMessage(text),
    setMicMuted: (m) => conversation.setMicMuted(m),
    setVolume: (volume) => conversation.setVolume({ volume }),
    async end() {
      callbacks.onStatusChange?.('disconnecting')
      try {
        await conversation.endSession()
      } finally {
        setVoiceMuted(false)
      }
    },
  }

  if (targetName) session.setTarget(targetName)
  return session
}
