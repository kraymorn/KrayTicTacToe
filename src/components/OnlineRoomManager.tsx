import { Box, Button, Heading, Input, Text, VStack } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
  createRoom,
  deleteRoom,
  generatePlayerId,
  generateRoomId,
  getPlayerInfo,
  joinRoom,
  subscribeToRoom,
  type OnlineGameRoom,
} from '../services/onlineGameService'
import { useGameStore } from '../store/gameStore'

const MotionBox = motion(Box)
const MotionButton = motion(Button)
const MotionHeading = motion(Heading)

type OnlineRoomManagerProps = {
  onRoomReady: () => void
}

export const OnlineRoomManager = ({ onRoomReady }: OnlineRoomManagerProps) => {
  // Проверяем параметр room в URL при каждом рендере
  const getRoomParam = () => {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('room')
  }

  const [roomParam, setRoomParam] = useState<string | null>(getRoomParam())
  const [mode, setMode] = useState<'select' | 'create' | 'join'>(roomParam ? 'join' : 'select')
  const [roomId, setRoomId] = useState(roomParam || '')
  const [playerId] = useState(() => generatePlayerId())
  const [isLoading, setIsLoading] = useState(!!roomParam)
  const [error, setError] = useState<string | null>(null)
  const [waitingForPlayer, setWaitingForPlayer] = useState(false)
  const [hasAutoJoined, setHasAutoJoined] = useState(false) // Флаг, чтобы не пытаться присоединиться дважды
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    title: string
    description?: string
  } | null>(null)

  const { setOnlineRoom, setGameMode, syncGameState, roomId: storeRoomId } = useGameStore()

  // Отслеживаем изменения URL
  useEffect(() => {
    const checkUrl = () => {
      const currentRoomParam = getRoomParam()
      if (currentRoomParam && currentRoomParam !== roomParam) {
        setRoomParam(currentRoomParam)
        setRoomId(currentRoomParam)
        setMode('join')
        setIsLoading(true)
        setHasAutoJoined(false)
        setError(null)
      }
    }

    // Проверяем при монтировании
    checkUrl()

    // Слушаем изменения истории браузера (popstate)
    window.addEventListener('popstate', checkUrl)

    return () => {
      window.removeEventListener('popstate', checkUrl)
    }
  }, [roomParam])

  // Автоматически скрываем уведомление
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(
        () => {
          setNotification(null)
        },
        notification.type === 'success' ? 2000 : 3000,
      )
      return () => clearTimeout(timer)
    }
  }, [notification])

  // Автоматическое присоединение при наличии параметра room в URL
  useEffect(() => {
    const currentRoomParam = getRoomParam()

    // Если пользователь уже подключен к комнате из URL, просто очищаем параметр
    if (
      currentRoomParam &&
      storeRoomId &&
      storeRoomId.toUpperCase() === currentRoomParam.trim().toUpperCase()
    ) {
      window.history.replaceState({}, '', window.location.pathname)
      setRoomParam(null)
      return
    }

    // Если есть параметр room в URL, мы еще не подключены к комнате (нет roomId в store),
    // и мы еще не пытались автоматически присоединиться
    if (currentRoomParam && currentRoomParam.trim() && !storeRoomId && !hasAutoJoined) {
      setHasAutoJoined(true)
      const roomIdToJoin = currentRoomParam.trim().toUpperCase()
      setRoomId(roomIdToJoin)
      setMode('join')
      setIsLoading(true)
      setError(null)

      // Вызываем присоединение асинхронно
      const join = async () => {
        try {
          await joinRoom(roomIdToJoin, playerId)

          // Подписываемся на изменения комнаты
          const unsubscribe = subscribeToRoom(roomIdToJoin, (room: OnlineGameRoom | null) => {
            if (!room) {
              setError('Комната не найдена')
              setIsLoading(false)
              setHasAutoJoined(false) // Разрешаем попробовать еще раз
              return
            }

            const playerInfo = getPlayerInfo(room, playerId)
            if (!playerInfo) {
              setError('Не удалось получить информацию об игроке')
              setIsLoading(false)
              setHasAutoJoined(false) // Разрешаем попробовать еще раз
              return
            }

            // Если оба игрока в комнате
            if (room.hostId && room.guestId) {
              unsubscribe()

              setOnlineRoom(room.roomId, playerId, playerInfo.playerSymbol, playerInfo.isHost)
              setGameMode('online')

              // Синхронизируем состояние сразу
              if (room.gameState) {
                syncGameState(room.gameState)
              }

              setNotification({
                type: 'success',
                title: 'Вы присоединились к игре!',
                description: 'Игра начинается',
              })

              // Очищаем параметр из URL после успешного подключения
              window.history.replaceState({}, '', window.location.pathname)
              setRoomParam(null)

              onRoomReady()
            } else {
              // Если еще нет второго игрока, ждем
              setWaitingForPlayer(true)
              setIsLoading(false)
            }
          })
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Ошибка присоединения к комнате')
          setIsLoading(false)
          setHasAutoJoined(false) // Разрешаем попробовать еще раз
        }
      }
      join()
    }
  }, [
    roomParam,
    hasAutoJoined,
    storeRoomId,
    playerId,
    setOnlineRoom,
    setGameMode,
    syncGameState,
    onRoomReady,
  ])

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (roomId && mode !== 'join') {
        deleteRoom(roomId).catch(console.error)
      }
    }
  }, [roomId, mode])

  const handleCreateRoom = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const newRoomId = generateRoomId()
      await createRoom(newRoomId, playerId)
      setRoomId(newRoomId)
      setWaitingForPlayer(true)

      // Подписываемся на изменения комнаты
      const unsubscribe = subscribeToRoom(newRoomId, (room: OnlineGameRoom | null) => {
        if (!room) return

        const playerInfo = getPlayerInfo(room, playerId)
        if (!playerInfo) return

        // Если гость присоединился
        if (room.guestId && room.guestId !== playerId) {
          setWaitingForPlayer(false)
          unsubscribe()

          setOnlineRoom(room.roomId, playerId, playerInfo.playerSymbol, playerInfo.isHost)
          setGameMode('online')

          // Синхронизируем состояние с небольшой задержкой
          if (room.gameState) {
            setTimeout(() => {
              syncGameState(room.gameState)
            }, 100)
          }

          setNotification({
            type: 'success',
            title: 'Игрок присоединился!',
            description: 'Игра начинается',
          })

          onRoomReady()
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания комнаты')
      setIsLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      setError('Введите ID комнаты')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await joinRoom(roomId.trim().toUpperCase(), playerId)

      // Подписываемся на изменения комнаты
      const unsubscribe = subscribeToRoom(
        roomId.trim().toUpperCase(),
        (room: OnlineGameRoom | null) => {
          if (!room) {
            setError('Комната не найдена')
            setIsLoading(false)
            return
          }

          const playerInfo = getPlayerInfo(room, playerId)
          if (!playerInfo) {
            setError('Не удалось получить информацию об игроке')
            setIsLoading(false)
            return
          }

          // Если оба игрока в комнате
          if (room.hostId && room.guestId) {
            unsubscribe()

            setOnlineRoom(room.roomId, playerId, playerInfo.playerSymbol, playerInfo.isHost)
            setGameMode('online')

            // Синхронизируем состояние сразу
            if (room.gameState) {
              syncGameState(room.gameState)
            }

            setNotification({
              type: 'success',
              title: 'Вы присоединились к игре!',
              description: 'Игра начинается',
            })

            onRoomReady()
          }
        },
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка присоединения к комнате')
      setIsLoading(false)
    }
  }

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`
    try {
      await navigator.clipboard.writeText(url)
      setNotification({
        type: 'success',
        title: 'Ссылка скопирована!',
        description: 'Отправьте её другу',
      })
    } catch (err) {
      setNotification({
        type: 'error',
        title: 'Ошибка копирования',
        description: 'Скопируйте ссылку вручную',
      })
    }
  }

  if (waitingForPlayer) {
    return (
      <>
        {notification && (
          <MotionBox
            position="fixed"
            top={4}
            left="50%"
            style={{ transform: 'translateX(-50%)' }}
            zIndex={1000}
            bg={notification.type === 'success' ? 'green.600' : 'red.600'}
            color="white"
            px={4}
            py={3}
            borderRadius="md"
            shadow="lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Text fontSize="sm" fontWeight="bold">
              {notification.type === 'success' ? '✓ ' : '✗ '}
              {notification.title}
            </Text>
            {notification.description && (
              <Text fontSize="xs" mt={1}>
                {notification.description}
              </Text>
            )}
          </MotionBox>
        )}
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
            borderColor="purple.500"
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
          >
            <MotionHeading
              as="h2"
              fontSize={{ base: '2xl', sm: '3xl' }}
              fontWeight="bold"
              mb={4}
              color="white"
            >
              Ожидание игрока...
            </MotionHeading>

            <Text fontSize="lg" color="gray.300" mb={6}>
              ID комнаты:
            </Text>

            <Box
              bg="gray.700"
              borderRadius="lg"
              p={4}
              mb={6}
              border="2px solid"
              borderColor="purple.400"
            >
              <Text
                fontSize={{ base: '2xl', sm: '3xl' }}
                fontWeight="bold"
                color="purple.300"
                fontFamily="mono"
                letterSpacing="wide"
              >
                {roomId}
              </Text>
            </Box>

            <VStack gap={4}>
              <MotionButton
                w="full"
                onClick={handleCopyLink}
                bgGradient="linear(to-r, indigo.600, purple.600)"
                color="white"
                fontWeight="bold"
                size="lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                📋 Копировать ссылку
              </MotionButton>

              <Text fontSize="sm" color="gray.400">
                Отправьте эту ссылку или ID комнаты другу
              </Text>

              <MotionButton
                variant="ghost"
                color="gray.400"
                onClick={() => {
                  if (roomId) {
                    deleteRoom(roomId).catch(console.error)
                  }
                  setMode('select')
                  setRoomId('')
                  setWaitingForPlayer(false)
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Отмена
              </MotionButton>
            </VStack>
          </MotionBox>
        </MotionBox>
      </>
    )
  }

  if (mode === 'create') {
    return (
      <>
        {notification && (
          <MotionBox
            position="fixed"
            top={4}
            left="50%"
            style={{ transform: 'translateX(-50%)' }}
            zIndex={1000}
            bg={notification.type === 'success' ? 'green.600' : 'red.600'}
            color="white"
            px={4}
            py={3}
            borderRadius="md"
            shadow="lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Text fontSize="sm" fontWeight="bold">
              {notification.type === 'success' ? '✓ ' : '✗ '}
              {notification.title}
            </Text>
            {notification.description && (
              <Text fontSize="xs" mt={1}>
                {notification.description}
              </Text>
            )}
          </MotionBox>
        )}
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
            borderColor="purple.500"
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
          >
            <MotionHeading
              as="h2"
              fontSize={{ base: '2xl', sm: '3xl' }}
              fontWeight="bold"
              mb={6}
              color="white"
            >
              Создать комнату
            </MotionHeading>

            {error && (
              <Box bg="red.900" color="red.100" p={3} borderRadius="md" mb={4} fontSize="sm">
                {error}
              </Box>
            )}

            <VStack gap={4}>
              <MotionButton
                w="full"
                onClick={handleCreateRoom}
                bgGradient="linear(to-r, indigo.600, purple.600, pink.600)"
                color="white"
                fontWeight="bold"
                size="lg"
                loading={isLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isLoading ? 'Создание...' : '🎮 Создать игру'}
              </MotionButton>

              <MotionButton
                variant="ghost"
                color="gray.400"
                onClick={() => {
                  setMode('select')
                  setError(null)
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Назад
              </MotionButton>
            </VStack>
          </MotionBox>
        </MotionBox>
      </>
    )
  }

  if (mode === 'join') {
    return (
      <>
        {notification && (
          <MotionBox
            position="fixed"
            top={4}
            left="50%"
            style={{ transform: 'translateX(-50%)' }}
            zIndex={1000}
            bg={notification.type === 'success' ? 'green.600' : 'red.600'}
            color="white"
            px={4}
            py={3}
            borderRadius="md"
            shadow="lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Text fontSize="sm" fontWeight="bold">
              {notification.type === 'success' ? '✓ ' : '✗ '}
              {notification.title}
            </Text>
            {notification.description && (
              <Text fontSize="xs" mt={1}>
                {notification.description}
              </Text>
            )}
          </MotionBox>
        )}
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
            borderColor="cyan.500"
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
          >
            <MotionHeading
              as="h2"
              fontSize={{ base: '2xl', sm: '3xl' }}
              fontWeight="bold"
              mb={6}
              color="white"
            >
              Присоединиться к игре
            </MotionHeading>

            {error && (
              <Box bg="red.900" color="red.100" p={3} borderRadius="md" mb={4} fontSize="sm">
                {error}
              </Box>
            )}

            <VStack gap={4}>
              <Input
                placeholder="Введите ID комнаты"
                value={roomId}
                onChange={(e) => {
                  setRoomId(e.target.value.toUpperCase())
                  setError(null)
                }}
                size="lg"
                bg="gray.700"
                color="white"
                borderColor="cyan.400"
                _focus={{ borderColor: 'cyan.300', boxShadow: '0 0 0 1px cyan.300' }}
                fontFamily="mono"
                textAlign="center"
                fontSize="xl"
                letterSpacing="wide"
                maxLength={10}
              />

              <MotionButton
                w="full"
                onClick={handleJoinRoom}
                bgGradient="linear(to-r, cyan.500, blue.500, indigo.600)"
                color="white"
                fontWeight="bold"
                size="lg"
                loading={isLoading}
                disabled={!roomId.trim() || isLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isLoading ? 'Присоединение...' : '🎯 Присоединиться'}
              </MotionButton>

              <MotionButton
                variant="ghost"
                color="gray.400"
                onClick={() => {
                  setMode('select')
                  setRoomId('')
                  setError(null)
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Назад
              </MotionButton>
            </VStack>
          </MotionBox>
        </MotionBox>
      </>
    )
  }

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
        borderColor="green.500"
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
      >
        <MotionHeading
          as="h2"
          fontSize={{ base: '2xl', sm: '3xl' }}
          fontWeight="bold"
          mb={6}
          color="white"
        >
          Онлайн игра
        </MotionHeading>

        <VStack gap={4}>
          <MotionButton
            w="full"
            onClick={() => setMode('create')}
            bgGradient="linear(to-r, indigo.600, purple.600, pink.600)"
            color="white"
            fontWeight="bold"
            size="lg"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            🎮 Создать комнату
          </MotionButton>

          <MotionButton
            w="full"
            onClick={() => setMode('join')}
            bgGradient="linear(to-r, cyan.500, blue.500, indigo.600)"
            color="white"
            fontWeight="bold"
            size="lg"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            🎯 Присоединиться к комнате
          </MotionButton>

          <MotionButton
            variant="ghost"
            color="gray.400"
            onClick={() => {
              useGameStore.getState().setGameMode(null)
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Назад
          </MotionButton>
        </VStack>
      </MotionBox>
    </MotionBox>
  )
}
