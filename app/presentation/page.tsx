"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  DollarSign,
  Trophy,
  Target,
  Brain,
  Users,
  Timer,
  Award,
} from "lucide-react";
import type { GameState, Question } from "@/types/game";
import confetti from "canvas-confetti";
import Image from "next/image";

// Add this interface above the component
interface Question {
  question: string;
  options: string[];
  correct: number;
  points?: number;
}

interface GameState {
  status: string;
  currentQuestion: Question | null;
  timer: number;
  timerRunning: boolean;
  selectedOption: number | null;
  revealAnswer: boolean;
  correctAnswer: number | null;
  isCorrect: boolean;
  currentRound: number;
  questionNumber: number;
  tradeAmount: number;
  currentPlayer: string;
  currentTrader: {
    name: string;
    tradesAccepted: number;
    tradesRejected: number;
  };
  difficulty: string;
  stats?: {
    answeredQuestions: number;
    correctAnswers: number;
    totalEarned: number;
    checkpointMoney: number;
  };
  availableTopics: string[];
  currentTopic: string;
  currentParticipant?: { name: string };
}

// Add these confetti helper functions
const fireConfetti = (type: "success" | "checkpoint" = "success") => {
  const colors =
    type === "success"
      ? ["#4ade80", "#22c55e"] // Green shades
      : ["#fcd34d", "#f59e0b"]; // Gold shades

  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: colors,
  });

  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors,
    });

    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors,
    });
  }, 250);
};

export default function PresentationScreen() {
  const [mounted, setMounted] = useState(false);
  const [channel] = useState(() => new BroadcastChannel("game-channel"));
  const [gameState, setGameState] = useState<GameState>({
    status: "waiting",
    currentQuestion: null,
    timer: 30,
    timerRunning: false,
    selectedOption: null,
    revealAnswer: false,
    correctAnswer: null,
    isCorrect: false,
    currentRound: 1,
    questionNumber: 1,
    tradeAmount: 0,
    currentPlayer: "Player 1",
    currentTrader: {
      name: "",
      tradesAccepted: 0,
      tradesRejected: 0,
    },
    difficulty: "moderate",
    availableTopics: [],
    currentTopic: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, ...data } = event.data;
      console.log("Received message:", type, data); // Add logging for debugging

      switch (type) {
        case "STATUS_UPDATE":
          setGameState((prev) => ({ ...prev, ...data.gameState }));
          break;
        case "PUSH_QUESTION":
          setGameState((prev) => ({
            ...prev,
            currentQuestion: data.question,
            timer: 30,
            selectedOption: null,
            revealAnswer: false,
          }));
          break;
        case "TIMER_START":
          setGameState((prev) => ({ ...prev, timerRunning: true }));
          break;
        case "TIMER_STOP":
          setGameState((prev) => ({ ...prev, timerRunning: false }));
          break;
        case "TIMER_UPDATE":
          setGameState((prev) => ({ ...prev, timer: data.timer }));
          break;
        case "SELECT_OPTION":
          setGameState((prev) => ({
            ...prev,
            selectedOption: data.optionIndex,
          }));
          break;
        case "REVEAL_ANSWER":
          setGameState((prev) => ({
            ...prev,
            revealAnswer: true,
            correctAnswer: data.correctIndex,
            isCorrect: data.isCorrect,
          }));
          break;
        case "TRADE_UPDATE":
          setGameState((prev) => ({ ...prev, tradeAmount: data.amount }));
          break;
        case "TOPIC_SELECTED":
          setGameState((prev) => ({
            ...prev,
            currentTopic: data.gameState.currentTopic,
            availableTopics: data.gameState.availableTopics,
            selectedTopics: data.gameState.selectedTopics,
            currentRound: data.gameState.currentRound,
          }));
          break;
        case "DIFFICULTY_UPDATE":
          setGameState((prev) => ({
            ...prev,
            difficulty: data.difficulty,
          }));
          break;
        case "TIMEOUT":
          setGameState((prev) => ({
            ...prev,
            revealAnswer: true,
            correctAnswer: data.correctIndex,
            isCorrect: false,
            timerRunning: false,
          }));
          break;
        case "TRIGGER_ANIMATION":
          handleAnimation(data.animationType, data.color);
          break;
        case "TRIGGER_LIGHTING":
          handleLighting(data.lightingType);
          break;
      }
    };

    channel.onmessage = handleMessage;

    return () => {
      channel.close();
    };
  }, []);

  // Add timer effect
  useEffect(() => {
    if (gameState.timerRunning && gameState.timer > 0) {
      const timer = setInterval(() => {
        setGameState((prev) => ({
          ...prev,
          timer: prev.timer - 1,
        }));
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameState.timerRunning]);

  // Trigger confetti for correct answers
  useEffect(() => {
    if (gameState.isCorrect) {
      fireConfetti("success");
    }
  }, []);

  // Add animation handlers
  const handleAnimation = (type: string, color?: string) => {
    switch (type) {
      case "confetti":
        fireConfetti();
        break;
      case "fireworks":
        fireFireworks();
        break;
      case "rain":
        fireMoneyRain();
        break;
      case "spotlight":
        createSpotlight();
        break;
      case "pulse":
        createPulse(color);
        break;
    }
  };

  const handleLighting = (type: string) => {
    const overlay = document.createElement("div");
    overlay.className = `fixed inset-0 z-50 pointer-events-none animate-flash ${
      type === "success"
        ? "bg-green-500/30"
        : type === "warning"
        ? "bg-yellow-500/30"
        : "bg-red-500/30"
    }`;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 500);
  };

  // Add these animation functions
  const fireFireworks = () => {
    const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff"];
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: colors,
          angle: 60 + i * 60,
        });
      }, i * 200);
    }
  };

  const fireMoneyRain = () => {
    const end = Date.now() + 3000;
    const colors = ["#00ff00", "#32cd32"];

    (function frame() {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });

      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  const createSpotlight = () => {
    const spotlight = document.createElement("div");
    spotlight.className = "fixed inset-0 z-50 pointer-events-none";
    spotlight.innerHTML = `
      <div class="absolute inset-0 bg-black/80 animate-spotlight"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/20 rounded-full blur-3xl animate-pulse"></div>
    `;
    document.body.appendChild(spotlight);
    setTimeout(() => spotlight.remove(), 2000);
  };

  const createPulse = (color = "blue") => {
    const pulse = document.createElement("div");
    pulse.className = `fixed inset-0 z-50 pointer-events-none bg-${color}-500/20 animate-pulse`;
    document.body.appendChild(pulse);
    setTimeout(() => pulse.remove(), 1000);
  };

  const renderStats = () => {
    if (!gameState.stats) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-6 right-6 bg-white/90 backdrop-blur-md p-6 rounded-xl shadow-xl"
      >
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-gray-600 mb-1">Questions</div>
            <div className="text-3xl font-bold text-blue-600">
              {gameState.stats.answeredQuestions}/15
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-600 mb-1">Correct</div>
            <div className="text-3xl font-bold text-green-600">
              {gameState.stats.correctAnswers}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-600 mb-1">Earned</div>
            <div className="text-3xl font-bold text-yellow-600">
              ₹{gameState.stats.totalEarned.toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-600 mb-1">Checkpoint</div>
            <div className="text-3xl font-bold text-purple-600">
              ₹{gameState.stats.checkpointMoney.toLocaleString()}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderTimer = () => {
    const isTimeWarning = gameState.timer <= 10;
    const isTimeout = gameState.timer === 0;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-[200]"
      >
        {/* Timer Circle */}
        <div
          className={`
          w-40 h-40 rounded-full flex items-center justify-center z-50
          ${
            isTimeout
              ? "bg-red-100 border-red-300"
              : isTimeWarning
              ? "bg-yellow-100 border-yellow-300"
              : "bg-blue-100 border-blue-300"
          } border-4 relative
        `}
        >
          {/* Animated Progress Ring */}
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle
              className="opacity-20"
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray="283"
              animate={{
                strokeDashoffset: 283 - (283 * gameState.timer) / 30,
              }}
              className={`
                ${
                  isTimeout
                    ? "text-red-500"
                    : isTimeWarning
                    ? "text-yellow-500"
                    : "text-blue-500"
                }
              `}
            />
          </svg>

          {/* Timer Text */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`text-6xl font-bold font-mono tracking-tight
              ${
                isTimeout
                  ? "text-red-600"
                  : isTimeWarning
                  ? "text-yellow-600"
                  : "text-blue-600"
              }
            `}
            >
              {gameState.timer}
            </div>
            <div
              className={`text-sm font-medium mt-1
              ${
                isTimeout
                  ? "text-red-500"
                  : isTimeWarning
                  ? "text-yellow-500"
                  : "text-blue-500"
              }
            `}
            >
              seconds
            </div>
          </div>
        </div>

        {/* Timeout Message */}
        {isTimeout && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
          >
            <div className="text-2xl font-bold text-red-600">Time's Up!</div>
          </motion.div>
        )}

        {/* Warning Pulse Effect */}
        {isTimeWarning && !isTimeout && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.1, 0.3],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              backgroundColor: isTimeWarning ? "#FEF3C7" : "#DBEAFE",
            }}
          />
        )}
      </motion.div>
    );
  };

  const renderStatus = () => {
    const statusConfig = {
      waiting: {
        icon: Timer,
        color: "text-gray-600",
        bg: "bg-gray-100",
        text: "Waiting to Begin",
      },
      participant_selection: {
        icon: Users,
        color: "text-blue-600",
        bg: "bg-blue-100",
        text: "Selecting Participant",
      },
      trader_selection: {
        icon: Target,
        color: "text-purple-600",
        bg: "bg-purple-100",
        text: "Selecting Trader",
      },
      question_selection: {
        icon: Brain,
        color: "text-green-600",
        bg: "bg-green-100",
        text: "Selecting Question",
      },
      trading: {
        icon: DollarSign,
        color: "text-yellow-600",
        bg: "bg-yellow-100",
        text: "Trading Phase",
      },
      trade_accepted: {
        icon: Check,
        color: "text-green-600",
        bg: "bg-green-100",
        text: "Trade Accepted",
      },
      trade_rejected: {
        icon: X,
        color: "text-red-600",
        bg: "bg-red-100",
        text: "Trade Rejected",
      },
      round_complete: {
        icon: Award,
        color: "text-purple-600",
        bg: "bg-purple-100",
        text: "Round Complete",
      },
    };

    const config =
      statusConfig[gameState.status as keyof typeof statusConfig] ||
      statusConfig.waiting;
    const Icon = config.icon;

    return (
      <motion.div
        key={gameState.status}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`text-center mb-12 ${config.bg} rounded-xl p-6 inline-block mx-auto`}
      >
        <Icon className={`w-12 h-12 ${config.color} mx-auto mb-4`} />
        <div className={`text-4xl font-bold ${config.color}`}>
          {config.text}
        </div>
      </motion.div>
    );
  };

  const renderParticipantInfo = () => {
    if (!gameState.currentParticipant?.name) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-6 left-6 bg-white/90 backdrop-blur-md p-6 rounded-xl shadow-xl"
      >
        <div className="flex items-center gap-4">
          <Users className="w-8 h-8 text-blue-600" />
          <div>
            <div className="text-gray-600 text-sm">Current Participant</div>
            <div className="text-2xl font-bold text-blue-600">
              {gameState.currentParticipant.name}
            </div>
          </div>
        </div>
        {gameState.currentTrader?.name && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
            <Award className="w-8 h-8 text-purple-600" />
            <div>
              <div className="text-gray-600 text-sm">Current Trader</div>
              <div className="text-2xl font-bold text-purple-600">
                {gameState.currentTrader.name}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const renderTopicSelection = () => {
    if (gameState.status !== "topic_selection") return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-7xl mx-auto"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="text-center mb-12"
        >
          <h2 className="text-5xl font-bold text-gray-800 mb-4">
            Round {gameState.currentRound}
          </h2>
          <Badge className="text-2xl px-6 py-3 bg-blue-100 text-blue-700">
            Choose Your Topic
          </Badge>
        </motion.div>

        <div className="grid grid-cols-6 gap-8">
          {gameState.availableTopics.map((topic) => (
            <motion.div
              key={topic}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{
                scale: gameState.currentTopic === topic ? 1.05 : 1,
                opacity: 1,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`p-8 rounded-2xl text-center transform transition-all duration-300 ${
                gameState.currentTopic === topic
                  ? "bg-blue-100 border-4 border-blue-500"
                  : "bg-white border-2 border-gray-200"
              }`}
            >
              <motion.div
                animate={{
                  rotate:
                    gameState.currentTopic === topic ? [0, -10, 10, 0] : 0,
                }}
                transition={{ duration: 0.5 }}
                className="flex items-center justify-center mb-4"
              >
                <Brain
                  className={`w-16 h-16 ${
                    gameState.currentTopic === topic
                      ? "text-blue-600"
                      : "text-gray-600"
                  }`}
                />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">{topic}</h3>
              {gameState.currentTopic === topic && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-blue-600 font-semibold text-xl"
                >
                  Selected!
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  };

  const renderTopicConfirmation = () => {
    if (gameState.status !== "topic_confirmed") return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 15 }}
            className="bg-blue-100 p-16 rounded-full mb-8"
          >
            <Brain className="w-32 h-32 text-blue-600" />
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <h2 className="text-4xl font-bold text-white">Topic Selected!</h2>
            <div className="text-2xl text-blue-400">
              {gameState.currentTopic}
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  };

  // Trigger celebration confetti
  useEffect(() => {
    fireConfetti("checkpoint");
  }, []);

  const renderAnswerReveal = () => {
    if (!gameState.revealAnswer || !gameState.currentQuestion) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center bg-black/90"
      >
        <div className="text-center">
          <motion.div
            className={`p-16 rounded-full mb-8 ${
              gameState.isCorrect ? "bg-green-100" : "bg-red-100"
            } inline-block`}
            initial={{ scale: 0, rotate: 0 }}
            animate={{ scale: 1, rotate: 360 }}
            transition={{ type: "spring", damping: 20 }}
          >
            {gameState.isCorrect ? (
              <Check className="w-32 h-32 text-green-600" />
            ) : (
              <X className="w-32 h-32 text-red-600" />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <div
              className={`text-6xl font-bold mb-4 ${
                gameState.isCorrect ? "text-green-500" : "text-red-500"
              }`}
            >
              {gameState.isCorrect ? "Correct!" : "Wrong!"}
            </div>
            {!gameState.isCorrect && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="space-y-2"
              >
                <div className="text-xl text-gray-400">Correct Answer:</div>
                <div className="text-3xl font-bold text-white">
                  {
                    gameState.currentQuestion.options[
                      gameState.currentQuestion.correct
                    ]
                  }
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.div>
    );
  };

  const renderQuestion = () => {
    if (!gameState.currentQuestion) return null;

    return (
      <div className="w-full max-w-7xl mx-auto px-8 relative">
        {/* Timer positioned at top */}
        <div className="absolute -top-32 left-1/2 transform -translate-x-1/2">
          {renderTimer()}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Question Card */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border-2 border-gray-100 mt-16">
            <div className="p-12">
              {/* Question Header */}
              <div className="flex justify-between items-center mb-8">
                <Badge className="px-6 py-2 text-lg bg-blue-100 text-blue-700">
                  Round {gameState.currentRound}/3
                </Badge>
                <Badge className="px-6 py-2 text-lg bg-purple-100 text-purple-700">
                  Question {gameState.questionNumber}/15
                </Badge>
              </div>

              {/* Question Text */}
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-4xl font-bold text-center text-gray-800 mb-12 leading-tight"
              >
                {gameState.currentQuestion.question}
              </motion.h2>

              {/* Options Grid */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                {gameState.currentQuestion.options.map((option, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative p-8 rounded-xl text-center text-xl ${getOptionClassName(
                      index
                    )}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="absolute top-4 left-4 w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <div className="text-xl">{option}</div>
                    {renderOptionIcon(index)}
                  </motion.div>
                ))}
              </div>

              {/* Points Display */}
              {gameState.currentQuestion.points && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <Badge className="px-6 py-2 text-xl bg-yellow-100 text-yellow-700">
                    ₹{gameState.currentQuestion.points.toLocaleString()}
                  </Badge>
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    );
  };

  // Helper functions for styling
  const getOptionClassName = (index: number) => {
    if (gameState.selectedOption === index) {
      return "bg-blue-100 text-blue-700 shadow-lg";
    }
    if (gameState.revealAnswer) {
      if (index === gameState.correctAnswer) {
        return "bg-green-100 text-green-700 shadow-lg";
      }
      if (gameState.selectedOption === index) {
        return "bg-red-100 text-red-700 shadow-lg";
      }
    }
    return "bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors";
  };

  const renderOptionIcon = (index: number) => {
    if (!gameState.revealAnswer) return null;

    if (index === gameState.correctAnswer) {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 right-4"
        >
          <Check className="w-8 h-8 text-white" />
        </motion.div>
      );
    }

    if (
      gameState.selectedOption === index &&
      index !== gameState.correctAnswer
    ) {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 right-4"
        >
          <X className="w-8 h-8 text-white" />
        </motion.div>
      );
    }

    return null;
  };

  const renderCheckpoint = () => {
    if (gameState.status !== "checkpoint_reached") return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center bg-black/90"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="bg-yellow-100 p-16 rounded-full mb-8 inline-block"
          >
            <Trophy className="w-32 h-32 text-yellow-600" />
          </motion.div>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <h2 className="text-5xl font-bold text-white">
              Checkpoint {Math.floor(gameState.questionNumber / 5)} Reached!
            </h2>
            <div className="text-3xl text-yellow-400">
              Secured Amount: ₹
              {gameState.stats?.checkpointMoney.toLocaleString()}
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  };

  // Add new components for trade negotiations
  const renderTradeNegotiation = () => {
    if (gameState.status !== "trading") return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <div className="text-center space-y-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-7xl font-bold text-white mb-8"
          >
            Trade Negotiation
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 p-8 rounded-2xl"
          >
            <div className="text-2xl text-white mb-4">
              Trader:{" "}
              <span className="text-yellow-400">
                {gameState.currentTrader.name}
              </span>
            </div>
            <div className="text-4xl font-bold text-green-400">
              ₹{gameState.tradeAmount.toLocaleString()}
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  };

  // Update the renderDealResult function
  const renderDealResult = () => {
    if (
      gameState.status !== "trade_accepted" &&
      gameState.status !== "trade_rejected"
    )
      return null;

    const isAccepted = gameState.status === "trade_accepted";

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.5, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", damping: 15 }}
          className={`p-20 rounded-2xl ${
            isAccepted ? "bg-green-100" : "bg-red-100"
          }`}
        >
          <div className="text-center space-y-4">
            <div
              className={`text-8xl font-bold mb-4 ${
                isAccepted ? "text-green-600" : "text-red-600"
              }`}
            >
              {isAccepted ? "DEAL!" : "NO DEAL!"}
            </div>
            <div className="text-2xl text-gray-600">
              Trader: {gameState.currentTrader.name}
            </div>
            {isAccepted && (
              <div className="text-3xl text-green-600">
                Amount: ₹{gameState.tradeAmount.toLocaleString()}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Add new component for game start animation
  const renderGameStart = () => {
    if (gameState.status !== "game_started") return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center bg-black/90"
      >
        <div className="text-center space-y-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.5,
              type: "spring",
              stiffness: 200,
            }}
            className="text-7xl font-bold text-white"
          >
            Get Ready!
          </motion.div>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-6"
          >
            <div className="text-3xl text-blue-400">
              Player: {gameState.currentParticipant?.name}
            </div>
            <div className="text-3xl text-purple-400">
              Topic: {gameState.currentTopic}
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1 }}
              className="text-5xl font-bold text-yellow-500 mt-8"
            >
              Game Starting in...
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{
                repeat: 2,
                duration: 1,
                delay: 1.5,
              }}
              className="text-6xl font-bold text-white"
            >
              3...2...1...
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    );
  };

  // Add trader selection animation
  const renderTraderSelection = () => {
    if (gameState.status !== "trader_selection") return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <div className="text-center space-y-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-7xl font-bold text-white"
          >
            Trader Selection
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-3xl text-purple-400"
          >
            Please select a trader
          </motion.div>
        </div>
      </motion.div>
    );
  };

  // Return null or loading state until mounted
  if (!mounted) {
    return null; // or a loading spinner
  }

  return (
    <div className="h-screen overflow-hidden">
      <Image
        src="/background.jpeg"
        alt="bg"
        layout="fill"
        objectFit="cover"
        className="absolute top-0 left-0 -z-10"
      />
      {/* Subtle Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-white/30 backdrop-blur-[0px] z-10">
        <div className="max-w-[1920px] mx-auto px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/thanima.png"
              alt="logo"
              className="-ml-4"
              width={100}
              height={100}
            />
            <div className="h-10 bg-white/50 w-[1px] rounded-full" />
            <div className="w-10 h-10 bg-blue-600/10 rounded-full flex items-center justify-center">
              <Image src="/logo.png" alt="logo" width={100} height={100} />
            </div>
            <h1 className="text-lg font-semibold text-white">
              Sell Me The Answer
            </h1>
          </div>

          {/* Current Topic & Round - Only show when active */}
          {gameState.currentTopic && (
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="outline" className="px-3 py-1 bg-white">
                Round {gameState.currentRound}/3
              </Badge>
              <span className="text-gray-600">
                Topic:{" "}
                <span className="font-medium text-lg text-blue-200">
                  {gameState.currentTopic}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Game Stats - Only show during active gameplay */}
      {gameState.stats && gameState.status !== "topic_selection" && (
        <div className="absolute top-20 right-6 flex gap-6 bg-white/50 backdrop-blur-[2px] rounded-full px-6 py-2">
          <div className="text-center">
            <div className="text-sm text-gray-500">Q</div>
            <div className="font-bold text-blue-600">
              {gameState.stats.answeredQuestions}/15
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500">₹</div>
            <div className="font-bold text-green-600">
              {gameState.stats.totalEarned.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Player Info - Only show during active gameplay */}
      {gameState.currentParticipant?.name &&
        gameState.status !== "topic_selection" && (
          <div className="absolute top-20 left-6 bg-white/50 backdrop-blur-[2px] rounded-full px-4 py-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <div className="font-medium text-gray-700">
                {gameState.currentParticipant.name}
              </div>
            </div>
          </div>
        )}

      {/* Main Content Area */}
      <div className="h-full flex flex-col pt-16">
        {!gameState.currentTopic &&
          !gameState.stats &&
          gameState.status !== "topic_selection" && (
            <div className="w-full h-full flex justify-center items-center">
              <Image src="/logo.png" alt="logo" width={500} height={500} />
            </div>
          )}
        {/* Dynamic Content */}
        <div className="flex-1 flex items-center justify-center p-4 relative z-20">
          <AnimatePresence mode="wait">
            {gameState.status === "topic_selection" && renderTopicSelection()}
            {gameState.status === "topic_confirmed" &&
              renderTopicConfirmation()}
            {gameState.status === "trader_selection" && renderTraderSelection()}
            {gameState.status === "question_phase" && renderQuestion()}
            {gameState.status === "trading" && renderTradeNegotiation()}
            {(gameState.status === "trade_accepted" ||
              gameState.status === "trade_rejected") &&
              renderDealResult()}
            {gameState.status === "game_started" && renderGameStart()}
            {gameState.status === "checkpoint_reached" && renderCheckpoint()}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
