export type Player = 'X' | 'O'
export type CellValue = Player | null
export type SectorStatus = Player | 'draw' | null

export type GameMode = 'twoPlayers' | 'vsAI' | 'online' | null

export type AIDifficulty = 'easy' | 'medium' | 'hard'

export type GameStatus = 'playing' | 'won' | 'draw'

export type Position = {
  sector: number // 0-8 (сектор на доске 3x3)
  cell: number // 0-8 (ячейка в секторе 3x3)
}

export type Sector = CellValue[] // массив из 9 элементов (3x3)

export type Board = Sector[] // массив из 9 секторов (3x3)

export type MoveHistory = {
  sectorIndex: number
  cellIndex: number
  player: Player
  playerName: string
  notation: string // например "А1", "Б2"
  timestamp: number
}

export type GameState = {
  board: Board
  currentPlayer: Player
  activeSector: number | null // индекс сектора, куда можно ходить (null = любой)
  sectorStatuses: SectorStatus[] // статусы каждого сектора
  gameStatus: GameStatus
  winner: Player | null
  gameMode: GameMode
  aiDifficulty: AIDifficulty // уровень сложности ИИ
  moveHistory: MoveHistory[]
}
