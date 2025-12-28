import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'

const MotionBox = motion(Box)
const MotionHeading = motion(Heading)
const MotionText = motion(Text)
const MotionButton = motion(Button)

export const GameModeSelector = () => {
  const { setGameMode, setAIDifficulty } = useGameStore()

  return (
    <MotionBox
      position="fixed"
      inset={0}
      bg="gray.950"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
      zIndex={50}
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
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <MotionHeading
          as="h1"
          fontSize={{ base: '3xl', sm: '4xl', md: '5xl' }}
          fontWeight="bold"
          mb={{ base: 4, sm: 6 }}
          color="white"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Мега Крестики-Нолики
        </MotionHeading>
        <MotionText
          fontSize={{ base: 'sm', sm: 'base' }}
          color="white"
          mb={{ base: 8, sm: 10 }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Выберите режим игры
        </MotionText>

        <VStack gap={{ base: 4, sm: 5 }}>
          <MotionBox
            w="full"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
          >
            <MotionButton
              w="full"
              px={{ base: 8, sm: 10 }}
              py={{ base: 4, sm: 5 }}
              bgGradient="linear(to-r, indigo.600, purple.600, pink.600)"
              color="white"
              fontWeight="bold"
              borderRadius="xl"
              fontSize={{ base: 'lg', sm: 'xl', md: '2xl' }}
              shadow="2xl"
              border="2px solid"
              borderColor="purple.300"
              _hover={{
                bgGradient: 'linear(to-r, indigo.500, purple.500, pink.500)',
                shadow: '0 0 30px rgba(168, 85, 247, 0.6)',
                borderColor: 'purple.500',
              }}
              onClick={() => {
                setAIDifficulty('hard')
                setGameMode('vsAI')
              }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              mb={4}
            >
              🤖 Игра против ИИ
            </MotionButton>
          </MotionBox>

          <MotionButton
            w="full"
            px={{ base: 8, sm: 10 }}
            py={{ base: 4, sm: 5 }}
            bgGradient="linear(to-r, cyan.500, blue.500, indigo.600)"
            color="white"
            fontWeight="bold"
            borderRadius="xl"
            fontSize={{ base: 'lg', sm: 'xl', md: '2xl' }}
            shadow="2xl"
            border="2px solid"
            borderColor="cyan.300"
            _hover={{
              bgGradient: 'linear(to-r, cyan.400, blue.400, indigo.500)',
              shadow: '0 0 30px rgba(6, 182, 212, 0.6)',
              borderColor: 'cyan.500',
            }}
            onClick={() => setGameMode('twoPlayers')}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            mb={4}
          >
            👥 Игра друг против друга
          </MotionButton>

          <MotionButton
            w="full"
            px={{ base: 8, sm: 10 }}
            py={{ base: 4, sm: 5 }}
            bgGradient="linear(to-r, green.500, emerald.500, teal.600)"
            color="white"
            fontWeight="bold"
            borderRadius="xl"
            fontSize={{ base: 'lg', sm: 'xl', md: '2xl' }}
            shadow="2xl"
            border="2px solid"
            borderColor="green.300"
            _hover={{
              bgGradient: 'linear(to-r, green.400, emerald.400, teal.500)',
              shadow: '0 0 30px rgba(34, 197, 94, 0.6)',
              borderColor: 'green.500',
            }}
            onClick={() => setGameMode('online')}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
          >
            🌐 Игра по сети
          </MotionButton>
        </VStack>
      </MotionBox>
    </MotionBox>
  )
}
