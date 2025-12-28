import type { GameStatus, Player, Sector, SectorStatus } from '../types/game.types'

// Выигрышные комбинации (индексы ячеек в секторе 3x3)
const WINNING_COMBINATIONS = [
  [0, 1, 2], // горизонталь верхняя
  [3, 4, 5], // горизонталь средняя
  [6, 7, 8], // горизонталь нижняя
  [0, 3, 6], // вертикаль левая
  [1, 4, 7], // вертикаль средняя
  [2, 5, 8], // вертикаль правая
  [0, 4, 8], // диагональ главная
  [2, 4, 6], // диагональ побочная
]

/**
 * Проверяет, есть ли победа в секторе (3 подряд)
 * @param sector - сектор для проверки
 * @returns игрок-победитель или null
 */
export function checkSectorWinner(sector: Sector): Player | null {
  for (const combination of WINNING_COMBINATIONS) {
    const [a, b, c] = combination
    if (sector[a] && sector[a] === sector[b] && sector[b] === sector[c]) {
      return sector[a] as Player
    }
  }
  return null
}

/**
 * Проверяет, заполнен ли сектор (все ячейки заняты)
 * @param sector - сектор для проверки
 * @returns true если все ячейки заняты
 */
export function isSectorFull(sector: Sector): boolean {
  return sector.every((cell) => cell !== null)
}

/**
 * Проверяет ничью в секторе (все поля заполнены, но нет победителя)
 * @param sector - сектор для проверки
 * @returns true если ничья
 */
export function isSectorDraw(sector: Sector): boolean {
  return isSectorFull(sector) && checkSectorWinner(sector) === null
}

/**
 * Определяет статус сектора
 * @param sector - сектор для проверки
 * @returns статус сектора
 */
export function getSectorStatus(sector: Sector): SectorStatus {
  const winner = checkSectorWinner(sector)
  if (winner) return winner
  if (isSectorDraw(sector)) return 'draw'
  return null
}

/**
 * Проверяет победу в игре (проверка всех секторов на наличие 3 подряд)
 * @param sectors - массив секторов
 * @returns игрок-победитель или null
 */
export function checkGameWinner(sectors: Sector[]): Player | null {
  for (const sector of sectors) {
    const winner = checkSectorWinner(sector)
    if (winner) {
      return winner
    }
  }
  return null
}

/**
 * Проверяет завершение игры (победитель или ничья в любом секторе)
 * @param sectors - массив секторов
 * @returns статус игры и победитель (если есть)
 */
export function checkGameCompletion(sectors: Sector[]): {
  status: GameStatus
  winner: Player | null
} {
  // Проверяем победу в любом секторе
  const winner = checkGameWinner(sectors)
  if (winner) {
    return { status: 'won', winner }
  }

  // Проверяем ничью в любом секторе
  for (const sector of sectors) {
    if (isSectorDraw(sector)) {
      return { status: 'draw', winner: null }
    }
  }

  return { status: 'playing', winner: null }
}

/**
 * Определяет доступные секторы для хода
 * @param activeSector - активный сектор (куда можно ходить)
 * @param sectorStatuses - статусы всех секторов
 * @returns массив индексов доступных секторов
 */
export function getAvailableSectors(
  activeSector: number | null,
  sectorStatuses: SectorStatus[],
): number[] {
  // Если активный сектор указан и он не завершен, можно ходить только туда
  if (activeSector !== null && sectorStatuses[activeSector] === null) {
    return [activeSector]
  }

  // Иначе можно ходить в любой незавершенный сектор
  return sectorStatuses
    .map((status, index) => (status === null ? index : -1))
    .filter((index) => index !== -1)
}

/**
 * Валидация хода
 * @param sectorIndex - индекс сектора
 * @param cellIndex - индекс ячейки в секторе
 * @param board - доска
 * @param activeSector - активный сектор
 * @param sectorStatuses - статусы секторов
 * @returns true если ход валиден
 */
export function isValidMove(
  sectorIndex: number,
  cellIndex: number,
  board: Sector[],
  activeSector: number | null,
  sectorStatuses: SectorStatus[],
): boolean {
  // Проверяем, что сектор существует
  if (sectorIndex < 0 || sectorIndex >= 9) return false
  if (cellIndex < 0 || cellIndex >= 9) return false

  // Проверяем, что ячейка свободна
  if (board[sectorIndex][cellIndex] !== null) return false

  // Проверяем, что сектор не завершен
  if (sectorStatuses[sectorIndex] !== null) return false

  // Проверяем, что можно ходить в этот сектор
  const availableSectors = getAvailableSectors(activeSector, sectorStatuses)
  return availableSectors.includes(sectorIndex)
}

/**
 * Определяет следующий активный сектор на основе хода
 * @param cellIndex - индекс ячейки, в которую был сделан ход
 * @param sectorStatuses - статусы секторов
 * @returns индекс следующего активного сектора или null
 */
export function getNextActiveSector(
  cellIndex: number,
  sectorStatuses: SectorStatus[],
): number | null {
  // Если сектор, соответствующий позиции ячейки, завершен, возвращаем null (можно ходить в любой)
  if (sectorStatuses[cellIndex] !== null) {
    return null
  }
  return cellIndex
}
