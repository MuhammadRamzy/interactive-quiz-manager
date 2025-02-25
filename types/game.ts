export type Difficulty = "easy" | "moderate" | "hard"

export type Question = {
  id: string
  question: string
  options: string[]
  correct: number
  points: number
}

export type TopicQuestions = {
  easy: Question[]
  moderate: Question[]
  hard: Question[]
}

export type QuestionBank = {
  [topic: string]: TopicQuestions
}

export type GameStats = {
  totalQuestions: number
  answeredQuestions: number
  correctAnswers: number
  totalEarned: number
  totalLost: number
  currentCheckpoint: number
  checkpointMoney: number
  trades: {
    accepted: number
    rejected: number
    totalAmount: number
  }
}

export type GameState = {
  status: string
  currentQuestion: Question | null
  timer: number
  timerRunning: boolean
  selectedOption: number | null
  revealAnswer: boolean
  currentRound: number
  questionNumber: number
  currentTopic: string
  difficulty: Difficulty
  tradeAmount: number
  currentPlayer: string
  currentTrader: {
    name: string;
    tradesAccepted: number;
    tradesRejected: number;
  }
  stats: GameStats
  availableTopics: string[]
  selectedTopics: string[]
  questionBank: QuestionBank | null
  currentQuestionSet: Question[]
}

