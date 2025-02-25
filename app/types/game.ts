export type Difficulty = "easy" | "moderate" | "hard"

export interface Question {
  question: string
  options: string[]
  correct: number
  points: number
  used?: boolean
}

export interface Round {
  number: number
  topic: string
  questions: Question[]
  completed: boolean
}

export interface GameStats {
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

export interface GameState {
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
  currentTrader: string | { 
    name: string;
    tradesAccepted: number;
    tradesRejected: number;
  }
  stats: GameStats
  rounds: Round[]
  availableTopics: string[]
  selectedTopics: string[]
  questionBank: QuestionBank
  currentQuestionSet: Question[]
  gamePhase: "setup" | "playing" | "checkpoint" | "complete"
  currentParticipant: {
    name: string
    totalEarned: number
    checkpoints: number[]
  }
  checkpoints: {
    reached: number[]
    current: number
    amounts: number[]
  }
}

export type GameStatus = 
  | "waiting"
  | "participant_selection"
  | "topic_selection"
  | "trader_selection"
  | "question_phase"
  | "trading"
  | "checkpoint_reached"
  | "round_complete"
  | "trade_accepted"
  | "trade_rejected"
  | "game_complete" 