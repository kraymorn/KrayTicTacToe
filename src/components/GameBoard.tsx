import { Box, Flex, Grid } from '@chakra-ui/react'
import { useGameStore } from '../store/gameStore'
import type { SectorStatus } from '../types/game.types'
import { Sector } from './Sector'

const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И']
const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export const GameBoard = () => {
  const { board, activeSector, sectorStatuses, makeMove, gameStatus, currentPlayer, gameMode } =
    useGameStore()

  const handleCellClick = (sectorIndex: number, cellIndex: number) => {
    if (gameStatus !== 'playing') return

    // В режиме против ИИ, если ход ИИ - не обрабатываем клики
    if (gameMode === 'vsAI' && currentPlayer === 'O') {
      return
    }

    makeMove(sectorIndex, cellIndex)
  }

  return (
    <Box w="full" display="flex" justifyContent="center">
      <Box
        position="relative"
        w="full"
        maxW={{ base: 'calc(100vw - 16px)', sm: '450px', md: '600px' }}
      >
        {/* Буквы сверху */}
        <Flex mb={{ base: 1, sm: 1.5, md: 2 }}>
          <Box w={{ base: 3, sm: 4, md: 5 }} flexShrink={0} /> {/* Отступ для цифр */}
          {LETTERS.map((letter, colIndex) => (
            <Box
              key={colIndex}
              flex={1}
              textAlign="center"
              fontSize={{ base: 'xs', sm: 'sm', md: 'md' }}
              fontWeight="bold"
              color="gray.200"
            >
              {letter}
            </Box>
          ))}
        </Flex>

        <Flex alignItems="stretch">
          {/* Цифры слева */}
          <Flex
            flexDirection="column"
            mr={{ base: 1, sm: 1.5, md: 2 }}
            flexShrink={0}
            justifyContent="space-between"
          >
            {NUMBERS.map((number, rowIndex) => (
              <Box
                key={rowIndex}
                flex={1}
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize={{ base: 'xs', sm: 'sm', md: 'md' }}
                fontWeight="bold"
                color="gray.400"
                w={{ base: 3, sm: 4, md: 5 }}
                minH={0}
              >
                {number}
              </Box>
            ))}
          </Flex>

          {/* Игровая доска */}
          <Grid
            templateColumns="repeat(3, 1fr)"
            gap={{ base: 0.5, sm: 1.5, md: 2 }}
            w="full"
            flex={1}
          >
            {board.map((sector, sectorIndex) => (
              <Sector
                key={sectorIndex}
                sector={sector}
                sectorIndex={sectorIndex}
                isActive={activeSector === null || activeSector === sectorIndex}
                status={sectorStatuses[sectorIndex] as SectorStatus}
                onCellClick={(cellIndex) => handleCellClick(sectorIndex, cellIndex)}
                disabled={
                  gameStatus !== 'playing' || (gameMode === 'vsAI' && currentPlayer === 'O')
                }
              />
            ))}
          </Grid>
        </Flex>
      </Box>
    </Box>
  )
}
