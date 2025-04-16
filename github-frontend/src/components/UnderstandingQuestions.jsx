import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { ButtonBlue } from "@/components/ui/buttonBlue";
import { FiArrowLeft } from 'react-icons/fi';
import { FaArrowLeft } from 'react-icons/fa6';

// Understanding levels enum
export const UnderstandingLevel = {
  NO_IDEA: "No Idea",
  HEARD_OF_IT: "Heard of It",
  SOMEWHAT_UNDERSTAND: "Somewhat Understand",
  FULLY_UNDERSTAND: "Fully Understand"
};

export default function UnderstandingQuestions({ questions, onAnswer, savedAnswers, inline = false }) {
  const [isAnswering, setIsAnswering] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState(Array(questions?.length || 0).fill(null));
  const [isLoading, setIsLoading] = useState(false);

  // Ensure we have a valid currentQuestion
  const currentQuestion = questions && questions.length > 0 && questions[currentQuestionIndex]
    ? questions[currentQuestionIndex]
    : null;
  
  // Check if we already have an answer for this question
  useEffect(() => {
    if (currentQuestion && savedAnswers && savedAnswers[currentQuestionIndex]) {
      // Auto-select the saved answer
      setSelectedAnswers(prevAnswers => {
        const newAnswers = [...prevAnswers];
        newAnswers[currentQuestionIndex] = savedAnswers[currentQuestionIndex];
        return newAnswers;
      });
    }
  }, [currentQuestionIndex, savedAnswers, currentQuestion]);

  const handleSelectAnswer = (answer) => {
    setIsLoading(true);
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answer;
    setSelectedAnswers(newAnswers);
    
    // If this is the last question, finalize all answers
    if (currentQuestionIndex === questions.length - 1) {
      setTimeout(() => {
        onAnswer(newAnswers);
        setIsAnswering(false);
        setIsLoading(false);
      }, 500);
    } else {
      // Move to next question after brief delay
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setIsLoading(false);
      }, 500);
    }
  };

  // Show a loading indicator or placeholder if questions aren't loaded yet
  if (!questions || questions.length === 0 || !currentQuestion) {
    if (inline) {
      return (
        <div className="w-full bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-gray-700">Generating personalized questions...</p>
            <ButtonBlue 
              text="Skip Questions" 
              className="mt-4 text-sm"
              onClick={() => {
                onAnswer([]);
                setIsAnswering(false);
              }}
            />
          </div>
        </div>
      );
    }
    
    return (
      <motion.div 
        className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div 
          className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-gray-700">Generating personalized questions...</p>
            <ButtonBlue 
              text="Skip Questions" 
              className="mt-4 text-sm"
              onClick={() => {
                onAnswer([]);
                setIsAnswering(false);
              }}
            />
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (!isAnswering) return null;

  // Render inline version
  if (inline) {
    return (
      <div className="w-full font-inter text-darker-blue bg-white rounded-xl py-4 px-6 mb-4 drop-shadow-sm border border-color-border-2">
        <h3 className="font-medium text-darker-blue mb-1 text-[0.98rem]">Help us personalize your results</h3>
        <p className="text-sm text-gray-500 mb-4">
          Question {currentQuestionIndex + 1} of {questions.length}
        </p>
        
        <div className="mb-4">
          <p className="font-medium text-gray-700 text-[0.9rem]">{currentQuestion.question}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {Object.values(UnderstandingLevel).map((option) => (
            <button
              key={option}
              onClick={() => handleSelectAnswer(option)}
              disabled={isLoading}
              className={`py-2 px-3 border rounded-md text-sm font-medium transition-all duration-200 ${
                isLoading ? "opacity-50 cursor-not-allowed " : ""
              }${
                selectedAnswers[currentQuestionIndex] === option 
                  ? 'bg-blue-100 border-blue-500 text-blue-700 border-2' 
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        
        <div className="flex justify-between mt-4">
          <button
            onClick={() => onAnswer([])}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </button>
          
          <div className="flex space-x-2">
            {currentQuestionIndex > 0 && (
              <ButtonBlue 
                text={<span className="font-semibold ml-1">Previous Qs</span>}
                icon={<FaArrowLeft size={14} color="#FFFFFF" />}
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                disabled={isLoading}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render modal version (original)
  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
        >
          <h3 className="text-lg font-medium text-gray-900 mb-1">Help us personalize your results</h3>
          <p className="text-sm text-gray-500 mb-4">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
          
          <div className="mb-4">
            <p className="font-medium text-gray-700">{currentQuestion.question}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {Object.values(UnderstandingLevel).map((option) => (
              <button
                key={option}
                onClick={() => handleSelectAnswer(option)}
                disabled={isLoading}
                className={`py-2 px-3 border rounded-md text-sm font-medium transition-all duration-200 ${
                  isLoading ? "opacity-50 cursor-not-allowed " : ""
                }${
                  selectedAnswers[currentQuestionIndex] === option 
                    ? 'bg-blue-100 border-blue-500 text-blue-700 border-2' 
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          
          <div className="flex justify-between mt-4">
            <button
              onClick={() => onAnswer([])}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>
            
            <div className="flex space-x-2">
              {currentQuestionIndex > 0 && (
                <ButtonBlue 
                  text="Previous" 
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                  disabled={isLoading}
                />
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 