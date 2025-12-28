import { Box, Flex, Text } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import type { Player } from '../types/game.types'

interface PlayerIndicatorProps {
  currentPlayer: Player
  gameMode: 'twoPlayers' | 'vsAI' | 'online' | null
}

const MotionBox = motion(Box)
const MotionText = motion(Text)

export const PlayerIndicator = ({ currentPlayer, gameMode }: PlayerIndicatorProps) => {
  return (
    <MotionBox
      as={Flex}
      alignItems="center"
      justifyContent="center"
      gap={2}
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
      <Text fontSize={{ base: 'xs', sm: 'sm' }} fontWeight="semibold" color="gray.100">
        Ход игрока:
      </Text>
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
      {gameMode === 'vsAI' && (
        <Text fontSize="xs" color="gray.200">
          {currentPlayer === 'X' ? '(Вы)' : '(ИИ)'}
        </Text>
      )}
    </MotionBox>
  )
}
