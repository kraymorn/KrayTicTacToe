import { create } from 'zustand'
import type { AIDifficulty, GameMode, GameState, MoveHistory, Player } from '../types/game.types'
import {
  checkGameCompletion,
  getNextActiveSector,
  getSectorStatus,
  isValidMove,
} from '../utils/gameLogic'

// Функция для получения нотации хода (А1, Б2 и т.д.)
function getMoveNotation(sectorIndex: number, cellIndex: number): string {
  const letters = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И']
  const sectorRow = Math.floor(sectorIndex / 3)
  const sectorCol = sectorIndex % 3
  const cellRow = Math.floor(cellIndex / 3)
  const cellCol = cellIndex % 3

  // Глобальные координаты
  const globalRow = sectorRow * 3 + cellRow
  const globalCol = sectorCol * 3 + cellCol

  return `${letters[globalCol]}${globalRow + 1}`
}

// Функция для получения имени игрока
function getPlayerName(player: Player, gameMode: GameMode): string {
  if (gameMode === 'vsAI') {
    return player === 'X' ? 'Первый игрок' : 'ИИ'
  }
  if (gameMode === 'online') {
    return player === 'X' ? 'Игрок 1' : 'Игрок 2'
  }
  return player === 'X' ? 'Первый игрок' : 'Второй игрок'
}

// Создаем пустую доску (9 секторов, каждый по 9 ячеек)
function createEmptyBoard(): GameState['board'] {
  return Array(9)
    .fill(null)
    .map(() => Array(9).fill(null) as GameState['board'][0])
}

// Восстанавливает доску из истории ходов
function rebuildBoardFromHistory(moveHistory: MoveHistory[]): GameState['board'] {
  const board = createEmptyBoard()
  for (const move of moveHistory) {
    if (
      move.sectorIndex >= 0 &&
      move.sectorIndex < 9 &&
      move.cellIndex >= 0 &&
      move.cellIndex < 9
    ) {
      board[move.sectorIndex][move.cellIndex] = move.player
    }
  }
  return board
}

interface GameStore extends GameState {
  // Онлайн игра
  roomId: string | null
  playerId: string | null
  onlinePlayerSymbol: Player | null
  isOnlineHost: boolean | null
  lastSyncedMoveCount: number // Для отслеживания синхронизированных ходов

  makeMove: (sectorIndex: number, cellIndex: number) => void
  resetGame: () => void
  setGameMode: (mode: GameMode) => void
  setAIDifficulty: (difficulty: AIDifficulty) => void
  setActiveSector: (sectorIndex: number | null) => void

  // Онлайн методы
  setOnlineRoom: (roomId: string, playerId: string, playerSymbol: Player, isHost: boolean) => void
  clearOnlineRoom: () => void
  syncGameState: (gameState: GameState) => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Начальное состояние
  board: createEmptyBoard(),
  currentPlayer: 'X',
  activeSector: null, // null означает, что можно выбрать любой сектор (первый ход)
  sectorStatuses: Array(9).fill(null),
  gameStatus: 'playing',
  winner: null,
  gameMode: null,
  aiDifficulty: 'hard', // всегда максимальная сложность
  moveHistory: [],

  // Онлайн состояние
  roomId: null,
  playerId: null,
  onlinePlayerSymbol: null,
  isOnlineHost: null,
  lastSyncedMoveCount: 0,

  // Установка режима игры
  setGameMode: (mode: GameMode) => {
    // Если устанавливаем режим игры (не null), сбрасываем игру
    // Это происходит при первом выборе режима или при переключении между режимами
    if (mode !== null) {
      set({
        gameMode: mode,
        board: createEmptyBoard(),
        currentPlayer: 'X',
        activeSector: null,
        sectorStatuses: Array(9).fill(null),
        gameStatus: 'playing',
        winner: null,
        moveHistory: [],
      })
    } else {
      // Если возвращаемся к выбору режима, просто меняем gameMode
      set({ gameMode: mode })
    }
  },

  // Установка уровня сложности ИИ
  setAIDifficulty: (difficulty: AIDifficulty) => {
    set({ aiDifficulty: difficulty })
  },

  // Установка активного сектора
  setActiveSector: (sectorIndex: number | null) => {
    set({ activeSector: sectorIndex })
  },

  // Сброс игры
  resetGame: () => {
    const state = get()
    const newGameState = {
      board: createEmptyBoard(),
      currentPlayer: 'X' as Player,
      activeSector: null,
      sectorStatuses: Array(9).fill(null),
      gameStatus: 'playing' as const,
      winner: null,
      moveHistory: [],
      lastSyncedMoveCount: 0,
    }

    set(newGameState)

    // Для онлайн режима отправляем обновление на сервер
    if (state.gameMode === 'online' && state.roomId) {
      import('../services/onlineGameService').then(({ updateGameState }) => {
        updateGameState(state.roomId!, {
          ...newGameState,
          gameMode: 'online',
          aiDifficulty: state.aiDifficulty,
        }).catch((error) => {
          console.error('Ошибка обновления состояния на сервере:', error)
        })
      })
    }
  },

  // Установка онлайн комнаты
  setOnlineRoom: (roomId: string, playerId: string, playerSymbol: Player, isHost: boolean) => {
    set({
      roomId,
      playerId,
      onlinePlayerSymbol: playerSymbol,
      isOnlineHost: isHost,
      lastSyncedMoveCount: 0, // Сбрасываем счетчик при присоединении
    })
  },

  // Очистка онлайн комнаты
  clearOnlineRoom: () => {
    set({
      roomId: null,
      playerId: null,
      onlinePlayerSymbol: null,
      isOnlineHost: null,
    })
  },

  // Синхронизация состояния игры (для онлайн режима)
  syncGameState: (gameState: GameState | null | undefined) => {
    if (!gameState) {
      return
    }

    const state = get()

    try {
      // Валидация и нормализация данных из Firebase
      const validatedState: GameState = {
        board:
          gameState.board && Array.isArray(gameState.board) && gameState.board.length === 9
            ? gameState.board.map((sector) => {
                if (Array.isArray(sector) && sector.length === 9) {
                  // Валидируем каждую ячейку
                  return sector.map((cell) => (cell === 'X' || cell === 'O' ? cell : null))
                }
                return Array(9).fill(null)
              })
            : createEmptyBoard(),
        currentPlayer:
          gameState.currentPlayer === 'X' || gameState.currentPlayer === 'O'
            ? gameState.currentPlayer
            : 'X',
        activeSector:
          typeof gameState.activeSector === 'number' &&
          gameState.activeSector >= 0 &&
          gameState.activeSector < 9
            ? gameState.activeSector
            : gameState.activeSector === null
            ? null
            : null,
        sectorStatuses:
          gameState.sectorStatuses &&
          Array.isArray(gameState.sectorStatuses) &&
          gameState.sectorStatuses.length === 9
            ? gameState.sectorStatuses.map((status) =>
                status === 'X' || status === 'O' || status === 'draw' ? status : null,
              )
            : Array(9).fill(null),
        gameStatus:
          gameState.gameStatus === 'playing' ||
          gameState.gameStatus === 'won' ||
          gameState.gameStatus === 'draw'
            ? gameState.gameStatus
            : 'playing',
        winner: gameState.winner === 'X' || gameState.winner === 'O' ? gameState.winner : null,
        gameMode: gameState.gameMode || 'online',
        aiDifficulty: gameState.aiDifficulty || 'hard',
        moveHistory:
          gameState.moveHistory && Array.isArray(gameState.moveHistory)
            ? gameState.moveHistory.filter(
                (move) =>
                  move &&
                  typeof move === 'object' &&
                  typeof move.sectorIndex === 'number' &&
                  typeof move.cellIndex === 'number' &&
                  (move.player === 'X' || move.player === 'O'),
              )
            : [],
      }

      // Проверяем, что это не наш собственный ход (чтобы избежать двойного обновления)
      const newMoveCount = validatedState.moveHistory.length
      const currentMoveCount = state.moveHistory.length

      // Проверяем, является ли это нашим собственным ходом
      // Сравниваем последний ход по координатам и игроку, а также timestamp
      const isOurMove =
        newMoveCount === currentMoveCount &&
        currentMoveCount > 0 &&
        state.moveHistory[currentMoveCount - 1] &&
        validatedState.moveHistory[newMoveCount - 1] &&
        state.moveHistory[currentMoveCount - 1].sectorIndex ===
          validatedState.moveHistory[newMoveCount - 1].sectorIndex &&
        state.moveHistory[currentMoveCount - 1].cellIndex ===
          validatedState.moveHistory[newMoveCount - 1].cellIndex &&
        state.moveHistory[currentMoveCount - 1].player ===
          validatedState.moveHistory[newMoveCount - 1].player

      // Проверяем, является ли последний ход в новой истории ходом текущего игрока
      // Если да, и количество ходов не увеличилось, это может быть наш ход
      const lastMoveIsFromCurrentPlayer =
        newMoveCount > 0 &&
        validatedState.moveHistory[newMoveCount - 1]?.player === state.onlinePlayerSymbol

      // НЕ синхронизируем, если локальное состояние новее (больше ходов)
      // Это защищает от перезаписи нового локального состояния старым состоянием с сервера
      const localStateIsNewer = currentMoveCount > newMoveCount

      // Синхронизируем если:
      // 1. Количество ходов увеличилось (это ход противника) - ВСЕГДА синхронизируем
      // 2. Или это первая синхронизация (lastSyncedMoveCount === 0)
      // 3. Или количество ходов в новой истории больше, чем было синхронизировано
      // 4. Или состояние изменилось (например, завершение игры), но это НЕ наш ход
      // И НЕ синхронизируем, если локальное состояние новее
      const shouldSync =
        !localStateIsNewer && // Не перезаписываем, если локальное состояние новее
        (newMoveCount > currentMoveCount || // Ход противника - всегда синхронизируем
          state.lastSyncedMoveCount === 0 || // Первая синхронизация
          newMoveCount > state.lastSyncedMoveCount || // Новые ходы появились
          (!isOurMove &&
            !lastMoveIsFromCurrentPlayer &&
            (validatedState.gameStatus !== state.gameStatus ||
              JSON.stringify(validatedState.board) !== JSON.stringify(state.board))))

      if (shouldSync) {
        // Восстанавливаем доску из истории ходов, чтобы гарантировать соответствие
        const rebuiltBoard = rebuildBoardFromHistory(validatedState.moveHistory)

        // Пересчитываем статусы секторов на основе восстановленной доски
        const rebuiltSectorStatuses = rebuiltBoard.map((sector) => getSectorStatus(sector))

        // Проверяем завершение игры на основе восстановленной доски
        const gameCompletion = checkGameCompletion(rebuiltBoard)

        // ВСЕГДА синхронизируем историю ходов, чтобы она была полной
        set({
          board: rebuiltBoard, // Используем доску, восстановленную из истории
          currentPlayer: validatedState.currentPlayer,
          activeSector: validatedState.activeSector,
          sectorStatuses: rebuiltSectorStatuses, // Пересчитанные статусы
          gameStatus: gameCompletion.status, // Пересчитанный статус игры
          winner: gameCompletion.winner, // Пересчитанный победитель
          moveHistory: validatedState.moveHistory, // ВСЕГДА используем полную историю с сервера
          lastSyncedMoveCount: newMoveCount,
        })
      } else if (isOurMove && newMoveCount === currentMoveCount) {
        // Если это точно наш ход и количество ходов одинаковое, не перезаписываем состояние
        // но обновляем lastSyncedMoveCount чтобы следующая синхронизация работала правильно
        set({
          lastSyncedMoveCount: newMoveCount,
        })
      }
    } catch (error) {
      console.error('Ошибка синхронизации состояния игры:', error)
      // В случае ошибки создаем пустое состояние
      set({
        board: createEmptyBoard(),
        currentPlayer: 'X',
        activeSector: null,
        sectorStatuses: Array(9).fill(null),
        gameStatus: 'playing',
        winner: null,
        moveHistory: [],
        lastSyncedMoveCount: 0,
      })
    }
  },

  // Сделать ход
  makeMove: (sectorIndex: number, cellIndex: number) => {
    const state = get()

    // Проверяем валидность хода
    if (
      !isValidMove(sectorIndex, cellIndex, state.board, state.activeSector, state.sectorStatuses)
    ) {
      return
    }

    // Проверяем, что игра не завершена
    if (state.gameStatus !== 'playing') {
      return
    }

    // Для онлайн режима проверяем, что это ход текущего игрока
    if (state.gameMode === 'online') {
      if (state.onlinePlayerSymbol !== state.currentPlayer) {
        return // Не ваш ход
      }
    }

    // Создаем новую доску с обновленным ходом
    const newBoard = state.board.map((sector, sIdx) => {
      if (sIdx === sectorIndex) {
        return sector.map((cell, cIdx) => (cIdx === cellIndex ? state.currentPlayer : cell))
      }
      return sector
    })

    // Обновляем статусы секторов
    const newSectorStatuses = state.sectorStatuses.map((status, idx) => {
      if (idx === sectorIndex) {
        return getSectorStatus(newBoard[idx])
      }
      return status
    })

    // Проверяем завершение игры
    const gameCompletion = checkGameCompletion(newBoard)

    // Определяем следующий активный сектор
    const nextActiveSector = getNextActiveSector(cellIndex, newSectorStatuses)

    // Переключаем игрока (если игра не завершена)
    const nextPlayer = state.currentPlayer === 'X' ? 'O' : 'X'

    // Добавляем ход в историю
    const notation = getMoveNotation(sectorIndex, cellIndex)
    const playerName = getPlayerName(state.currentPlayer, state.gameMode)
    const newMove: MoveHistory = {
      sectorIndex,
      cellIndex,
      player: state.currentPlayer,
      playerName,
      notation,
      timestamp: Date.now(),
    }

    const newGameState = {
      board: newBoard,
      currentPlayer: gameCompletion.status === 'playing' ? nextPlayer : state.currentPlayer,
      activeSector: nextActiveSector,
      sectorStatuses: newSectorStatuses,
      gameStatus: gameCompletion.status,
      winner: gameCompletion.winner,
      moveHistory: [...state.moveHistory, newMove],
    }

    // Обновляем локальное состояние
    set({
      ...newGameState,
      lastSyncedMoveCount: newGameState.moveHistory.length,
    })

    // Для онлайн режима отправляем обновление на сервер
    if (state.gameMode === 'online' && state.roomId) {
      // Используем setTimeout чтобы сначала обновить локальное состояние
      setTimeout(() => {
        import('../services/onlineGameService').then(({ updateGameState }) => {
          updateGameState(state.roomId!, {
            ...newGameState,
            gameMode: 'online',
            aiDifficulty: state.aiDifficulty,
          }).catch((error) => {
            console.error('Ошибка обновления состояния на сервере:', error)
          })
        })
      }, 50)
    }
  },
}))
