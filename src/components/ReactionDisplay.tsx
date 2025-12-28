import { Box, Text } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { subscribeToReactions, type Reaction } from '../services/onlineGameService'
import { useGameStore } from '../store/gameStore'

const MotionBox = motion(Box)

export const ReactionDisplay = () => {
  const { roomId, playerId, onlinePlayerSymbol } = useGameStore()
  const [displayedReactions, setDisplayedReactions] = useState<Reaction[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Определяем цвет рамки на основе символа отправителя реакции
  const getBorderColor = (reaction: Reaction): string => {
    // Используем символ отправителя из реакции, если он есть, иначе определяем по fromPlayerId
    const senderSymbol = reaction.fromPlayerSymbol || (reaction.fromPlayerId === playerId ? onlinePlayerSymbol : (onlinePlayerSymbol === 'X' ? 'O' : 'X'))
    // Цвет рамки соответствует символу отправителя: X = синий, O = красный
    return senderSymbol === 'X' ? 'blue.400' : 'red.400'
  }

  useEffect(() => {
    if (!roomId || !playerId) {
      return
    }

    const unsubscribe = subscribeToReactions(roomId, (newReactions) => {
      // Показываем все реакции (и свои, и оппонента)
      // Берем последние 3 реакции
      const latestReactions = newReactions.slice(0, 3)

      setDisplayedReactions((prev) => {
        // Находим новые реакции, которых еще нет в отображаемых
        const newReactionsToAdd = latestReactions.filter(
          (newReaction) =>
            !prev.some(
              (prevReaction) =>
                prevReaction.timestamp === newReaction.timestamp &&
                prevReaction.fromPlayerId === newReaction.fromPlayerId,
            ),
        )

        // Объединяем старые и новые, оставляя максимум 3 последние
        const combined = [...prev, ...newReactionsToAdd]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 3)

        // Устанавливаем таймеры для новых реакций
        newReactionsToAdd.forEach((reaction) => {
          const key = `${reaction.timestamp}-${reaction.fromPlayerId}`
          const timer = setTimeout(() => {
            setDisplayedReactions((current) =>
              current.filter(
                (r) =>
                  !(r.timestamp === reaction.timestamp && r.fromPlayerId === reaction.fromPlayerId),
              ),
            )
            timersRef.current.delete(key)
          }, 3000)
          timersRef.current.set(key, timer)
        })

        return combined
      })
    })

    return () => {
      unsubscribe()
      // Очищаем все таймеры при размонтировании
      timersRef.current.forEach((timer) => clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [roomId, playerId])

  if (displayedReactions.length === 0) {
    return null
  }

  return (
    <Box
      position="fixed"
      top={{ base: 4, sm: 6 }}
      right={{ base: 4, sm: 6 }}
      zIndex={45}
      display="flex"
      flexDirection="column"
      gap={1.5}
      alignItems="flex-end"
      maxW={{ base: '150px', sm: '180px' }}
    >
      <AnimatePresence mode="popLayout">
        {displayedReactions.map((reaction) => (
          <MotionBox
            key={`${reaction.timestamp}-${reaction.fromPlayerId}`}
            bg="gray.800"
            borderRadius="lg"
            px={2}
            py={1.5}
            shadow="lg"
            border="1.5px solid"
            borderColor={getBorderColor(reaction)}
            display="flex"
            alignItems="center"
            justifyContent="center"
            initial={{ opacity: 0, scale: 0.5, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.5, x: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            minW={{ base: '36px', sm: '40px' }}
            h={{ base: '36px', sm: '40px' }}
          >
            <Text fontSize={{ base: 'lg', sm: 'xl' }}>{reaction.emoji}</Text>
          </MotionBox>
        ))}
      </AnimatePresence>
    </Box>
  )
}

