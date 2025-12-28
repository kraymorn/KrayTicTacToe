import type { AIDifficulty, Player, Position, Sector } from '../types/game.types'
import { checkSectorWinner, getAvailableSectors } from './gameLogic'

// Глубина поиска для Minimax - всегда максимальная
function getMaxDepth(): number {
  return 8 // Очень глубокая оценка для сильного ИИ
}

/**
 * Находит все возможные ходы в секторе
 */
function getPossibleMoves(sector: Sector): number[] {
  return sector.map((cell, index) => (cell === null ? index : -1)).filter((index) => index !== -1)
}

/**
 * Подсчитывает количество выигрышных линий, которые можно завершить одним ходом
 */
function countWinningLines(sector: Sector, player: Player): number {
  const WINNING_COMBINATIONS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // горизонтали
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // вертикали
    [0, 4, 8],
    [2, 4, 6], // диагонали
  ]

  let count = 0
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    const values = [sector[a], sector[b], sector[c]]
    const playerCount = values.filter((v) => v === player).length
    const emptyCount = values.filter((v) => v === null).length

    // Если есть 2 символа игрока и 1 пустая ячейка - это потенциальная выигрышная линия
    if (playerCount === 2 && emptyCount === 1) {
      count++
    }
  }
  return count
}

/**
 * Проверяет, создает ли ход вилку (две потенциальные выигрышные линии)
 */
function createsFork(sector: Sector, cellIndex: number, player: Player): boolean {
  const testSector = [...sector]
  testSector[cellIndex] = player
  return countWinningLines(testSector, player) >= 2
}

/**
 * Проверяет, может ли игрок выиграть глобально через форсированный путь
 * (когда у игрока есть несколько путей к победе, и противник не может заблокировать все)
 */
function canForceGlobalWin(
  sectorStatuses: (Player | 'draw' | null)[],
  player: Player,
  board: Sector[],
): boolean {
  const WINNING_COMBINATIONS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ]

  let winningPaths = 0

  for (const [a, b, c] of WINNING_COMBINATIONS) {
    let playerCount = 0
    let emptyCount = 0
    const emptySectors: number[] = []

    for (const idx of [a, b, c]) {
      if (sectorStatuses[idx] === player) playerCount++
      else if (sectorStatuses[idx] === null) {
        emptyCount++
        emptySectors.push(idx)
      }
    }

    // Если у игрока 2 сектора и 1 свободный - это выигрышный путь
    if (playerCount === 2 && emptyCount === 1) {
      // Проверяем, может ли игрок выиграть этот сектор
      const sectorToWin = emptySectors[0]
      const sector = board[sectorToWin]
      const possibleMoves = getPossibleMoves(sector)

      for (const cellIndex of possibleMoves) {
        const testSector = [...sector]
        testSector[cellIndex] = player
        if (checkSectorWinner(testSector) === player) {
          winningPaths++
          break
        }
      }
    }
  }

  // Если есть 2 или более выигрышных пути - это форсированная победа
  return winningPaths >= 2
}

/**
 * Проверяет, может ли противник форсированно выиграть через несколько ходов
 * Более глубокая проверка, чем canForceGlobalWin
 */
function canOpponentForceWin(
  board: Sector[],
  sectorStatuses: (Player | 'draw' | null)[],
  activeSector: number | null,
  player: Player,
  maxDepth: number = 2,
): boolean {
  const opponent: Player = player === 'X' ? 'O' : 'X'

  // Если противник уже может выиграть - это критично
  if (hasCriticalGlobalThreat(sectorStatuses, player)) {
    return true
  }

  // Проверяем на несколько ходов вперед
  if (maxDepth <= 0) {
    return false
  }

  // Проверяем все возможные ходы противника
  const opponentMoves = getAllPossibleMoves(board, activeSector, sectorStatuses)

  for (const oppMove of opponentMoves) {
    const oppBoard = makeMoveOnBoard(board, oppMove.sector, oppMove.cell, opponent)
    const oppSectorStatuses = updateSectorStatuses(oppBoard, sectorStatuses, oppMove.sector)
    const oppNextActiveSector = oppSectorStatuses[oppMove.cell] !== null ? null : oppMove.cell

    // Если противник может выиграть сразу - это критично
    if (checkGlobalWinner(oppSectorStatuses) === opponent) {
      return true
    }

    // Если противник может форсированно выиграть - это критично
    if (canForceGlobalWin(oppSectorStatuses, opponent, oppBoard)) {
      return true
    }

    // Проверяем, может ли противник создать двойную угрозу
    if (createsDoubleThreat(board, oppMove.sector, oppMove.cell, opponent, sectorStatuses)) {
      return true
    }

    // Рекурсивно проверяем дальше (но только если есть критическая угроза)
    if (hasCriticalGlobalThreat(oppSectorStatuses, player)) {
      // Проверяем, можем ли мы заблокировать
      const ourMoves = getAllPossibleMoves(oppBoard, oppNextActiveSector, oppSectorStatuses)
      let canBlock = false

      for (const ourMove of ourMoves) {
        const ourBoard = makeMoveOnBoard(oppBoard, ourMove.sector, ourMove.cell, player)
        const ourSectorStatuses = updateSectorStatuses(ourBoard, oppSectorStatuses, ourMove.sector)
        const ourNextActiveSector = ourSectorStatuses[ourMove.cell] !== null ? null : ourMove.cell

        // Если мы можем заблокировать - проверяем дальше
        if (
          !canOpponentForceWin(
            ourBoard,
            ourSectorStatuses,
            ourNextActiveSector,
            player,
            maxDepth - 1,
          )
        ) {
          canBlock = true
          break
        }
      }

      // Если мы не можем заблокировать - противник может форсированно выиграть
      if (!canBlock) {
        return true
      }
    }
  }

  return false
}

/**
 * Проверяет, создает ли ход двойную угрозу (две независимые угрозы выигрыша)
 */
function createsDoubleThreat(
  board: Sector[],
  sectorIndex: number,
  cellIndex: number,
  player: Player,
  sectorStatuses: (Player | 'draw' | null)[],
): boolean {
  const testBoard = makeMoveOnBoard(board, sectorIndex, cellIndex, player)
  const testSectorStatuses = updateSectorStatuses(testBoard, sectorStatuses, sectorIndex)

  // Проверяем, сколько выигрышных путей создает этот ход
  const WINNING_COMBINATIONS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ]

  let threats = 0

  for (const [a, b, c] of WINNING_COMBINATIONS) {
    let playerCount = 0
    let emptyCount = 0

    for (const idx of [a, b, c]) {
      if (testSectorStatuses[idx] === player) playerCount++
      else if (testSectorStatuses[idx] === null) emptyCount++
    }

    // Если у игрока 2 сектора и 1 свободный - это угроза
    if (playerCount === 2 && emptyCount === 1) {
      threats++
    }
  }

  return threats >= 2
}

/**
 * Оценивает стратегическую важность сектора на доске
 * Центральный сектор (4) и угловые (0, 2, 6, 8) более важны
 */
function getSectorImportance(sectorIndex: number): number {
  const centerSector = 4
  const cornerSectors = [0, 2, 6, 8]
  const edgeSectors = [1, 3, 5, 7]

  if (sectorIndex === centerSector) return 3
  if (cornerSectors.includes(sectorIndex)) return 2
  if (edgeSectors.includes(sectorIndex)) return 1
  return 1
}

/**
 * Оценивает стратегическую ценность выбора сектора для следующего хода
 * Учитывает, какой сектор станет активным после хода
 */
function evaluateNextSectorChoice(
  nextSector: number | null,
  sectorStatuses: (Player | 'draw' | null)[],
  player: Player,
  _difficulty: AIDifficulty,
  board?: Sector[],
): number {
  if (nextSector === null) {
    // Если можно выбрать любой сектор - это хорошо для стратегии
    return 80
  }

  const sectorStatus = sectorStatuses[nextSector]
  const opponent: Player = player === 'X' ? 'O' : 'X'

  // Если сектор уже выигран противником - очень плохо
  if (sectorStatus === opponent) {
    return -200
  }

  // Если сектор уже выигран нами - хорошо, но не критично
  if (sectorStatus === player) {
    return 30
  }

  // Если сектор ничья - плохо, так как мы теряем контроль
  if (sectorStatus === 'draw') {
    return -80
  }

  // Свободный сектор - оцениваем его важность и позицию
  const importance = getSectorImportance(nextSector)
  let score = importance * 25

  // Если есть информация о доске, оцениваем позицию в секторе
  if (board && board[nextSector]) {
    const sector = board[nextSector]

    // Проверяем, сколько у нас уже есть в этом секторе
    const playerCells = sector.filter((cell) => cell === player).length
    const opponentCells = sector.filter((cell) => cell === opponent).length

    // Бонус за контроль сектора
    if (playerCells > opponentCells) {
      score += (playerCells - opponentCells) * 20
    } else if (opponentCells > playerCells) {
      // Штраф за отставание в секторе
      score -= (opponentCells - playerCells) * 30
    }

    // Проверяем угрозы в секторе
    const playerWinningLines = countWinningLines(sector, player)
    const opponentWinningLines = countWinningLines(sector, opponent)

    if (playerWinningLines > 0) {
      score += playerWinningLines * 40
    }
    if (opponentWinningLines > 0) {
      score -= opponentWinningLines * 50
    }

    // Проверяем, может ли противник выиграть этот сектор в следующем ходу
    const possibleMoves = getPossibleMoves(sector)
    for (const cellIndex of possibleMoves) {
      const testSector = [...sector]
      testSector[cellIndex] = opponent
      if (checkSectorWinner(testSector) === opponent) {
        score -= 100
        break
      }
    }
  }

  return score
}

/**
 * Проверяет, есть ли критическая угроза глобальной победы противника
 * Возвращает true, если противник может выиграть в следующем ходу
 */
function hasCriticalGlobalThreat(
  sectorStatuses: (Player | 'draw' | null)[],
  player: Player,
): boolean {
  const opponent: Player = player === 'X' ? 'O' : 'X'
  const WINNING_COMBINATIONS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ]

  for (const [a, b, c] of WINNING_COMBINATIONS) {
    // Проверяем, может ли противник выиграть эту комбинацию
    let opponentCount = 0
    let emptyCount = 0

    for (const idx of [a, b, c]) {
      if (sectorStatuses[idx] === opponent) opponentCount++
      else if (sectorStatuses[idx] === null) emptyCount++
    }

    // Если у противника 2 сектора и 1 свободный - критическая угроза
    if (opponentCount === 2 && emptyCount === 1) {
      return true
    }
  }

  return false
}

/**
 * Оценивает состояние всех секторов на доске после хода
 * Учитывает угрозы противника во всех секторах
 */
function evaluateAllSectorsAfterMove(
  board: Sector[],
  sectorStatuses: (Player | 'draw' | null)[],
  player: Player,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _difficulty: AIDifficulty,
): number {
  const opponent: Player = player === 'X' ? 'O' : 'X'
  let totalThreat = 0

  // Оцениваем каждый сектор
  for (let sectorIndex = 0; sectorIndex < 9; sectorIndex++) {
    const sector = board[sectorIndex]
    const sectorStatus = sectorStatuses[sectorIndex]

    // Пропускаем уже завершенные сектора
    if (sectorStatus !== null) {
      continue
    }

    // Проверяем, может ли противник выиграть этот сектор в следующем ходу
    const possibleOpponentMoves = getPossibleMoves(sector)
    let sectorThreat = 0

    for (const cellIndex of possibleOpponentMoves) {
      const testSector = [...sector]
      testSector[cellIndex] = opponent

      if (checkSectorWinner(testSector) === opponent) {
        // Противник может выиграть этот сектор - это очень опасно
        sectorThreat = Math.max(sectorThreat, -100)
      } else if (createsFork(sector, cellIndex, opponent)) {
        // Противник может создать вилку
        sectorThreat = Math.max(sectorThreat, -40)
      } else {
        const winningLines = countWinningLines(testSector, opponent)
        if (winningLines > 0) {
          sectorThreat = Math.max(sectorThreat, -winningLines * 10)
        }
      }
    }

    // Учитываем важность сектора
    const importance = getSectorImportance(sectorIndex)
    totalThreat += sectorThreat * importance
  }

  return totalThreat
}

/**
 * Оценивает глобальную позицию на всей доске
 * Анализирует выигрышные комбинации секторов
 */
function evaluateGlobalPosition(
  sectorStatuses: (Player | 'draw' | null)[],
  player: Player,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _difficulty: AIDifficulty = 'hard',
): number {
  const opponent: Player = player === 'X' ? 'O' : 'X'
  const WINNING_COMBINATIONS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // горизонтали
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // вертикали
    [0, 4, 8],
    [2, 4, 6], // диагонали
  ]

  let score = 0

  // Проверяем каждую выигрышную комбинацию секторов
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    const statusA = sectorStatuses[a]
    const statusB = sectorStatuses[b]
    const statusC = sectorStatuses[c]

    // Если игрок уже выиграл эту комбинацию
    if (statusA === player && statusB === player && statusC === player) {
      return 10000 // Максимальная оценка за победу
    }

    // Если противник выиграл эту комбинацию
    if (statusA === opponent && statusB === opponent && statusC === opponent) {
      return -10000 // Минимальная оценка за поражение
    }

    // Подсчитываем контроль над комбинацией
    let playerControl = 0
    let opponentControl = 0
    let emptyCount = 0

    for (const idx of [a, b, c]) {
      if (sectorStatuses[idx] === player) playerControl++
      else if (sectorStatuses[idx] === opponent) opponentControl++
      else if (sectorStatuses[idx] === null) emptyCount++
    }

    // Оценка потенциальных выигрышных комбинаций
    const winBonus = 1000
    const goodPositionBonus = 100
    const criticalBlockPenalty = 1500 // Критическая блокировка
    const blockPenalty = 500 // Обычная блокировка
    const opponentAdvantagePenalty = 80

    if (playerControl === 2 && emptyCount === 1) {
      score += winBonus // Почти выиграли
    } else if (playerControl === 1 && emptyCount === 2) {
      score += goodPositionBonus // Хорошая позиция
    } else if (playerControl === 0 && emptyCount === 3) {
      // Нейтральная позиция - небольшой бонус за контроль
      score += 10
    }

    // Для сложного уровня различаем критическую и некритическую угрозу
    if (opponentControl === 2 && emptyCount === 1) {
      // Проверяем, критична ли эта угроза для глобальной победы
      const isCritical = hasCriticalGlobalThreat(sectorStatuses, player)
      score -= isCritical ? criticalBlockPenalty : blockPenalty
    } else if (opponentControl === 1 && emptyCount === 2) {
      score -= opponentAdvantagePenalty // Противник имеет преимущество
    } else if (opponentControl === 0 && emptyCount === 3) {
      // Нейтральная позиция - небольшой штраф за отсутствие контроля
      score -= 5
    }
  }

  return score
}

/**
 * Оценивает, насколько опасна позиция противника в секторе после хода
 * Возвращает отрицательное значение (чем больше по модулю, тем опаснее)
 */
function evaluateOpponentThreatAfterMove(
  sector: Sector,
  cellIndex: number,
  player: Player,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _difficulty: AIDifficulty,
): number {
  const opponent: Player = player === 'X' ? 'O' : 'X'
  const testSector = [...sector]
  testSector[cellIndex] = player

  // Проверяем, может ли противник выиграть в следующем ходу
  const possibleOpponentMoves = getPossibleMoves(testSector)
  let maxThreat = 0

  for (const oppCellIndex of possibleOpponentMoves) {
    const testSectorAfterOpp = [...testSector]
    testSectorAfterOpp[oppCellIndex] = opponent

    // Если противник может выиграть сектор - это очень опасно
    if (checkSectorWinner(testSectorAfterOpp) === opponent) {
      return -500
    }

    // Если противник может создать вилку - это опасно
    if (createsFork(testSector, oppCellIndex, opponent)) {
      maxThreat = Math.max(maxThreat, -200)
    }

    // Если противник может создать выигрышную линию - это умеренно опасно
    const winningLines = countWinningLines(testSectorAfterOpp, opponent)
    if (winningLines > 0) {
      maxThreat = Math.max(maxThreat, -winningLines * 40)
    }
  }

  return maxThreat
}

/**
 * Оценивает позицию в секторе для игрока
 * Возвращает оценку от 0 до 100 (чем выше, тем лучше)
 */
function evaluateSectorPosition(
  sector: Sector,
  cellIndex: number,
  player: Player,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _difficulty: AIDifficulty = 'hard',
): number {
  const testSector = [...sector]
  testSector[cellIndex] = player
  const opponent: Player = player === 'X' ? 'O' : 'X'

  // Если это выигрышный ход - максимальная оценка
  if (checkSectorWinner(testSector) === player) {
    return 1000
  }

  // Если блокирует выигрыш противника - очень высокая оценка
  const testSectorForOpponent = [...sector]
  testSectorForOpponent[cellIndex] = opponent
  if (checkSectorWinner(testSectorForOpponent) === opponent) {
    return 900
  }

  // Если создает вилку - высокая оценка
  if (createsFork(sector, cellIndex, player)) {
    return 400
  }

  // Если блокирует вилку противника - высокая оценка
  if (createsFork(sector, cellIndex, opponent)) {
    return 350
  }

  // Количество потенциальных выигрышных линий для игрока
  const winningLines = countWinningLines(testSector, player)
  const lineMultiplier = 50
  let score = winningLines * lineMultiplier

  // Штраф за ходы, которые дают противнику выиграть сектор
  const possibleOpponentMoves = getPossibleMoves(testSector)
  let givesOpponentWin = false
  for (const oppCellIndex of possibleOpponentMoves) {
    const testSectorAfterOpp = [...testSector]
    testSectorAfterOpp[oppCellIndex] = opponent
    if (checkSectorWinner(testSectorAfterOpp) === opponent) {
      givesOpponentWin = true
      break
    }
  }
  if (givesOpponentWin) {
    score -= 200
  }

  // Бонус за центр (более важен для сложного уровня)
  if (cellIndex === 4) {
    score += 30
  }

  // Бонус за углы (если они стратегически выгодны)
  const corners = [0, 2, 6, 8]
  if (corners.includes(cellIndex)) {
    score += 15
  }

  // Бонус за блокировку потенциальных выигрышных линий противника
  const opponentWinningLines = countWinningLines(testSector, opponent)
  if (opponentWinningLines > 0) {
    score += opponentWinningLines * 30
  }

  return score
}

/**
 * Получает все возможные ходы для текущей позиции
 */
function getAllPossibleMoves(
  board: Sector[],
  activeSector: number | null,
  sectorStatuses: (Player | 'draw' | null)[],
): Position[] {
  const availableSectors = getAvailableSectors(activeSector, sectorStatuses)
  const moves: Position[] = []

  for (const sectorIndex of availableSectors) {
    const sector = board[sectorIndex]
    const possibleMoves = getPossibleMoves(sector)
    for (const cellIndex of possibleMoves) {
      moves.push({ sector: sectorIndex, cell: cellIndex })
    }
  }

  return moves
}

/**
 * Создает копию доски с новым ходом
 */
function makeMoveOnBoard(
  board: Sector[],
  sectorIndex: number,
  cellIndex: number,
  player: Player,
): Sector[] {
  return board.map((sector, sIdx) => {
    if (sIdx === sectorIndex) {
      return sector.map((cell, cIdx) => (cIdx === cellIndex ? player : cell))
    }
    return sector
  })
}

/**
 * Обновляет статусы секторов после хода
 */
function updateSectorStatuses(
  board: Sector[],
  sectorStatuses: (Player | 'draw' | null)[],
  sectorIndex: number,
): (Player | 'draw' | null)[] {
  const newSectorStatuses = [...sectorStatuses]
  const sector = board[sectorIndex]
  const winner = checkSectorWinner(sector)
  if (winner) {
    newSectorStatuses[sectorIndex] = winner
  } else if (sector.every((cell) => cell !== null)) {
    newSectorStatuses[sectorIndex] = 'draw'
  }
  return newSectorStatuses
}

/**
 * Проверяет глобальную победу на основе статусов секторов
 */
function checkGlobalWinner(sectorStatuses: (Player | 'draw' | null)[]): Player | null {
  const WINNING_COMBINATIONS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // горизонтали
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // вертикали
    [0, 4, 8],
    [2, 4, 6], // диагонали
  ]

  for (const [a, b, c] of WINNING_COMBINATIONS) {
    const statusA = sectorStatuses[a]
    const statusB = sectorStatuses[b]
    const statusC = sectorStatuses[c]

    if (statusA && statusA === statusB && statusB === statusC && statusA !== 'draw') {
      return statusA as Player
    }
  }

  return null
}

/**
 * Минимакс алгоритм с альфа-бета отсечением
 */
function minimax(
  board: Sector[],
  activeSector: number | null,
  sectorStatuses: (Player | 'draw' | null)[],
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean,
  aiPlayer: Player,
  maxDepth: number,
): number {
  // Проверяем терминальные состояния
  const gameWinner = checkGlobalWinner(sectorStatuses)
  if (gameWinner === aiPlayer) {
    return 10000 - depth // Предпочитаем быстрые победы
  }
  const opponent: Player = aiPlayer === 'X' ? 'O' : 'X'
  if (gameWinner === opponent) {
    return -10000 + depth // Предпочитаем медленные поражения
  }

  // Если достигли максимальной глубины или нет доступных ходов
  if (depth === 0) {
    // Определяем уровень сложности на основе maxDepth
    const difficulty: AIDifficulty = maxDepth <= 2 ? 'easy' : maxDepth <= 4 ? 'medium' : 'hard'
    return evaluateGlobalPosition(sectorStatuses, aiPlayer, difficulty)
  }

  const moves = getAllPossibleMoves(board, activeSector, sectorStatuses)
  if (moves.length === 0) {
    // Определяем уровень сложности на основе maxDepth
    const difficulty: AIDifficulty = maxDepth <= 2 ? 'easy' : maxDepth <= 4 ? 'medium' : 'hard'
    return evaluateGlobalPosition(sectorStatuses, aiPlayer, difficulty)
  }

  if (maximizingPlayer) {
    let maxEval = -Infinity
    for (const move of moves) {
      const newBoard = makeMoveOnBoard(board, move.sector, move.cell, aiPlayer)
      const newSectorStatuses = updateSectorStatuses(newBoard, sectorStatuses, move.sector)
      const nextActiveSector = sectorStatuses[move.cell] !== null ? null : move.cell

      const evaluation = minimax(
        newBoard,
        nextActiveSector,
        newSectorStatuses,
        depth - 1,
        alpha,
        beta,
        false,
        aiPlayer,
        maxDepth,
      )

      maxEval = Math.max(maxEval, evaluation)
      alpha = Math.max(alpha, evaluation)
      if (beta <= alpha) {
        break // Альфа-бета отсечение
      }
    }
    return maxEval
  } else {
    let minEval = Infinity
    for (const move of moves) {
      const newBoard = makeMoveOnBoard(board, move.sector, move.cell, opponent)
      const newSectorStatuses = updateSectorStatuses(newBoard, sectorStatuses, move.sector)
      const nextActiveSector = sectorStatuses[move.cell] !== null ? null : move.cell

      const evaluation = minimax(
        newBoard,
        nextActiveSector,
        newSectorStatuses,
        depth - 1,
        alpha,
        beta,
        true,
        aiPlayer,
        maxDepth,
      )

      minEval = Math.min(minEval, evaluation)
      beta = Math.min(beta, evaluation)
      if (beta <= alpha) {
        break // Альфа-бета отсечение
      }
    }
    return minEval
  }
}

/**
 * Выбирает оптимальный ход для ИИ с использованием Minimax
 */
export function getAIMove(
  board: Sector[],
  activeSector: number | null,
  sectorStatuses: (Player | 'draw' | null)[],
  aiPlayer: Player,
  difficulty: AIDifficulty = 'hard',
): Position | null {
  const MAX_DEPTH = getMaxDepth()
  const availableSectors = getAvailableSectors(activeSector, sectorStatuses)
  const opponent: Player = aiPlayer === 'X' ? 'O' : 'X'

  // Приоритет 0: Выиграть игру глобально (форсированная победа)
  const allMovesForWin = getAllPossibleMoves(board, activeSector, sectorStatuses)
  for (const move of allMovesForWin) {
    const testBoard = makeMoveOnBoard(board, move.sector, move.cell, aiPlayer)
    const testSectorStatuses = updateSectorStatuses(testBoard, sectorStatuses, move.sector)

    // Проверяем, можем ли мы выиграть глобально после этого хода
    if (checkGlobalWinner(testSectorStatuses) === aiPlayer) {
      return move
    }

    // Проверяем, создает ли этот ход форсированную победу
    if (canForceGlobalWin(testSectorStatuses, aiPlayer, testBoard)) {
      return move
    }

    // Проверяем, создает ли этот ход двойную угрозу
    if (createsDoubleThreat(board, move.sector, move.cell, aiPlayer, sectorStatuses)) {
      return move
    }
  }

  // Приоритет 1: Выиграть в секторе (завершить линию из 2 своих символов)
  // Сначала собираем все выигрышные ходы и выбираем лучший
  const winningMoves: Array<{ move: Position; score: number }> = []
  for (const sectorIndex of availableSectors) {
    const sector = board[sectorIndex]
    const possibleMoves = getPossibleMoves(sector)

    for (const cellIndex of possibleMoves) {
      const testSector = [...sector]
      testSector[cellIndex] = aiPlayer
      if (checkSectorWinner(testSector) === aiPlayer) {
        // Проверяем, не даст ли это противнику выиграть глобально
        const testBoard = makeMoveOnBoard(board, sectorIndex, cellIndex, aiPlayer)
        const testSectorStatuses = updateSectorStatuses(testBoard, sectorStatuses, sectorIndex)
        const nextActiveSector = testSectorStatuses[cellIndex] !== null ? null : cellIndex

        // Проверяем, может ли противник выиграть после нашего хода
        const opponentMoves = getAllPossibleMoves(testBoard, nextActiveSector, testSectorStatuses)
        let givesOpponentWin = false
        for (const oppMove of opponentMoves) {
          const oppBoard = makeMoveOnBoard(testBoard, oppMove.sector, oppMove.cell, opponent)
          const oppSectorStatuses = updateSectorStatuses(
            oppBoard,
            testSectorStatuses,
            oppMove.sector,
          )
          if (checkGlobalWinner(oppSectorStatuses) === opponent) {
            givesOpponentWin = true
            break
          }
        }

        // Если это не дает противнику выиграть - добавляем в список
        if (!givesOpponentWin) {
          // Оцениваем стратегическую ценность этого хода
          const nextSectorScore = evaluateNextSectorChoice(
            nextActiveSector,
            testSectorStatuses,
            aiPlayer,
            difficulty,
            testBoard,
          )
          const globalScore = evaluateGlobalPosition(testSectorStatuses, aiPlayer, difficulty)
          const moveScore = globalScore + nextSectorScore * 0.2
          winningMoves.push({ move: { sector: sectorIndex, cell: cellIndex }, score: moveScore })
        }
      }
    }
  }

  // Если есть выигрышные ходы - выбираем лучший
  if (winningMoves.length > 0) {
    winningMoves.sort((a, b) => b.score - a.score)
    return winningMoves[0].move
  }

  // Приоритет 2: Блокировать победу противника в секторе
  const blockingMoves: Position[] = []
  for (const sectorIndex of availableSectors) {
    const sector = board[sectorIndex]
    const possibleMoves = getPossibleMoves(sector)

    for (const cellIndex of possibleMoves) {
      const testSector = [...sector]
      testSector[cellIndex] = opponent
      if (checkSectorWinner(testSector) === opponent) {
        blockingMoves.push({ sector: sectorIndex, cell: cellIndex })
      }
    }
  }

  // Приоритет 2.3: КРИТИЧЕСКИ ВАЖНО - Блокировать выигрыш сектора, который приведет к глобальной победе
  // Проверяем, может ли противник выиграть сектор, который критичен для глобальной победы
  const criticalSectorBlockingMoves: Position[] = []
  const WINNING_COMBINATIONS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ]

  for (const blockingMove of blockingMoves) {
    // Симулируем, что противник выиграл этот сектор
    const testSectorStatuses = [...sectorStatuses]
    testSectorStatuses[blockingMove.sector] = opponent

    // Проверяем, приведет ли это к критической угрозе глобальной победы
    for (const [a, b, c] of WINNING_COMBINATIONS) {
      if ([a, b, c].includes(blockingMove.sector)) {
        let opponentCount = 0
        let emptyCount = 0
        let playerCount = 0

        for (const idx of [a, b, c]) {
          if (testSectorStatuses[idx] === opponent) opponentCount++
          else if (testSectorStatuses[idx] === aiPlayer) playerCount++
          else if (testSectorStatuses[idx] === null) emptyCount++
        }

        // Если после выигрыша этого сектора у противника будет 2 из 3 в комбинации
        // и останется только 1 свободный - это критическая угроза!
        if (opponentCount === 2 && emptyCount === 1) {
          criticalSectorBlockingMoves.push(blockingMove)
          break
        }

        // Также критично, если у противника будет 1 сектор, а у нас 0, и 2 свободных
        // Это создает опасную ситуацию, которую нужно блокировать
        if (opponentCount === 1 && playerCount === 0 && emptyCount === 2) {
          // Проверяем, может ли противник выиграть оставшиеся сектора
          // Если да, то это тоже критическая угроза
          const remainingSectors = [a, b, c].filter((idx) => testSectorStatuses[idx] === null)
          if (remainingSectors.length === 2) {
            // Проверяем, может ли противник выиграть оба оставшихся сектора
            // Это сложная проверка, но для упрощения считаем это критичным
            criticalSectorBlockingMoves.push(blockingMove)
            break
          }
        }
      }
    }
  }

  // Если есть критическая блокировка сектора - используем её в первую очередь
  if (criticalSectorBlockingMoves.length > 0) {
    // Выбираем лучший блокирующий ход (который блокирует наиболее критичную угрозу)
    let bestCriticalMove: Position | null = null
    let bestCriticalScore = -Infinity

    for (const criticalMove of criticalSectorBlockingMoves) {
      const newBoard = makeMoveOnBoard(board, criticalMove.sector, criticalMove.cell, aiPlayer)
      const newSectorStatuses = updateSectorStatuses(newBoard, sectorStatuses, criticalMove.sector)
      const nextActiveSector =
        newSectorStatuses[criticalMove.cell] !== null ? null : criticalMove.cell

      // Оцениваем позицию после блокировки
      const globalScore = evaluateGlobalPosition(newSectorStatuses, aiPlayer, difficulty)
      const nextSectorScore = evaluateNextSectorChoice(
        nextActiveSector,
        newSectorStatuses,
        aiPlayer,
        difficulty,
        newBoard,
      )

      const totalScore = globalScore + nextSectorScore * 0.25

      if (totalScore > bestCriticalScore) {
        bestCriticalScore = totalScore
        bestCriticalMove = criticalMove
      }
    }

    if (bestCriticalMove) {
      return bestCriticalMove
    }

    // Fallback на первый критический ход
    return criticalSectorBlockingMoves[0]
  }

  // Приоритет 2.5: КРИТИЧЕСКИ ВАЖНО - Блокировать глобальную победу противника
  // Проверяем, может ли противник выиграть игру в следующем ходу или форсированно
  const globalBlockingMoves: Position[] = []
  const allMoves = getAllPossibleMoves(board, activeSector, sectorStatuses)

  // Сначала проверяем текущую позицию - может ли противник уже форсированно выиграть?
  const currentThreat = canOpponentForceWin(board, sectorStatuses, activeSector, aiPlayer, 2)

  for (const move of allMoves) {
    // Симулируем ход ИИ
    const testBoard = makeMoveOnBoard(board, move.sector, move.cell, aiPlayer)
    const testSectorStatuses = updateSectorStatuses(testBoard, sectorStatuses, move.sector)
    const testNextActiveSector = testSectorStatuses[move.cell] !== null ? null : move.cell

    // Проверяем, блокирует ли этот ход угрозу противника
    const stillThreatened = canOpponentForceWin(
      testBoard,
      testSectorStatuses,
      testNextActiveSector,
      aiPlayer,
      2,
    )

    // Если есть текущая угроза и этот ход её блокирует - добавляем
    if (currentThreat && !stillThreatened) {
      globalBlockingMoves.push(move)
      continue
    }

    // Проверяем все возможные ходы противника после нашего хода
    const opponentMoves = getAllPossibleMoves(testBoard, testNextActiveSector, testSectorStatuses)
    let opponentCanWin = false
    let opponentCanForceWin = false

    for (const oppMove of opponentMoves) {
      const oppBoard = makeMoveOnBoard(testBoard, oppMove.sector, oppMove.cell, opponent)
      const oppSectorStatuses = updateSectorStatuses(oppBoard, testSectorStatuses, oppMove.sector)

      // Если противник может выиграть игру - это критическая угроза!
      if (checkGlobalWinner(oppSectorStatuses) === opponent) {
        opponentCanWin = true
        break
      }

      // Проверяем, может ли противник форсированно выиграть
      if (canForceGlobalWin(oppSectorStatuses, opponent, oppBoard)) {
        opponentCanForceWin = true
        break
      }

      // Проверяем, создает ли ход противника двойную угрозу
      if (
        createsDoubleThreat(testBoard, oppMove.sector, oppMove.cell, opponent, testSectorStatuses)
      ) {
        opponentCanForceWin = true
        break
      }
    }

    // Если противник может выиграть или форсированно выиграть - это критическая угроза!
    if (opponentCanWin || opponentCanForceWin) {
      globalBlockingMoves.push(move)
    }
  }

  // Если есть ходы, которые блокируют глобальную победу - используем их в первую очередь
  if (globalBlockingMoves.length > 0) {
    // Выбираем лучший блокирующий ход (который дает нам лучшую позицию)
    let bestBlockingMove: Position | null = null
    let bestBlockingScore = -Infinity

    for (const blockingMove of globalBlockingMoves) {
      const newBoard = makeMoveOnBoard(board, blockingMove.sector, blockingMove.cell, aiPlayer)
      const newSectorStatuses = updateSectorStatuses(newBoard, sectorStatuses, blockingMove.sector)
      const nextActiveSector =
        newSectorStatuses[blockingMove.cell] !== null ? null : blockingMove.cell

      // Оцениваем позицию после блокировки
      const globalScore = evaluateGlobalPosition(newSectorStatuses, aiPlayer, difficulty)
      const nextSectorScore = evaluateNextSectorChoice(
        nextActiveSector,
        newSectorStatuses,
        aiPlayer,
        difficulty,
        newBoard,
      )

      // Бонус за блокировку критической угрозы
      const blockingBonus = 2000

      // Штраф за ходы, которые дают противнику выиграть сектор
      const sector = board[blockingMove.sector]
      const testSector = [...sector]
      testSector[blockingMove.cell] = aiPlayer
      const possibleOpponentMoves = getPossibleMoves(testSector)
      let givesOpponentSectorWin = false
      for (const oppCellIndex of possibleOpponentMoves) {
        const testSectorAfterOpp = [...testSector]
        testSectorAfterOpp[oppCellIndex] = opponent
        if (checkSectorWinner(testSectorAfterOpp) === opponent) {
          givesOpponentSectorWin = true
          break
        }
      }
      const dangerPenalty = givesOpponentSectorWin ? -500 : 0

      const totalScore = globalScore + nextSectorScore * 0.25 + blockingBonus + dangerPenalty

      if (totalScore > bestBlockingScore) {
        bestBlockingScore = totalScore
        bestBlockingMove = blockingMove
      }
    }

    if (bestBlockingMove) {
      return bestBlockingMove
    }
  }

  // Приоритет 2.4: Блокировать вилки противника (когда противник может создать две угрозы)
  const forkBlockingMoves: Position[] = []
  for (const sectorIndex of availableSectors) {
    const sector = board[sectorIndex]
    const possibleMoves = getPossibleMoves(sector)

    for (const cellIndex of possibleMoves) {
      // Проверяем, может ли противник создать вилку, если мы не заблокируем эту ячейку
      const testSector = [...sector]
      testSector[cellIndex] = opponent
      if (createsFork(sector, cellIndex, opponent)) {
        forkBlockingMoves.push({ sector: sectorIndex, cell: cellIndex })
      }
    }
  }

  // Если есть вилки противника, которые нужно блокировать - делаем это
  // Для всех уровней сложности, но с разной приоритетностью
  if (forkBlockingMoves.length > 0) {
    // Выбираем лучшую блокировку вилки
    let bestForkBlock: Position | null = null
    let bestForkScore = -Infinity

    for (const forkBlock of forkBlockingMoves) {
      const newBoard = makeMoveOnBoard(board, forkBlock.sector, forkBlock.cell, aiPlayer)
      const newSectorStatuses = updateSectorStatuses(newBoard, sectorStatuses, forkBlock.sector)
      const nextActiveSector = newSectorStatuses[forkBlock.cell] !== null ? null : forkBlock.cell

      const globalScore = evaluateGlobalPosition(newSectorStatuses, aiPlayer, difficulty)
      const nextSectorScore = evaluateNextSectorChoice(
        nextActiveSector,
        newSectorStatuses,
        aiPlayer,
        difficulty,
        newBoard,
      )

      const forkBlockBonus = 400
      const totalScore = globalScore + nextSectorScore * 0.25 + forkBlockBonus // Бонус за блокировку вилки

      if (totalScore > bestForkScore) {
        bestForkScore = totalScore
        bestForkBlock = forkBlock
      }
    }

    if (bestForkBlock) {
      return bestForkBlock
    }
  }

  // Приоритет 2.6: Блокировать победу противника в секторе
  // ВАЖНО: Блокировка сектора может быть критична, если этот сектор важен для глобальной победы
  if (blockingMoves.length > 0) {
    // Проверяем, есть ли критическая угроза глобальной победы
    const hasCriticalThreat = hasCriticalGlobalThreat(sectorStatuses, aiPlayer)

    // Для всех уровней сложности: если есть критическая угроза глобальной победы,
    // блокируем выигрышные ходы в секторах, которые могут привести к глобальной победе
    if (hasCriticalThreat) {
      // Находим блокирующие ходы в критических секторах
      const criticalBlockingMoves: Position[] = []
      const WINNING_COMBINATIONS = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
      ]

      for (const blockingMove of blockingMoves) {
        // Проверяем, находится ли этот сектор в критической комбинации
        for (const [a, b, c] of WINNING_COMBINATIONS) {
          if ([a, b, c].includes(blockingMove.sector)) {
            const opponent: Player = aiPlayer === 'X' ? 'O' : 'X'
            let opponentCount = 0
            let emptyCount = 0

            for (const idx of [a, b, c]) {
              if (sectorStatuses[idx] === opponent) opponentCount++
              else if (sectorStatuses[idx] === null && idx !== blockingMove.sector) emptyCount++
            }

            // Если этот сектор критичен для глобальной победы противника
            if (opponentCount === 2 && emptyCount === 0) {
              criticalBlockingMoves.push(blockingMove)
              break
            }
          }
        }
      }

      // Если есть критическая блокировка - используем её
      if (criticalBlockingMoves.length > 0) {
        return criticalBlockingMoves[0]
      }
    }

    // Для сложного и среднего уровня: оцениваем стратегическую ценность блокировки
    // Всегда оцениваем стратегическую ценность блокировки
    {
      let bestBlockingMove: Position | null = null
      let bestBlockingScore = -Infinity

      for (const blockingMove of blockingMoves) {
        const newBoard = makeMoveOnBoard(board, blockingMove.sector, blockingMove.cell, aiPlayer)
        const newSectorStatuses = updateSectorStatuses(
          newBoard,
          sectorStatuses,
          blockingMove.sector,
        )
        const nextActiveSector =
          newSectorStatuses[blockingMove.cell] !== null ? null : blockingMove.cell

        // Оцениваем стратегическую ценность следующего сектора
        const nextSectorScore = evaluateNextSectorChoice(
          nextActiveSector,
          newSectorStatuses,
          aiPlayer,
          difficulty,
          newBoard,
        )

        // Оцениваем глобальную позицию
        const globalScore = evaluateGlobalPosition(newSectorStatuses, aiPlayer, difficulty)

        // Бонус за блокировку
        const blockingBonus = 500

        const totalScore = nextSectorScore + globalScore * 0.15 + blockingBonus

        if (totalScore > bestBlockingScore) {
          bestBlockingScore = totalScore
          bestBlockingMove = blockingMove
        }
      }

      // Если блокировка дает приемлемую позицию - используем её
      const threshold = -100
      if (bestBlockingScore > threshold && bestBlockingMove) {
        return bestBlockingMove
      }
    }
  }

  // Для легкого уровня иногда делаем случайный ход
  // Случайные ходы отключены для максимальной сложности

  // Приоритет 2.5: Исключаем ходы, которые дают противнику выиграть сектор
  // (кроме случаев, когда это единственный вариант или критично для блокировки)
  const moves = getAllPossibleMoves(board, activeSector, sectorStatuses)
  const safeMoves: Position[] = []
  const dangerousMoves: Position[] = []

  for (const move of moves) {
    const sector = board[move.sector]
    const testSector = [...sector]
    testSector[move.cell] = aiPlayer

    // Проверяем, может ли противник выиграть этот сектор после нашего хода
    const possibleOpponentMoves = getPossibleMoves(testSector)
    let givesOpponentWin = false

    for (const oppCellIndex of possibleOpponentMoves) {
      const testSectorAfterOpp = [...testSector]
      testSectorAfterOpp[oppCellIndex] = opponent
      if (checkSectorWinner(testSectorAfterOpp) === opponent) {
        givesOpponentWin = true
        break
      }
    }

    if (givesOpponentWin) {
      dangerousMoves.push(move)
    } else {
      safeMoves.push(move)
    }
  }

  // Используем только безопасные ходы, если они есть
  // Опасные ходы используем только если нет безопасных или это критично
  const movesToConsider = safeMoves.length > 0 ? safeMoves : dangerousMoves

  // Приоритет 2.7: Создавать собственные угрозы (выигрышные линии в секторах)
  // Это важно для активной игры
  const threatCreatingMoves: Array<{ move: Position; score: number }> = []
  for (const move of movesToConsider) {
    const sector = board[move.sector]
    const testSector = [...sector]
    testSector[move.cell] = aiPlayer

    // Проверяем, создает ли этот ход выигрышную линию
    const winningLines = countWinningLines(testSector, aiPlayer)
    if (winningLines > 0) {
      const newBoard = makeMoveOnBoard(board, move.sector, move.cell, aiPlayer)
      const newSectorStatuses = updateSectorStatuses(newBoard, sectorStatuses, move.sector)
      const nextActiveSector = newSectorStatuses[move.cell] !== null ? null : move.cell

      const globalScore = evaluateGlobalPosition(newSectorStatuses, aiPlayer, difficulty)
      const nextSectorScore = evaluateNextSectorChoice(
        nextActiveSector,
        newSectorStatuses,
        aiPlayer,
        difficulty,
        newBoard,
      )

      // Бонус за создание угрозы
      const threatBonus = winningLines * 150
      const importance = getSectorImportance(move.sector)

      const threatScore = globalScore * 0.1 + nextSectorScore * 0.2 + threatBonus * importance

      threatCreatingMoves.push({ move, score: threatScore })
    }
  }

  // Если есть ходы, создающие угрозы, и мы не в критической ситуации - используем лучший
  if (threatCreatingMoves.length > 0 && !hasCriticalGlobalThreat(sectorStatuses, aiPlayer)) {
    threatCreatingMoves.sort((a, b) => b.score - a.score)
    const bestThreatMove = threatCreatingMoves[0]
    // Используем ход, создающий угрозу, если он достаточно хорош
    if (bestThreatMove.score > 100) {
      return bestThreatMove.move
    }
  }

  // Приоритет 3: Используем Minimax для глубокого анализа
  let bestMove: Position | null = null
  let bestScore = -Infinity

  // Сортируем ходы по эвристической оценке для лучшего альфа-бета отсечения
  const movesWithScores = movesToConsider.map((move) => {
    const sector = board[move.sector]
    const sectorScore = evaluateSectorPosition(sector, move.cell, aiPlayer, difficulty)
    const importance = getSectorImportance(move.sector)

    // Оцениваем угрозу противника в этом секторе после нашего хода
    const opponentThreat = evaluateOpponentThreatAfterMove(sector, move.cell, aiPlayer, difficulty)

    // Дополнительный штраф за опасные ходы (которые дают противнику выиграть сектор)
    const isDangerous = dangerousMoves.some(
      (dm) => dm.sector === move.sector && dm.cell === move.cell,
    )
    const dangerPenalty = isDangerous ? -1000 : 0

    // Для сложного уровня учитываем стратегическую ценность следующего сектора
    const newBoard = makeMoveOnBoard(board, move.sector, move.cell, aiPlayer)
    const newSectorStatuses = updateSectorStatuses(newBoard, sectorStatuses, move.sector)
    const nextActiveSector = newSectorStatuses[move.cell] !== null ? null : move.cell
    const nextSectorScore = evaluateNextSectorChoice(
      nextActiveSector,
      newSectorStatuses,
      aiPlayer,
      difficulty,
      newBoard,
    )

    // Оцениваем угрозы противника во всех секторах после нашего хода
    const allSectorsThreat = evaluateAllSectorsAfterMove(
      newBoard,
      newSectorStatuses,
      aiPlayer,
      difficulty,
    )

    // Комбинированная оценка: позиция в секторе - угроза противника + стратегия - штраф за опасность
    const heuristicScore =
      sectorScore * importance +
      opponentThreat * 1.5 +
      nextSectorScore * 1.0 +
      allSectorsThreat * 0.3 +
      dangerPenalty

    return {
      move,
      heuristicScore,
    }
  })

  movesWithScores.sort((a, b) => b.heuristicScore - a.heuristicScore)

  for (const { move } of movesWithScores) {
    const newBoard = makeMoveOnBoard(board, move.sector, move.cell, aiPlayer)
    const newSectorStatuses = updateSectorStatuses(newBoard, sectorStatuses, move.sector)
    const nextActiveSector = newSectorStatuses[move.cell] !== null ? null : move.cell

    // Проверяем, не даст ли этот ход противнику легкую победу (глобальную)
    let givesOpponentGlobalWin = false
    const opponentMoves = getAllPossibleMoves(newBoard, nextActiveSector, newSectorStatuses)
    for (const oppMove of opponentMoves) {
      const testBoard = makeMoveOnBoard(newBoard, oppMove.sector, oppMove.cell, opponent)
      const testSectorStatuses = updateSectorStatuses(testBoard, newSectorStatuses, oppMove.sector)
      if (checkGlobalWinner(testSectorStatuses) === opponent) {
        givesOpponentGlobalWin = true
        break
      }
    }

    if (givesOpponentGlobalWin) {
      continue
    }

    // Проверяем, не дает ли ход противнику выиграть сектор
    // (это уже проверено выше, но для надежности проверяем еще раз)
    const sector = board[move.sector]
    const testSector = [...sector]
    testSector[move.cell] = aiPlayer
    const possibleOpponentMoves = getPossibleMoves(testSector)
    let givesOpponentSectorWin = false

    for (const oppCellIndex of possibleOpponentMoves) {
      const testSectorAfterOpp = [...testSector]
      testSectorAfterOpp[oppCellIndex] = opponent
      if (checkSectorWinner(testSectorAfterOpp) === opponent) {
        givesOpponentSectorWin = true
        break
      }
    }

    // Если ход дает противнику выиграть сектор, и есть безопасные альтернативы - пропускаем
    // Но если это единственный вариант или критично для блокировки - используем
    if (givesOpponentSectorWin && safeMoves.length > 0) {
      // Пропускаем опасный ход, если есть безопасные альтернативы
      continue
    }

    const score = minimax(
      newBoard,
      nextActiveSector,
      newSectorStatuses,
      MAX_DEPTH - 1,
      -Infinity,
      Infinity,
      false,
      aiPlayer,
      MAX_DEPTH,
    )

    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  // Если нашли стратегический ход
  if (bestMove) {
    return bestMove
  }

  // Приоритет 4: Случайный валидный ход (fallback)
  // Предпочитаем безопасные ходы
  if (safeMoves.length > 0) {
    return safeMoves[Math.floor(Math.random() * safeMoves.length)]
  }
  if (moves.length > 0) {
    return moves[Math.floor(Math.random() * moves.length)]
  }

  return null
}
