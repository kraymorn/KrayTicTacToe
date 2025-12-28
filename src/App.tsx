import { Box, Button, Container, Flex, Heading, Text } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { GameBoard } from './components/GameBoard'
import { GameModeSelector } from './components/GameModeSelector'
import { GameStatus } from './components/GameStatus'
import { MoveHistory } from './components/MoveHistory'
import { OnlineRoomManager } from './components/OnlineRoomManager'
import { PlayerIndicator } from './components/PlayerIndicator'
import { ReactionButtons } from './components/ReactionButtons'
import { ReactionDisplay } from './components/ReactionDisplay'
import { deleteRoom, subscribeToRoom, type OnlineGameRoom } from './services/onlineGameService'
import { useGameStore } from './store/gameStore'
import { getAIMove } from './utils/ai'

const MotionButton = motion(Button)

function App() {
  const {
    gameMode,
    gameStatus,
    currentPlayer,
    board,
    activeSector,
    sectorStatuses,
    aiDifficulty,
    makeMove,
    setGameMode,
    roomId,
    syncGameState,
    clearOnlineRoom,
    onlinePlayerSymbol,
  } = useGameStore()

  const [showRoomManager, setShowRoomManager] = useState(false)
  const [roomReady, setRoomReady] = useState(false)

  // Обработка онлайн режима
  useEffect(() => {
    if (gameMode === 'online' && !roomId) {
      setShowRoomManager(true)
      setRoomReady(false)
    } else if (gameMode !== 'online') {
      setShowRoomManager(false)
      setRoomReady(false)
    }
  }, [gameMode, roomId])

  // Синхронизация состояния игры в реальном времени для онлайн режима
  useEffect(() => {
    if (gameMode === 'online' && roomId && roomReady) {
      const unsubscribe = subscribeToRoom(roomId, (room: OnlineGameRoom | null) => {
        if (room && room.gameState) {
          // Синхронизируем состояние без задержки для мгновенного отображения
          syncGameState(room.gameState)
        }
      })

      return () => {
        unsubscribe()
      }
    }
  }, [gameMode, roomId, roomReady, syncGameState])

  // Очистка комнаты при выходе из онлайн режима
  useEffect(() => {
    return () => {
      if (roomId && gameMode !== 'online') {
        deleteRoom(roomId).catch(console.error)
        clearOnlineRoom()
      }
    }
  }, [gameMode, roomId, clearOnlineRoom])

  // Обработка параметра room в URL (для присоединения по ссылке)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const roomParam = urlParams.get('room')

    // Если есть параметр room в URL и режим игры еще не установлен, переключаемся в онлайн режим
    if (roomParam && gameMode === null) {
      setGameMode('online')
      // Не удаляем параметр из URL здесь - это сделает OnlineRoomManager после успешного подключения
    }
  }, [gameMode, setGameMode])

  // Автоматические ходы ИИ
  useEffect(() => {
    if (gameMode === 'vsAI' && gameStatus === 'playing' && currentPlayer === 'O') {
      // Задержка для сложного ИИ
      const delay = 800
      const timer = setTimeout(() => {
        const aiMove = getAIMove(board, activeSector, sectorStatuses, 'O', aiDifficulty)
        if (aiMove) {
          makeMove(aiMove.sector, aiMove.cell)
        }
      }, delay)

      return () => clearTimeout(timer)
    }
  }, [
    gameMode,
    gameStatus,
    currentPlayer,
    board,
    activeSector,
    sectorStatuses,
    aiDifficulty,
    makeMove,
  ])

  return (
    <Box
      minH="100vh"
      bg="gray.950"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={{ base: 1, sm: 2 }}
    >
      {showRoomManager && gameMode === 'online' && (
        <OnlineRoomManager
          onRoomReady={() => {
            setShowRoomManager(false)
            setRoomReady(true)
          }}
        />
      )}

      {gameMode === null && <GameModeSelector />}

      {gameMode !== null && (
        <Container
          maxW="1200px"
          w="full"
          display="flex"
          flexDirection={{ base: 'column', lg: 'row' }}
          alignItems="center"
          justifyContent="center"
          gap={{ base: 2, sm: 3, lg: 6 }}
          px={{ base: 1, sm: 2 }}
        >
          {/* Левая часть: игровое поле */}
          <Box
            w="full"
            maxW={{ base: 'full', sm: '500px', md: '600px' }}
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
          >
            <Box textAlign="center" mb={{ base: 1, sm: 1.5 }}>
              <Heading
                as="h1"
                size={{ base: 'xs', sm: 'sm', md: 'md' }}
                fontWeight="bold"
                color="gray.100"
                mb={0.5}
                textShadow="sm"
              >
                Мега Крестики-Нолики
              </Heading>
              {gameMode === 'vsAI' && (
                <Text fontSize={{ base: '2xs', sm: 'xs' }} color="gray.200">
                  Вы играете за{' '}
                  <Text as="span" color="blue.400" fontWeight="bold">
                    ✕
                  </Text>
                  , ИИ играет за{' '}
                  <Text as="span" color="red.400" fontWeight="bold">
                    ○
                  </Text>
                </Text>
              )}
              {gameMode === 'online' && (
                <Text fontSize={{ base: '2xs', sm: 'xs' }} color="gray.200">
                  Онлайн игра
                </Text>
              )}
            </Box>

            {/* Кнопки управления */}
            <Flex
              gap={{ base: 2, sm: 3 }}
              mb={{ base: 2, sm: 3 }}
              w="full"
              maxW={{ base: 'full', sm: '500px', md: '600px' }}
              justifyContent="center"
              flexWrap="wrap"
            >
              <MotionButton
                onClick={() => useGameStore.getState().resetGame()}
                bgGradient="linear(to-r, indigo.600, purple.600, pink.600)"
                color="white"
                fontWeight="bold"
                size={{ base: 'sm', sm: 'md' }}
                shadow="xl"
                border="2px solid"
                borderColor="purple.300"
                borderRadius="xl"
                px={{ base: 4, sm: 6 }}
                py={{ base: 2, sm: 3 }}
                _hover={{
                  bgGradient: 'linear(to-r, indigo.500, purple.500, pink.500)',
                  shadow: '0 0 25px rgba(168, 85, 247, 0.6)',
                  borderColor: 'purple.400',
                  transform: 'translateY(-2px)',
                }}
                _active={{
                  transform: 'translateY(0px)',
                }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                🔄 Новая игра
              </MotionButton>

              <MotionButton
                onClick={() => {
                  if (gameMode === 'online' && roomId) {
                    deleteRoom(roomId).catch(console.error)
                    clearOnlineRoom()
                  }
                  setGameMode(null)
                }}
                bgGradient="linear(to-r, gray.700, gray.600)"
                color="white"
                fontWeight="bold"
                size={{ base: 'sm', sm: 'md' }}
                shadow="xl"
                border="2px solid"
                borderColor="gray.500"
                borderRadius="xl"
                px={{ base: 4, sm: 6 }}
                py={{ base: 2, sm: 3 }}
                _hover={{
                  bgGradient: 'linear(to-r, gray.600, gray.500)',
                  shadow: '0 0 20px rgba(156, 163, 175, 0.5)',
                  borderColor: 'gray.400',
                  transform: 'translateY(-2px)',
                }}
                _active={{
                  transform: 'translateY(0px)',
                }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              >
                ⚙️ Выбор режима
              </MotionButton>
            </Flex>

            <PlayerIndicator
              currentPlayer={currentPlayer}
              gameMode={gameMode}
              onlinePlayerSymbol={onlinePlayerSymbol}
            />

            <GameBoard />

            {/* Кнопки реакций для онлайн игры */}
            {gameMode === 'online' && roomId && roomReady && <ReactionButtons />}

            {gameStatus !== 'playing' && <GameStatus />}
          </Box>

          {/* Правая часть: история ходов (на десктопе) / снизу (на мобильных) */}
          <Box w="full" minW={{ lg: '300px' }} maxW={{ lg: '400px' }}>
            <MoveHistory />
          </Box>
        </Container>
      )}

      {/* Отображение реакций оппонента для онлайн игры */}
      {gameMode === 'online' && roomId && roomReady && <ReactionDisplay />}
    </Box>
  )
}

export default App
