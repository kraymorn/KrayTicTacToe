import { Box, Button, Flex, Heading, Text, VStack, useBreakpointValue } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import type { MoveHistory as MoveHistoryType } from '../types/game.types'

const MotionBox = motion(Box)
const MotionButton = motion(Button)

export const MoveHistory = () => {
  const { moveHistory } = useGameStore()
  const [isCopying, setIsCopying] = useState(false)
  const [showNotification, setShowNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Автоматически скрываем уведомление через 2 секунды
  // ВАЖНО: хуки должны вызываться до любого условного return
  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        setShowNotification(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [showNotification])

  // Responsive position для sticky
  const position = useBreakpointValue({ base: 'relative', lg: 'sticky' }) || 'relative'
  const top = useBreakpointValue({ base: 0, lg: 4 }) || 0

  if (moveHistory.length === 0) {
    return null
  }

  const lastMoves = moveHistory.slice(-10).reverse() // Последние 10 ходов

  const copyHistoryToClipboard = async () => {
    if (moveHistory.length === 0) return

    setIsCopying(true)
    try {
      // Форматируем историю ходов
      const historyText = moveHistory
        .map((move, index) => {
          const moveNumber = index + 1
          return `${moveNumber}. ${move.notation} (${move.player === 'X' ? '✕' : '○'} ${
            move.playerName
          })`
        })
        .join('\n')

      const fullText = `История ходов - Мега Крестики-Нолики\n\n${historyText}\n\nВсего ходов: ${moveHistory.length}`

      await navigator.clipboard.writeText(fullText)
      setShowNotification({ type: 'success', message: 'История ходов скопирована в буфер обмена' })
    } catch (error) {
      setShowNotification({ type: 'error', message: 'Не удалось скопировать историю ходов' })
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <Box w="full" position={position} top={top}>
      {/* Уведомление */}
      {showNotification && (
        <MotionBox
          position="fixed"
          top={4}
          left="50%"
          style={{ transform: 'translateX(-50%)' }}
          zIndex={1000}
          bg={showNotification.type === 'success' ? 'green.600' : 'red.600'}
          color="white"
          px={4}
          py={2}
          borderRadius="md"
          shadow="lg"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          mb={2}
        >
          <Text fontSize="sm" fontWeight="medium">
            {showNotification.type === 'success' ? '✓ ' : '✗ '}
            {showNotification.message}
          </Text>
        </MotionBox>
      )}

      <Box
        bg="gray.800"
        opacity={0.9}
        border="1px solid"
        borderColor="gray.700"
        borderRadius="lg"
        p={2}
      >
        <Flex
          alignItems="center"
          justifyContent="space-between"
          mb={1.5}
          borderBottom="1px solid"
          borderColor="gray.700"
          pb={1}
        >
          <Heading as="h3" fontSize="xs" fontWeight="bold" color="gray.100">
            История ходов
          </Heading>
          <MotionButton
            size="xs"
            onClick={copyHistoryToClipboard}
            disabled={isCopying || moveHistory.length === 0}
            bg="gray.700"
            color="gray.100"
            _hover={{ bg: 'gray.600' }}
            _active={{ bg: 'gray.800' }}
            loading={isCopying}
            loadingText="..."
            fontSize="2xs"
            px={2}
            py={1}
            h="auto"
            minW="auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            📋
          </MotionButton>
        </Flex>
        <VStack gap={0.5} maxH={{ base: '200px', lg: '500px' }} overflowY="auto" align="stretch">
          {lastMoves.map((move: MoveHistoryType, index: number) => (
            <MotionBox
              key={move.timestamp}
              as={Flex}
              alignItems="center"
              justifyContent="space-between"
              fontSize="xs"
              color="gray.200"
              bg="gray.900"
              opacity={0.7}
              borderRadius="sm"
              _hover={{ opacity: 1, bg: 'gray.850' }}
              px={1.5}
              py={0.5}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 0.7, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Text
                as="span"
                fontFamily="mono"
                fontWeight="semibold"
                color="blue.400"
                fontSize="xs"
              >
                {move.notation}
              </Text>
              <Flex as="span" alignItems="center" gap={1} color="gray.200">
                <Text as="span" color="gray.500" fontSize="xs">
                  —
                </Text>
                <Text
                  as="span"
                  color={move.player === 'X' ? 'blue.400' : 'red.400'}
                  fontSize="xs"
                  fontWeight="medium"
                >
                  {move.player === 'X' ? '✕' : '○'}
                </Text>
                <Text as="span" color="gray.500" fontSize="xs">
                  {move.playerName}
                </Text>
              </Flex>
            </MotionBox>
          ))}
        </VStack>
      </Box>
    </Box>
  )
}
