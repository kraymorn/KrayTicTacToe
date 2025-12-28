import { Box, Button, useBreakpointValue } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import type { CellValue } from '../types/game.types'

interface CellProps {
  value: CellValue
  onClick: () => void
  disabled: boolean
  isActive: boolean
}

const MotionButton = motion(Button)
const MotionBox = motion(Box)

export const Cell = ({ value, onClick, disabled, isActive }: CellProps) => {
  const strokeWidth = useBreakpointValue({ base: '12', md: '10' }) || '10'

  return (
    <MotionButton
      position="relative"
      w="full"
      h="full"
      display="flex"
      alignItems="center"
      justifyContent="center"
      border="1px solid"
      borderColor="gray.600"
      bg={isActive ? 'gray.800' : 'gray.900'}
      overflow="hidden"
      cursor={disabled ? 'not-allowed' : 'pointer'}
      opacity={disabled ? 0.3 : 1}
      p={0}
      minW={0}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!disabled) {
          onClick()
        }
      }}
      disabled={disabled}
      _hover={{}}
      _active={{}}
      whileHover={
        !disabled && !value
          ? {
              scale: 1.02,
              zIndex: 10,
              boxShadow: isActive
                ? 'inset 0 0 20px rgba(34, 197, 94, 0.3)'
                : 'inset 0 0 20px rgba(147, 51, 234, 0.2)',
            }
          : {}
      }
      whileTap={!disabled ? { scale: 0.98 } : {}}
      initial={false}
      animate={{
        scale: value ? 1 : 1,
        opacity: disabled ? 0.4 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
        boxShadow: { duration: 0.2 },
      }}
    >
      {/* Активный индикатор */}
      {isActive && !value && !disabled && (
        <MotionBox
          position="absolute"
          inset={0}
          border="2px solid"
          borderColor="green.500"
          opacity={0.6}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.6 }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
            repeatType: 'reverse',
            repeatDelay: 0.5,
          }}
        />
      )}

      {/* Символы - большие */}
      {value === 'X' && (
        <MotionBox
          position="relative"
          zIndex={10}
          w={{ base: '100%', sm: '95%', md: '100%' }}
          h={{ base: '100%', sm: '95%', md: '100%' }}
          display="flex"
          alignItems="center"
          justifyContent="center"
          initial={{ opacity: 0, scale: 0, rotate: -180 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
            duration: 0.4,
          }}
        >
          <svg
            viewBox="0 0 100 100"
            style={{ width: '100%', height: '100%' }}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          >
            <line x1="20" y1="20" x2="80" y2="80" />
            <line x1="80" y1="20" x2="20" y2="80" />
          </svg>
        </MotionBox>
      )}
      {value === 'O' && (
        <MotionBox
          position="relative"
          zIndex={10}
          w={{ base: '100%', sm: '95%', md: '100%' }}
          h={{ base: '100%', sm: '95%', md: '100%' }}
          display="flex"
          alignItems="center"
          justifyContent="center"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
            duration: 0.4,
          }}
        >
          <svg
            viewBox="0 0 100 100"
            style={{ width: '100%', height: '100%' }}
            fill="none"
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          >
            <circle cx="50" cy="50" r="30" />
          </svg>
        </MotionBox>
      )}
    </MotionButton>
  )
}
