import { Box, Button, Heading, Text } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'

const MotionBox = motion(Box)
const MotionHeading = motion(Heading)
const MotionButton = motion(Button)

export const GameStatus = () => {
  const { gameStatus, winner, resetGame, gameMode } = useGameStore()

  if (gameStatus === 'playing') {
    return null
  }

  return (
    <MotionBox
      position="fixed"
      inset={0}
      bg="blackAlpha.800"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={50}
      p={4}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <MotionBox
        bgGradient="linear(to-br, gray.800, gray.900)"
        borderRadius="2xl"
        p={{ base: 6, sm: 8, md: 10 }}
        shadow="2xl"
        maxW="md"
        w="full"
        textAlign="center"
        border="2px solid"
        borderColor="gray.700"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <Box>
          <MotionHeading
            as="h2"
            fontSize={{ base: '2xl', sm: '3xl', md: '4xl' }}
            fontWeight="bold"
            mb={{ base: 4, sm: 6 }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {gameStatus === 'won' && winner && (
              <Text as="span" color={winner === 'X' ? 'blue.400' : 'red.400'} display="block">
                Победил {winner === 'X' ? '✕' : '○'}!
                {gameMode === 'vsAI' && (
                  <Text as="div" fontSize={{ base: 'lg', sm: 'xl' }} mt={2} color="gray.100">
                    {winner === 'X' ? 'Вы выиграли!' : 'ИИ выиграл!'}
                  </Text>
                )}
              </Text>
            )}
            {gameStatus === 'draw' && (
              <Text as="span" color="gray.100">
                Ничья!
              </Text>
            )}
          </MotionHeading>
          <MotionButton
            mt={{ base: 4, sm: 6 }}
            px={{ base: 6, sm: 8 }}
            py={{ base: 2, sm: 3 }}
            bgGradient="linear(to-r, indigo.600, purple.600, pink.600)"
            color="white"
            fontWeight="semibold"
            borderRadius="lg"
            fontSize={{ base: 'base', sm: 'lg' }}
            shadow="lg"
            border="2px solid"
            borderColor="purple.300"
            _hover={{
              bgGradient: 'linear(to-r, indigo.500, purple.500, pink.500)',
              shadow: '0 0 20px rgba(168, 85, 247, 0.5)',
              borderColor: 'purple.500',
            }}
            onClick={resetGame}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Новая игра
          </MotionButton>
        </Box>
      </MotionBox>
    </MotionBox>
  )
}
