import { off, onValue, push, ref, remove, set, update } from 'firebase/database'
import { database } from '../config/firebase'
import type { GameState, Player, Reaction, ReactionType } from '../types/game.types'

// Экспортируем типы для использования в других компонентах
export type { Reaction, ReactionType }

export type OnlineGameRoom = {
  roomId: string
  hostId: string
  guestId: string | null
  gameState: GameState
  createdAt: number
  lastActivity: number
  reactions?: Record<string, Reaction>
}

export type OnlinePlayer = {
  playerId: string
  playerSymbol: Player
  isHost: boolean
}

// Генерация уникального ID комнаты
export function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 9).toUpperCase()
}

// Создание новой комнаты
export async function createRoom(roomId: string, playerId: string): Promise<void> {
  const roomRef = ref(database, `rooms/${roomId}`)

  const initialGameState: GameState = {
    board: Array(9)
      .fill(null)
      .map(() => Array(9).fill(null)),
    currentPlayer: 'X',
    activeSector: null,
    sectorStatuses: Array(9).fill(null),
    gameStatus: 'playing',
    winner: null,
    gameMode: 'online',
    aiDifficulty: 'hard',
    moveHistory: [],
  }

  const now = Date.now()
  await set(roomRef, {
    roomId,
    hostId: playerId,
    guestId: null,
    gameState: initialGameState,
    createdAt: now,
    lastActivity: now,
  })
}

// Присоединение к комнате
export async function joinRoom(roomId: string, playerId: string): Promise<boolean> {
  const roomRef = ref(database, `rooms/${roomId}`)

  return new Promise((resolve, reject) => {
    onValue(
      roomRef,
      (snapshot) => {
        const room = snapshot.val()

        if (!room) {
          reject(new Error('Комната не найдена'))
          return
        }

        if (room.guestId && room.guestId !== playerId) {
          reject(new Error('Комната уже заполнена'))
          return
        }

        // Если гость уже присоединился, просто подтверждаем
        if (room.guestId === playerId) {
          resolve(true)
          return
        }

        // Добавляем гостя
        update(roomRef, {
          guestId: playerId,
          lastActivity: Date.now(),
        })
          .then(() => resolve(true))
          .catch(reject)
      },
      { onlyOnce: true },
    )
  })
}

// Подписка на изменения в комнате
export function subscribeToRoom(
  roomId: string,
  callback: (room: OnlineGameRoom | null) => void,
): () => void {
  const roomRef = ref(database, `rooms/${roomId}`)

  const unsubscribe = onValue(roomRef, (snapshot) => {
    const room = snapshot.val()
    callback(room)
  })

  return () => {
    off(roomRef)
    unsubscribe()
  }
}

// Обновление состояния игры
export async function updateGameState(roomId: string, gameState: GameState): Promise<void> {
  const roomRef = ref(database, `rooms/${roomId}`)
  await update(roomRef, {
    gameState,
    lastActivity: Date.now(),
  })
}

// Получение информации об игроке в комнате
export function getPlayerInfo(room: OnlineGameRoom, playerId: string): OnlinePlayer | null {
  if (!room) return null

  const isHost = room.hostId === playerId
  const isGuest = room.guestId === playerId

  if (!isHost && !isGuest) return null

  // Хост всегда играет за X, гость за O
  return {
    playerId,
    playerSymbol: isHost ? 'X' : 'O',
    isHost,
  }
}

// Удаление комнаты
export async function deleteRoom(roomId: string): Promise<void> {
  const roomRef = ref(database, `rooms/${roomId}`)
  await remove(roomRef)
}

// Генерация уникального ID игрока
export function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Константы реакций
export const REACTIONS: Record<ReactionType, { emoji: string; text: string }> = {
  great: { emoji: '👍', text: 'Отличный ход' },
  bad: { emoji: '👎', text: 'Плохой ход' },
  fire: { emoji: '🔥', text: 'Огонёк' },
  heart: { emoji: '❤️', text: 'Сердечко' },
  sleep: { emoji: '😴', text: 'Уснул ZzzZz' },
  angry: { emoji: '😠', text: 'Ругань' },
}

// Отправка реакции оппоненту
export async function sendReaction(
  roomId: string,
  playerId: string,
  reactionType: ReactionType,
  playerSymbol: Player,
): Promise<void> {
  const reactionsRef = ref(database, `rooms/${roomId}/reactions`)
  const reaction: Reaction = {
    type: reactionType,
    emoji: REACTIONS[reactionType].emoji,
    text: REACTIONS[reactionType].text,
    timestamp: Date.now(),
    fromPlayerId: playerId,
    fromPlayerSymbol: playerSymbol,
  }
  await push(reactionsRef, reaction)
}

// Подписка на реакции в комнате
export function subscribeToReactions(
  roomId: string,
  callback: (reactions: Reaction[]) => void,
): () => void {
  const reactionsRef = ref(database, `rooms/${roomId}/reactions`)

  const unsubscribe = onValue(reactionsRef, (snapshot) => {
    const reactionsData = snapshot.val()
    if (!reactionsData) {
      callback([])
      return
    }

    // Преобразуем объект в массив и сортируем по времени
    const reactions: Reaction[] = Object.values(reactionsData)
      .filter((r): r is Reaction => r !== null)
      .sort((a, b) => b.timestamp - a.timestamp) // Новые сначала

    callback(reactions)
  })

  return () => {
    off(reactionsRef)
    unsubscribe()
  }
}
