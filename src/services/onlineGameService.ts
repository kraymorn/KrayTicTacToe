import { off, onValue, ref, remove, set, update } from 'firebase/database'
import { database } from '../config/firebase'
import type { GameState, Player } from '../types/game.types'

export type OnlineGameRoom = {
  roomId: string
  hostId: string
  guestId: string | null
  gameState: GameState
  createdAt: number
  lastActivity: number
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
