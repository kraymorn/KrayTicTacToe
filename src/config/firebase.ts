import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

// Конфигурация Firebase
// ВАЖНО: В продакшене эти данные должны быть в переменных окружения
// Для тестирования можно использовать значения из консоли Firebase
const firebaseConfig = {
  // Эти значения нужно будет заменить на реальные из вашего Firebase проекта
  // Получить их можно в Firebase Console -> Project Settings -> Your apps
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'your-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'alenkraytictactoe.firebaseapp.com',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    'https://alenkraytictactoe-default-rtdb.firebaseio.com',
  projectId: 'alenkraytictactoe',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'alenkraytictactoe.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'your-sender-id',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'your-app-id',
}

// Инициализация Firebase
const app = initializeApp(firebaseConfig)

// Инициализация Realtime Database
export const database = getDatabase(app)
export default app
