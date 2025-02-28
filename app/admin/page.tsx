"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Users, Award, Brain, Play, Pause, RotateCcw, DollarSign, X, Sparkles, Sun, Zap, Cloud } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import questionData from "@/data/questions.json"
import type { GameState, Question, QuestionBank, GameStats, Difficulty, GameStatus } from "@/types/game"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const initialGameState: GameState = {
  status: "waiting",
  currentQuestion: null,
  timer: 30,
  timerRunning: false,
  selectedOption: null,
  revealAnswer: false,
  currentRound: 1,
  questionNumber: 1,
  currentTopic: "",
  difficulty: "moderate",
  tradeAmount: 0,
  currentPlayer: "Player 1",
  currentTrader: "",
  stats: {
    totalQuestions: 15,
    answeredQuestions: 0,
    correctAnswers: 0,
    totalEarned: 0,
    totalLost: 0,
    currentCheckpoint: 0,
    checkpointMoney: 0,
    trades: {
      accepted: 0,
      rejected: 0,
      totalAmount: 0,
    },
  },
  availableTopics: Object.keys(questionData),
  selectedTopics: [],
  questionBank: questionData as QuestionBank,
  currentQuestionSet: [],
  rounds: [
    { number: 1, topic: "", questions: [], completed: false },
    { number: 2, topic: "", questions: [], completed: false },
    { number: 3, topic: "", questions: [], completed: false }
  ],
  gamePhase: "setup",
  currentParticipant: {
    name: "",
    totalEarned: 0,
    checkpoints: [],
  },
  currentTrader: {
    name: "",
    tradesAccepted: 0,
    tradesRejected: 0,
  },
  checkpoints: {
    reached: [],
    current: 0,
    amounts: [],
  },
}

interface QuestionWithIndex extends Question {
  index: number;
}

interface RoundState {
  number: number
  topic: string
  questions: Question[]
  completed: boolean
}

// Add new animation types
type AnimationType = 'confetti' | 'spotlight' | 'fireworks' | 'rain' | 'pulse';

export default function AdminPanel() {
  const [mounted, setMounted] = useState(false)
  const [channel] = useState(() => new BroadcastChannel("game-channel"))
  const [gameState, setGameState] = useState<GameState>(initialGameState)
  const [customTradeAmount, setCustomTradeAmount] = useState("")
  const [availableQuestions, setAvailableQuestions] = useState<QuestionWithIndex[]>([])
  const [questionQueue, setQuestionQueue] = useState<Question[]>([])
  const [rounds, setRounds] = useState<RoundState[]>([
    { number: 1, topic: "", questions: [], completed: false },
    { number: 2, topic: "", questions: [], completed: false },
    { number: 3, topic: "", questions: [], completed: false }
  ])
  const [traderName, setTraderName] = useState("")
  const [isTraderDialogOpen, setIsTraderDialogOpen] = useState(false)
  const [pulseColor, setPulseColor] = useState("blue")

  // Add timer interval ref
  const timerInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize BroadcastChannel in useEffect
  useEffect(() => {
    if (!mounted) return;

    // Channel message handler
    const handleMessage = (event: MessageEvent) => {
      // ... existing message handling ...
    }

    channel.onmessage = handleMessage

    return () => {
      channel.close()
    }
  }, [mounted, channel])

  // Update the timer effect
  useEffect(() => {
    if (gameState.timerRunning && gameState.timer > 0) {
      timerInterval.current = setInterval(() => {
        setGameState(prev => {
          const newTimer = prev.timer - 1;
          
          // Handle timeout
          if (newTimer === 0) {
            // Automatically handle as incorrect answer after timeout
            handleTimeout();
          }
          
          // Broadcast timer update
          channel.postMessage({
            type: "TIMER_UPDATE",
            timer: newTimer
          });

          return {
            ...prev,
            timer: newTimer
          };
        });
      }, 1000);
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [gameState.timerRunning, gameState.timer]);

  // Add timeout handler
  const handleTimeout = () => {
    if (!gameState.currentQuestion) return;

    // Stop the timer
    stopTimer();

    // Mark as incorrect
    setGameState(prev => ({
      ...prev,
      revealAnswer: true,
      isCorrect: false
    }));

    // Broadcast timeout
    channel.postMessage({
      type: "TIMEOUT",
      correctIndex: gameState.currentQuestion.correct,
      isCorrect: false
    });

    // After 3 seconds, move back to question phase
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        revealAnswer: false,
        selectedOption: null,
        timer: 30
      }));
    }, 3000);
  };

   const audioRef = useRef<HTMLAudioElement | null>(null);

   const startTimer = () => {
     setGameState((prev) => ({ ...prev, timerRunning: true }));
     channel.postMessage({ type: "TIMER_START" });

     if (!audioRef.current) {
       audioRef.current = new Audio("/clock-ticking.mp3");
       audioRef.current.loop = true;
     }

     audioRef.current.play();
   };

   const stopTimer = () => {
     setGameState((prev) => ({ ...prev, timerRunning: false }));
     channel.postMessage({ type: "TIMER_STOP" });

     if (audioRef.current) {
       audioRef.current.pause();
       audioRef.current.currentTime = 0;
     }
   };


  const handleOptionSelect = (optionIndex: number) => {
    if (gameState.revealAnswer) return; // Don't allow selection after reveal

    setGameState(prev => ({ ...prev, selectedOption: optionIndex }));
    channel.postMessage({
      type: "SELECT_OPTION",
      optionIndex,
      gameState: {
        ...gameState,
        selectedOption: optionIndex
      }
    });
  };

  const revealAnswer = () => {
    if (!gameState.currentQuestion) return

    const isCorrect = gameState.selectedOption === gameState.currentQuestion.correct
    setGameState(prev => ({
      ...prev,
      revealAnswer: true,
      isCorrect
    }))

    channel.postMessage({
      type: "REVEAL_ANSWER",
      correctIndex: gameState.currentQuestion.correct,
      isCorrect
    })
  }

  useEffect(() => {
    if (gameState.currentTopic && gameState.questionBank) {
      const questions = gameState.questionBank[gameState.currentTopic][gameState.difficulty]
      const questionsWithIndex = questions.map((q, index) => ({ ...q, index }))
      setAvailableQuestions(questionsWithIndex)
      setGameState((prev) => ({
        ...prev,
        currentQuestionSet: questions,
      }))
    }
  }, [gameState.currentTopic, gameState.difficulty, gameState.questionBank])

  const updateStatus = (status: string) => {
    setGameState((prev) => ({ ...prev, status }))
    channel.postMessage({
      type: "STATUS_UPDATE",
      status,
      gameState: {
        ...gameState,
        status,
      },
    })
  }

  // Function to handle round topic selection
  const selectRoundTopic = (roundNumber: number, topic: string) => {
    if (!gameState.questionBank || !topic) return;

    const questions = gameState.questionBank[topic][gameState.difficulty].slice(0, 5);
    
    setRounds(prev => prev.map(round => 
      round.number === roundNumber 
        ? { ...round, topic, questions }
        : round
    ));

    const newGameState = {
      ...gameState,
      currentRound: roundNumber,
      currentTopic: topic,
      availableTopics: gameState.availableTopics.filter(t => t !== topic),
      selectedTopics: [...gameState.selectedTopics, topic]
    };

    setGameState(newGameState);

    // Load questions for the selected topic
    if (gameState.questionBank) {
      const questions = gameState.questionBank[topic][gameState.difficulty];
      const questionsWithIndex = questions.map((q, index) => ({ ...q, index }));
      setAvailableQuestions(questionsWithIndex);
    }

    // Broadcast topic selection to presentation
    channel.postMessage({
      type: "TOPIC_SELECTED",
      gameState: newGameState
    });
  }

  // Function to complete a round
  const completeRound = (roundNumber: number) => {
    setRounds(prev => prev.map(round => 
      round.number === roundNumber 
        ? { ...round, completed: true }
        : round
    ));

    // Move to next round if available
    const nextRound = rounds.find(r => r.number > roundNumber && !r.completed);
    if (nextRound) {
      setGameState(prev => ({
        ...prev,
        currentRound: nextRound.number,
        status: "question_selection"
      }));
    } else {
      // Game complete
      setGameState(prev => ({
        ...prev,
        status: "game_complete"
      }));
    }
  }

  // Function to handle question completion
  const handleQuestionComplete = (correct: boolean) => {
    const points = gameState.currentQuestion?.points || 0;
    const newStats = {
      ...gameState.stats,
      answeredQuestions: gameState.stats.answeredQuestions + 1,
      correctAnswers: gameState.stats.correctAnswers + (correct ? 1 : 0),
      totalEarned: gameState.stats.totalEarned + (correct ? points : 0),
    };

    // Check for checkpoint
    if (gameState.questionNumber % 5 === 0) {
      newStats.checkpointMoney = newStats.totalEarned;
      newStats.currentCheckpoint = Math.floor(gameState.questionNumber / 5);
      
      // Complete current round
      completeRound(gameState.currentRound);
    }

    setGameState(prev => ({
      ...prev,
      stats: newStats,
      questionNumber: prev.questionNumber + 1
    }));

    channel.postMessage({
      type: "STATS_UPDATE",
      stats: newStats
    });
  }

  const pushQuestion = (question: Question) => {
    // Mark the question as used
    const updatedQuestions = availableQuestions.map(q => 
      q.index === (question as QuestionWithIndex).index 
        ? { ...q, used: true }
        : q
    );
    setAvailableQuestions(updatedQuestions);

    const gameStateUpdate = {
      ...gameState,
      currentQuestion: question,
      timer: 30,
      timerRunning: false,
      selectedOption: null,
      revealAnswer: false,
    };

    setGameState(gameStateUpdate);
    
    // Broadcast the question
    channel.postMessage({
      type: "PUSH_QUESTION",
      question,
      gameState: gameStateUpdate
    });
  }

  const handleAnswer = (correct: boolean) => {
    const earnedPoints = correct ? gameState.currentQuestion?.points || 0 : 0
    const newStats = {
      ...gameState.stats,
      answeredQuestions: gameState.stats.answeredQuestions + 1,
      correctAnswers: gameState.stats.correctAnswers + (correct ? 1 : 0),
      totalEarned: gameState.stats.totalEarned + earnedPoints,
    }

    // Check for checkpoint (every 5 questions)
    if (gameState.questionNumber % 5 === 0) {
      newStats.checkpointMoney = newStats.totalEarned
      newStats.currentCheckpoint = Math.floor(gameState.questionNumber / 5)
    }

    setGameState((prev) => ({
      ...prev,
      stats: newStats,
    }))

    channel.postMessage({
      type: "STATS_UPDATE",
      stats: newStats,
    })
  }

  const handleTrade = (accepted: boolean) => {
    const tradeStats = {
      ...gameState.stats.trades,
      accepted: gameState.stats.trades.accepted + (accepted ? 1 : 0),
      rejected: gameState.stats.trades.rejected + (accepted ? 0 : 1),
      totalAmount: gameState.stats.trades.totalAmount + (accepted ? gameState.tradeAmount : 0),
    };

    setGameState((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        trades: tradeStats,
        totalLost: prev.stats.totalLost + (accepted ? gameState.tradeAmount : 0),
      },
    }));

    // Send trade result to presentation
    channel.postMessage({
      type: accepted ? "TRADE_ACCEPTED" : "TRADE_REJECTED",
      tradeAmount: gameState.tradeAmount,
      traderName: gameState.currentTrader.name
    });

    updateStatus(accepted ? "trade_accepted" : "trade_rejected");

    // Return to question phase after 5 seconds
    setTimeout(() => {
      updateStatus("question_phase");
    }, 5000);
  };

  // Function to add question to queue
  const addToQueue = (question: Question) => {
    setQuestionQueue(prev => [...prev, question])
  }

  // Function to remove question from queue
  const removeFromQueue = (index: number) => {
    setQuestionQueue(prev => prev.filter((_, i) => i !== index))
  }

  // Function to push next question
  const pushNextQuestion = () => {
    if (questionQueue.length > 0) {
      const nextQuestion = questionQueue[0]
      pushQuestion(nextQuestion)
      removeFromQueue(0)
      setGameState(prev => ({
        ...prev,
        questionNumber: prev.questionNumber + 1
      }))
    }
  }

  // Add function to manually update stats
  const updateStats = (updates: Partial<GameStats>) => {
    setGameState(prev => ({
      ...prev,
      stats: { ...prev.stats, ...updates }
    }))
    channel.postMessage({
      type: "STATS_UPDATE",
      stats: { ...gameState.stats, ...updates }
    })
  }

  // Add these functions
  const updateParticipant = (updates: Partial<typeof gameState.currentParticipant>) => {
    setGameState(prev => ({
      ...prev,
      currentParticipant: { ...prev.currentParticipant, ...updates }
    }));

    channel.postMessage({
      type: "PARTICIPANT_UPDATE",
      gameState: {
        ...gameState,
        currentParticipant: { ...gameState.currentParticipant, ...updates }
      }
    });
  };

  const updateTrader = (updates: { name: string }) => {
    setGameState(prev => ({
      ...prev,
      currentTrader: updates.name
    }));

    channel.postMessage({
      type: "TRADER_UPDATE",
      gameState: {
        ...gameState,
        currentTrader: updates.name
      }
    });
  };

  const proceedToPhase = (newStatus: string) => {
    if (newStatus === "trader_selection" && gameState.currentTopic) {
      // Show topic confirmation animation first
      setGameState(prev => ({
        ...prev,
        status: "topic_confirmed"
      }));

      channel.postMessage({
        type: "STATUS_UPDATE",
        gameState: {
          ...gameState,
          status: "topic_confirmed"
        }
      });

      // Then proceed to trader selection after animation
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          status: "trader_selection"
        }));

        channel.postMessage({
          type: "STATUS_UPDATE",
          gameState: {
            ...gameState,
            status: "trader_selection"
          }
        });
      }, 2000);
    } else {
      setGameState(prev => ({
        ...prev,
        status: newStatus
      }));

      channel.postMessage({
        type: "STATUS_UPDATE",
        gameState: {
          ...gameState,
          status: newStatus
        }
      });
    }
  };

  const startRound = () => {
    setGameState(prev => ({
      ...prev,
      gamePhase: "playing",
      status: "question_phase"
    }));

    channel.postMessage({
      type: "START_ROUND",
      gameState: {
        ...gameState,
        gamePhase: "playing",
        status: "question_phase"
      }
    });
  };

  // Add this function with the other state management functions
  const startGame = () => {
    // Set game state to started
    setGameState(prev => ({
      ...prev,
      status: "game_started",
      gamePhase: "playing"
    }));

    // Load initial questions based on current topic and difficulty
    if (gameState.currentTopic && gameState.questionBank) {
      const questions = gameState.questionBank[gameState.currentTopic][gameState.difficulty];
      const questionsWithIndex = questions.map((q, index) => ({ ...q, index }));
      setAvailableQuestions(questionsWithIndex);

      // Push first question automatically after short delay
      setTimeout(() => {
        if (questions.length > 0) {
          pushQuestion(questions[0]);
          updateStatus("question_phase");
        }
      }, 3000); // 3 second delay to allow for start animation
    }

    // Broadcast game start
    channel.postMessage({
      type: "GAME_START",
      gameState: {
        ...gameState,
        status: "game_started",
        gamePhase: "playing"
      }
    });
  };

  // Update the participant selection section
  const renderParticipantSelection = () => (
    <div className={`p-4 rounded-lg border-2 ${
      gameState.status === "participant_selection" ? "border-blue-500" : "border-gray-200"
    }`}>
      <h3 className="font-semibold mb-2">1. Select Participant</h3>
      <Input
        placeholder="Participant Name"
        value={gameState.currentParticipant.name}
        onChange={(e) => updateParticipant({ name: e.target.value })}
      />
      <Button
        onClick={() => proceedToPhase("topic_selection")}
        disabled={!gameState.currentParticipant.name}
        className="w-full mt-2"
      >
        Confirm
      </Button>
    </div>
  );

  // Add this function after renderParticipantSelection and before renderTraderSelection
  const renderTopicSelection = () => (
    <div className={`p-4 rounded-lg border-2 ${
      gameState.status === "topic_selection" ? "border-blue-500" : "border-gray-200"
    }`}>
      <h3 className="font-semibold mb-2">2. Select Topic</h3>
      <div className="space-y-3">
        <Select
          value={gameState.currentTopic}
          onValueChange={(topic) => selectRoundTopic(gameState.currentRound, topic)}
          disabled={gameState.status !== "topic_selection"}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose Topic" />
          </SelectTrigger>
          <SelectContent>
            {gameState.availableTopics.map((topic) => (
              <SelectItem key={topic} value={topic}>
                {topic}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {gameState.currentTopic && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">Selected Topic</div>
            <div className="font-medium">{gameState.currentTopic}</div>
            <div className="text-sm text-gray-500 mt-2">Round {gameState.currentRound}</div>
          </div>
        )}

        <Button
          onClick={() => proceedToPhase("trader_selection")}
          disabled={!gameState.currentTopic}
          className="w-full bg-blue-600 text-white"
        >
          Confirm Topic
        </Button>
      </div>
    </div>
  );

  // Update the trader selection section
  const renderTraderSelection = () => (
    <div className={`p-4 rounded-lg border-2 ${
      gameState.status === "trader_selection" ? "border-blue-500" : "border-gray-200"
    }`}>
      <h3 className="font-semibold mb-2">3. Start Game</h3>
      <Button
        onClick={startGame}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        Start Game
      </Button>
    </div>
  );

  // Update the current question display
  const renderCurrentQuestion = () => (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Current Question</h2>
        {gameState.currentQuestion && (
          <Badge variant="outline" className="text-lg">
            ₹{gameState.currentQuestion.points.toLocaleString()}
          </Badge>
        )}
      </div>
      {gameState.currentQuestion ? (
        <div className="space-y-4">
          <p className="text-lg font-medium">{gameState.currentQuestion.question}</p>
          <div className="grid grid-cols-2 gap-3">
            {gameState.currentQuestion.options.map((option, idx) => (
              <Button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                variant={gameState.selectedOption === idx ? "default" : "outline"}
                className={`p-4 h-auto text-left justify-start ${
                  gameState.revealAnswer
                    ? idx === gameState.currentQuestion?.correct
                      ? 'bg-green-100 text-green-700 hover:bg-green-100'
                      : gameState.selectedOption === idx
                      ? 'bg-red-100 text-red-700 hover:bg-red-100'
                      : 'bg-gray-100'
                    : gameState.selectedOption === idx
                    ? 'bg-blue-100 text-blue-700'
                    : ''
                }`}
              >
                <div>
                  <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                  {option}
                </div>
              </Button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => revealAnswer()}
              variant="outline"
              className="bg-yellow-100 text-yellow-700 border-yellow-300"
              disabled={gameState.selectedOption === null}
            >
              Reveal Answer
            </Button>
            <Button
              onClick={() => updateStatus("trading")}
              className="bg-blue-600"
            >
              Start Trade
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No question currently active
        </div>
      )}
    </Card>
  );

  // Update the game controls section
  const renderGameControls = () => (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Game Controls</h2>
        <Badge variant="outline" className="capitalize">
          {gameState.status}
        </Badge>
      </div>
      {gameState.status === "trader_selection" && (
        <Button
          onClick={startGame}
          className="w-full bg-green-600 hover:bg-green-700"
          size="lg"
        >
          Start Game
        </Button>
      )}
    </Card>
  );

  // Update the renderTradeControls function
  const renderTradeControls = () => (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Trade Controls</h2>
      <div className="space-y-4">
        {/* Quick Amount Selection */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Quick Amounts</label>
          <div className="grid grid-cols-2 gap-2">
            {[5000, 10000, 15000, 20000].map((amount) => (
              <Button
                key={amount}
                onClick={() => {
                  setGameState(prev => ({ ...prev, tradeAmount: amount }));
                  channel.postMessage({
                    type: "TRADE_UPDATE",
                    amount
                  });
                }}
                variant="outline"
                size="sm"
              >
                ₹{amount.toLocaleString()}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Custom Amount</label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Enter amount"
              value={customTradeAmount}
              onChange={(e) => setCustomTradeAmount(e.target.value)}
            />
            <Button
              onClick={() => {
                const amount = parseInt(customTradeAmount);
                if (!isNaN(amount)) {
                  setGameState(prev => ({ ...prev, tradeAmount: amount }));
                  channel.postMessage({
                    type: "TRADE_UPDATE",
                    amount
                  });
                }
              }}
              className="bg-blue-600"
            >
              Set
            </Button>
          </div>
        </div>

        {/* Start Trade Button */}
        <Button
          onClick={() => setIsTraderDialogOpen(true)}
          className="w-full bg-yellow-600"
        >
          Start Trade
        </Button>

        {/* Trade Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => handleTrade(true)}
            className="flex-1 bg-green-600"
          >
            Accept Trade
          </Button>
          <Button
            onClick={() => handleTrade(false)}
            className="flex-1 bg-red-600"
          >
            Reject Trade
          </Button>
        </div>
      </div>

      {/* Trader Name Dialog */}
      <Dialog open={isTraderDialogOpen} onOpenChange={setIsTraderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Trader Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Trader Name"
              value={traderName}
              onChange={(e) => setTraderName(e.target.value)}
            />
            <Button
              onClick={() => {
                if (traderName) {
                  updateTrader({ name: traderName });
                  updateStatus("trading");
                  setIsTraderDialogOpen(false);
                }
              }}
              className="w-full bg-green-600"
              disabled={!traderName}
            >
              Start Trading
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );

  // Update the question management layout
  const renderQuestionManagement = () => {
    const filteredQuestions = availableQuestions.filter(q => !q.used);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold">Question Bank</h2>
          <div className="flex items-center gap-3">
            <Select
              value={gameState.difficulty}
              onValueChange={(diff: Difficulty) => {
                setGameState(prev => ({ ...prev, difficulty: diff }));
                if (gameState.currentTopic) {
                  const questions = gameState.questionBank[gameState.currentTopic][diff];
                  setAvailableQuestions(questions.map((q, index) => ({ ...q, index })));
                }
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
            <Badge className="bg-blue-100 text-blue-700">
              {filteredQuestions.length} Questions
            </Badge>
          </div>
        </div>

        {/* Question Queue */}
        <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-none">
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900">Question Queue</h3>
              </div>
              <Badge variant="outline" className="bg-purple-100 text-purple-700">
                {questionQueue.length} in Queue
              </Badge>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-2">
              {questionQueue.map((question, idx) => (
                <div 
                  key={idx}
                  className="bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0 mt-1">
                      #{idx + 1}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 mb-1 line-clamp-2">
                        {question.question}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2 text-xs text-gray-500">
                          {question.options.map((opt, i) => (
                            <span key={i} className={`px-1.5 py-0.5 rounded ${
                              i === question.correct ? 'bg-green-100 text-green-700' : 'bg-gray-100'
                            }`}>
                              {String.fromCharCode(65 + i)}
                            </span>
                          ))}
                        </div>
                        <Badge className="bg-green-100 text-green-700 shrink-0">
                          ₹{question.points.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromQueue(idx)}
                      className="text-red-500 h-7 w-7 p-0 hover:text-red-700 hover:bg-red-50 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {questionQueue.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No questions in queue
                </div>
              )}
            </div>
            {questionQueue.length > 0 && (
              <Button
                onClick={pushNextQuestion}
                className="w-full mt-3 bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                Push Next Question
              </Button>
            )}
          </div>
        </Card>

        {/* Available Questions */}
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Available Questions</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 max-h-[1000px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-2">
            {filteredQuestions.map((question, idx) => (
              <Card 
                key={idx} 
                className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-2">
                      <Badge className="bg-green-100 text-green-700">
                        ₹{question.points.toLocaleString()}
                      </Badge>
                      <Badge variant="outline">Q{idx + 1}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => addToQueue(question)}
                        size="sm"
                        variant="outline"
                        className="hover:bg-blue-50"
                      >
                        Queue
                      </Button>
                      <Button
                        onClick={() => pushQuestion(question)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Push
                      </Button>
                    </div>
                  </div>
                  <p className="font-medium mb-3 text-gray-800 line-clamp-2">
                    {question.question}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {question.options.map((option, optIdx) => (
                      <div
                        key={optIdx}
                        className={`p-3 rounded-lg text-sm ${
                          optIdx === question.correct
                            ? 'bg-green-50 text-green-700 font-medium border border-green-200'
                            : 'bg-gray-50 border border-gray-100'
                        }`}
                      >
                        <span className="font-bold mr-2">{String.fromCharCode(65 + optIdx)}.</span>
                        <span className="line-clamp-1">{option}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
            {filteredQuestions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No questions available
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Add this component for manual stats adjustment
  const renderStatsAdjustment = () => (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Manual Stats Adjustment</h2>
      <div className="space-y-4">
        {/* Questions Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Questions Answered
            </label>
            <Input
              type="number"
              value={gameState.stats.answeredQuestions}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  updateStats({ answeredQuestions: value });
                }
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Correct Answers
            </label>
            <Input
              type="number"
              value={gameState.stats.correctAnswers}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  updateStats({ correctAnswers: value });
                }
              }}
            />
          </div>
        </div>

        {/* Money Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Total Earned
            </label>
            <Input
              type="number"
              value={gameState.stats.totalEarned}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  updateStats({ totalEarned: value });
                }
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Checkpoint Money
            </label>
            <Input
              type="number"
              value={gameState.stats.checkpointMoney}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  updateStats({ checkpointMoney: value });
                }
              }}
            />
          </div>
        </div>

        {/* Trade Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Trades Accepted
            </label>
            <Input
              type="number"
              value={gameState.stats.trades.accepted}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  updateStats({
                    trades: { ...gameState.stats.trades, accepted: value }
                  });
                }
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Trades Rejected
            </label>
            <Input
              type="number"
              value={gameState.stats.trades.rejected}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  updateStats({
                    trades: { ...gameState.stats.trades, rejected: value }
                  });
                }
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Total Traded
            </label>
            <Input
              type="number"
              value={gameState.stats.trades.totalAmount}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  updateStats({
                    trades: { ...gameState.stats.trades, totalAmount: value }
                  });
                }
              }}
            />
          </div>
        </div>

        {/* Reset Button */}
        <Button
          onClick={() => {
            updateStats({
              answeredQuestions: 0,
              correctAnswers: 0,
              totalEarned: 0,
              checkpointMoney: 0,
              trades: {
                accepted: 0,
                rejected: 0,
                totalAmount: 0
              }
            });
          }}
          variant="outline"
          className="w-full text-red-600 border-red-600 hover:bg-red-50"
        >
          Reset All Stats
        </Button>
      </div>
    </Card>
  );

  // Add this component for animation controls
  const renderAnimationControls = () => (
    <Card className="p-6 grid-cols-3">
      <h2 className="text-xl font-semibold mb-4">Visual Effects</h2>
      <div className="space-y-4">
        {/* Quick Effects */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Quick Effects
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => triggerAnimation('confetti')}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Confetti
            </Button>
            <Button
              onClick={() => triggerAnimation('spotlight')}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
            >
              <Sun className="w-4 h-4 mr-2" />
              Spotlight
            </Button>
            <Button
              onClick={() => triggerAnimation('fireworks')}
              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
            >
              <Zap className="w-4 h-4 mr-2" />
              Fireworks
            </Button>
            <Button
              onClick={() => triggerAnimation('rain')}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              <Cloud className="w-4 h-4 mr-2" />
              Money Rain
            </Button>
          </div>
        </div>

        {/* Lighting Controls */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Lighting Effects
          </label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => triggerLighting('success')}
              className="bg-green-600 hover:bg-green-700"
            >
              Success
            </Button>
            <Button
              onClick={() => triggerLighting('warning')}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Warning
            </Button>
            <Button
              onClick={() => triggerLighting('error')}
              className="bg-red-600 hover:bg-red-700"
            >
              Error
            </Button>
          </div>
        </div>

        {/* Pulse Effect */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Pulse Effect
          </label>
          <div className="flex gap-2">
            <Select
              value={pulseColor}
              onValueChange={setPulseColor}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blue">Blue</SelectItem>
                <SelectItem value="green">Green</SelectItem>
                <SelectItem value="yellow">Yellow</SelectItem>
                <SelectItem value="red">Red</SelectItem>
                <SelectItem value="purple">Purple</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => triggerAnimation('pulse')}
              className="flex-1"
            >
              Pulse
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );

  // Helper functions
  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy": return "bg-green-600 hover:bg-green-700";
      case "hard": return "bg-red-600 hover:bg-red-700";
      default: return "bg-blue-600 hover:bg-blue-700";
    }
  };

  const getDifficultyDescription = (diff: string) => {
    switch (diff) {
      case "easy": return "Lower points, easier questions";
      case "hard": return "Higher points, tougher questions";
      default: return "Balanced difficulty and points";
    }
  };

  // Add this effect to handle game phase transitions
  useEffect(() => {
    if (gameState.status === "game_started") {
      // After 3 seconds, transition to the first question
      const timer = setTimeout(() => {
        updateStatus("question_phase");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [gameState.status]);

  // Add these functions to handle animations
  const triggerAnimation = (type: AnimationType) => {
    channel.postMessage({
      type: "TRIGGER_ANIMATION",
      animationType: type,
      color: pulseColor
    });
  };

  const triggerLighting = (type: 'success' | 'warning' | 'error') => {
    channel.postMessage({
      type: "TRIGGER_LIGHTING",
      lightingType: type
    });
  };

  // Update the main return to include the new component
  if (!mounted) {
    return null // or a loading spinner
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-10">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-800">Game Control Panel</h1>
              <Badge variant="outline" className="text-lg px-4 py-2">
                Round {gameState.currentRound}/3
              </Badge>
              <Badge variant="outline" className="text-lg px-4 py-2">
                Question {gameState.questionNumber}/15
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Current Player</div>
                <div className="font-semibold">{gameState.currentParticipant.name}</div>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2 capitalize">
                {gameState.difficulty} Level
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 px-6 pb-6">
        <div className="max-w-[1920px] mx-auto grid grid-cols-12 gap-6">
          {/* Game Control Panel - Left Sidebar */}
          <div className="col-span-3 space-y-4">
            {/* Game Phase Indicator */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-3">Game Status</h2>
              <div className="space-y-3">
                {/* Game Phase Steps */}
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    gameState.status === "participant_selection" ? "bg-blue-500" : "bg-gray-300"
                  }`} />
                  <span className={gameState.status === "participant_selection" ? "font-medium" : ""}>
                    Participant Selection
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    gameState.status === "topic_selection" ? "bg-blue-500" : "bg-gray-300"
                  }`} />
                  <span className={gameState.status === "topic_selection" ? "font-medium" : ""}>
                    Topic Selection
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    gameState.status === "trader_selection" ? "bg-blue-500" : "bg-gray-300"
                  }`} />
                  <span className={gameState.status === "trader_selection" ? "font-medium" : ""}>
                    Trader Selection
                  </span>
                </div>
              </div>
            </Card>

            {/* Timer Control */}
            <Card className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Timer Control</h2>
                <span className="text-3xl font-mono font-bold">{gameState.timer}s</span>
              </div>
              <Progress value={(gameState.timer / 30) * 100} className="h-2 mb-3" />
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={startTimer}
                  disabled={gameState.timerRunning}
                  className="bg-green-600"
                >
                  <Play className="h-4 w-4" />
                </Button>
                <Button
                  onClick={stopTimer}
                  disabled={!gameState.timerRunning}
                  className="bg-red-600"
                >
                  <Pause className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => {
                    setGameState(prev => ({ ...prev, timer: 30 }));
                    channel.postMessage({ type: "TIMER_UPDATE", timer: 30 });
                  }}
                  className="bg-yellow-600"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            {/* Animation Controls */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Visual Effects</h2>
              <div className="space-y-4">
                {/* Quick Effects */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Quick Effects
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => triggerAnimation('confetti')}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Confetti
                    </Button>
                    <Button
                      onClick={() => triggerAnimation('spotlight')}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                    >
                      <Sun className="w-4 h-4 mr-2" />
                      Spotlight
                    </Button>
                    <Button
                      onClick={() => triggerAnimation('fireworks')}
                      className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Fireworks
                    </Button>
                    <Button
                      onClick={() => triggerAnimation('rain')}
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    >
                      <Cloud className="w-4 h-4 mr-2" />
                      Money Rain
                    </Button>
                  </div>
                </div>

                {/* Lighting Controls */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Lighting Effects
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      onClick={() => triggerLighting('success')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Success
                    </Button>
                    <Button
                      onClick={() => triggerLighting('warning')}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      Warning
                    </Button>
                    <Button
                      onClick={() => triggerLighting('error')}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Error
                    </Button>
                  </div>
                </div>

                {/* Pulse Effect */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Pulse Effect
                  </label>
                  <div className="flex gap-2">
                    <Select
                      value={pulseColor}
                      onValueChange={setPulseColor}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blue">Blue</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                        <SelectItem value="yellow">Yellow</SelectItem>
                        <SelectItem value="red">Red</SelectItem>
                        <SelectItem value="purple">Purple</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => triggerAnimation('pulse')}
                      className="flex-1"
                    >
                      Pulse
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Stats */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-3">Game Stats</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Questions</div>
                  <div className="text-xl font-bold">{gameState.stats.answeredQuestions}/15</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Correct</div>
                  <div className="text-xl font-bold text-green-600">{gameState.stats.correctAnswers}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Earned</div>
                  <div className="text-xl font-bold text-blue-600">₹{gameState.stats.totalEarned.toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Checkpoint</div>
                  <div className="text-xl font-bold text-purple-600">₹{gameState.stats.checkpointMoney.toLocaleString()}</div>
                </div>
              </div>
            </Card>

            {renderStatsAdjustment()}
          </div>

          {/* Main Game Area - Center */}
          <div className="col-span-6 space-y-4">
            {/* Game Flow Steps */}
            <Card className="p-6">
              <div className="grid grid-cols-3 gap-6">
                {renderParticipantSelection()}
                {renderTopicSelection()}
                {renderTraderSelection()}
              </div>
            </Card>

            {/* Current Question Display */}
            {renderCurrentQuestion()}
            {renderTradeControls()}
          </div>

          {/* Right Sidebar - Question Management */}
          <div className="col-span-3 space-y-4">
            {renderQuestionManagement()}
          </div>
        </div>
      </div>
    </div>
  )
}

