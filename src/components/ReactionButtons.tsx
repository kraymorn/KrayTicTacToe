import { Box, Button, Flex } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { REACTIONS, sendReaction, type ReactionType } from '../services/onlineGameService'
import { useGameStore } from '../store/gameStore'

const MotionButton = motion(Button)

export const ReactionButtons = () => {
  const { roomId, playerId, onlinePlayerSymbol } = useGameStore()

  if (!roomId || !playerId || !onlinePlayerSymbol) {
    return null
  }

  const handleReaction = async (reactionType: ReactionType) => {
    try {
      await sendReaction(roomId, playerId, reactionType, onlinePlayerSymbol)
    } catch (error) {
      console.error('Ошибка отправки реакции:', error)
    }
  }

  const reactionTypes: ReactionType[] = ['great', 'bad', 'fire', 'heart', 'sleep', 'angry']

  return (
    <Box mt={4} w="full" display="flex" justifyContent="center">
      <Box
        bg="gray.800"
        borderRadius="lg"
        p={{ base: 2, sm: 2.5 }}
        shadow="md"
        border="1px solid"
        borderColor="gray.700"
        display="inline-flex"
      >
        <Flex gap={{ base: 1.5, sm: 2 }} alignItems="center" justifyContent="center">
          {reactionTypes.map((type) => {
            const reaction = REACTIONS[type]
            return (
              <MotionButton
                key={type}
                title={reaction.text}
                size="sm"
                fontSize={{ base: 'lg', sm: 'xl' }}
                bg="gray.700"
                color="white"
                _hover={{
                  bg: 'gray.600',
                }}
                onClick={() => handleReaction(type)}
                whileHover={{ scale: 1.1, y: -1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                borderRadius="md"
                minW={{ base: '36px', sm: '40px' }}
                h={{ base: '36px', sm: '40px' }}
                p={0}
              >
                {reaction.emoji}
              </MotionButton>
            )
          })}
        </Flex>
      </Box>
    </Box>
  )
}
