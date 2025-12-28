import { Box, Grid } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import type { SectorStatus, Sector as SectorType } from '../types/game.types'
import { checkSectorWinner } from '../utils/gameLogic'
import { Cell } from './Cell'

interface SectorProps {
  sector: SectorType
  sectorIndex: number
  isActive: boolean
  status: SectorStatus
  onCellClick: (cellIndex: number) => void
  disabled: boolean
}

// Выигрышные комбинации для подсветки
const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // горизонтали
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // вертикали
  [0, 4, 8],
  [2, 4, 6], // диагонали
]

const MotionBox = motion(Box)

export const Sector = ({ sector, isActive, status, onCellClick, disabled }: SectorProps) => {
  const winner = checkSectorWinner(sector)
  const winningLine = winner
    ? WINNING_LINES.find((line) => line.every((idx) => sector[idx] === winner))
    : null

  return (
    <MotionBox
      position="relative"
      as={Grid}
      gridTemplateColumns="repeat(3, 1fr)"
      w="full"
      aspectRatio={1}
      border="1px solid"
      borderColor="gray.600"
      borderRadius="md"
      overflow="hidden"
      bg={
        status === 'draw'
          ? 'gray.800'
          : status === 'X' || status === 'O'
          ? 'gray.800'
          : isActive
          ? 'gray.800'
          : 'gray.900'
      }
      opacity={status === 'draw' ? 0.7 : status === 'X' || status === 'O' ? 0.8 : isActive ? 1 : 1}
      shadow={isActive ? '0 0 20px rgba(34, 197, 94, 0.4)' : 'sm'}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        boxShadow: isActive ? '0 0 20px rgba(34, 197, 94, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.5)',
      }}
      transition={{
        duration: 0.3,
        boxShadow: { duration: 0.5 },
      }}
      whileHover={
        isActive && !disabled
          ? {
              scale: 1.02,
              boxShadow: '0 0 25px rgba(34, 197, 94, 0.5)',
            }
          : {}
      }
    >
      {/* Активный индикатор - пульсирующая рамка */}
      {isActive && !status && (
        <MotionBox
          position="absolute"
          inset={0}
          border="2px solid"
          borderColor="green.500"
          borderRadius="md"
          pointerEvents="none"
          zIndex={0}
          initial={{ opacity: 0.4 }}
          animate={{
            opacity: [0.4, 0.7, 0.4],
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Выигрышная линия */}
      {winningLine && (
        <MotionBox
          position="absolute"
          inset={0}
          pointerEvents="none"
          zIndex={0}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
          >
            <motion.line
              x1={winningLine[0] % 3 === 0 ? '16.66' : winningLine[0] % 3 === 1 ? '50' : '83.33'}
              y1={
                Math.floor(winningLine[0] / 3) === 0
                  ? '16.66'
                  : Math.floor(winningLine[0] / 3) === 1
                  ? '50'
                  : '83.33'
              }
              x2={winningLine[2] % 3 === 0 ? '16.66' : winningLine[2] % 3 === 1 ? '50' : '83.33'}
              y2={
                Math.floor(winningLine[2] / 3) === 0
                  ? '16.66'
                  : Math.floor(winningLine[2] / 3) === 1
                  ? '50'
                  : '83.33'
              }
              stroke={winner === 'X' ? '#3b82f6' : '#ef4444'}
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            />
          </svg>
        </MotionBox>
      )}

      {/* Ячейки */}
      {sector.map((cell, cellIndex) => {
        const isWinningCell = winningLine?.includes(cellIndex) || false

        return (
          <Box
            key={cellIndex}
            position="relative"
            aspectRatio={1}
            bg={isWinningCell ? 'yellow.900' : 'transparent'}
            opacity={isWinningCell ? 0.4 : 1}
          >
            <Cell
              value={cell}
              onClick={() => onCellClick(cellIndex)}
              disabled={disabled || cell !== null || status !== null}
              isActive={isActive && cell === null && status === null}
            />
          </Box>
        )
      })}
    </MotionBox>
  )
}
