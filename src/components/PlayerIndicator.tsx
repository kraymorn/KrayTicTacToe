import { Box, Flex, Text } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import type { Player } from '../types/game.types'

interface PlayerIndicatorProps {
  currentPlayer: Player
  gameMode: 'twoPlayers' | 'vsAI' | 'online' | null
  onlinePlayerSymbol?: Player | null
}

const MotionBox = motion(Box)
const MotionText = motion(Text)

export const PlayerIndicator = ({ currentPlayer, gameMode, onlinePlayerSymbol }: PlayerIndicatorProps) => {
  // Определяем текст для отображения
  let statusText: string | null = null

  if (gameMode === 'online' && onlinePlayerSymbol) {
    // Для онлайн игры показываем "Ваш ход" или "Ход оппонента"
    statusText = currentPlayer === onlinePlayerSymbol ? 'Ваш ход' : 'Ход оппонента'
  } else if (gameMode === 'twoPlayers') {
    // Для оффлайн игры вдвоём показываем "Игрок 1" или "Игрок 2"
    statusText = currentPlayer === 'X' ? 'Игрок 1' : 'Игрок 2'
  } else if (gameMode === 'vsAI') {
    // Для игры с ИИ оставляем как было
    statusText = currentPlayer === 'X' ? 'Вы' : 'ИИ'
  }

  return (
    <MotionBox
      as={Flex}
      alignItems="center"
      justifyContent="center"
      gap={2}
      flexWrap="nowrap"
      mb={2}
      bg="gray.800"
      opacity={0.9}
      px={3}
      py={1.5}
      borderRadius="lg"
      shadow="md"
      border="1px solid"
      borderColor="gray.700"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {statusText && (
        <Text fontSize={{ base: 'xs', sm: 'sm' }} fontWeight="semibold" color="gray.100" whiteSpace="nowrap">
          {statusText}
        </Text>
      )}
      <MotionText
        fontSize={{ base: 'lg', sm: 'xl' }}
        fontWeight="bold"
        color={currentPlayer === 'X' ? 'blue.400' : 'red.400'}
        key={currentPlayer}
        initial={{ scale: 0.5, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        {currentPlayer === 'X' ? '✕' : '○'}
      </MotionText>
    </MotionBox>
  )
}
