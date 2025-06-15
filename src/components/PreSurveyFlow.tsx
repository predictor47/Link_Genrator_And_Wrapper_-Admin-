import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { EnhancedQuestion } from '@/types/form-types';

interface PreSurveyFlowProps {
  projectId: string;
  uid: string;
  questions: EnhancedQuestion[];
  onComplete: (qualified: boolean, responses: Record<string, any>, leadData: Record<string, any>) => void;
  onError: (error: string) => void;
}

interface FlowState {
  currentQuestionIndex: number;
  responses: Record<string, any>;
  leadData: Record<string, any>;
  isCompleted: boolean;
  isDisqualified: boolean;
  disqualificationReason: string;
  progress: number;
}

export default function PreSurveyFlow({
  projectId,
  uid,
  questions,
  onComplete,
  onError
}: PreSurveyFlowProps) {
  const router = useRouter();
  const [flowState, setFlowState] = useState<FlowState>({
    currentQuestionIndex: 0,
    responses: {},
    leadData: {},
    isCompleted: false,
    isDisqualified: false,
    disqualificationReason: '',
    progress: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  // Calculate progress
  useEffect(() => {
    const progress = questions.length > 0 ? (flowState.currentQuestionIndex / questions.length) * 100 : 0;
    setFlowState(prev => ({ ...prev, progress }));
  }, [flowState.currentQuestionIndex, questions.length]);

  const validateCurrentAnswer = (): boolean => {
    const currentQuestion = questions[flowState.currentQuestionIndex];
    if (!currentQuestion) return true;

    const answer = flowState.responses[currentQuestion.id];

    if (currentQuestion.required) {
      if (!answer || (Array.isArray(answer) && answer.length === 0) || String(answer).trim() === '') {
        setValidationError('This question is required.');
        return false;
      }
    }

    if (currentQuestion.type === 'email' && answer) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(answer)) {
        setValidationError('Please enter a valid email address.');
        return false;
      }
    }

    setValidationError('');
    return true;
  };

  const checkDisqualification = (question: EnhancedQuestion, answer: any): boolean => {
    if (!question.isQualifying || !question.disqualifyingAnswers) return false;

    if (Array.isArray(answer)) {
      return answer.some(ans => question.disqualifyingAnswers?.includes(ans));
    }

    return question.disqualifyingAnswers.includes(String(answer));
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setFlowState(prev => ({
      ...prev,
      responses: {
        ...prev.responses,
        [questionId]: value
      }
    }));
    setValidationError('');
  };

  const handleNext = () => {
    if (!validateCurrentAnswer()) return;

    const currentQuestion = questions[flowState.currentQuestionIndex];
    const currentAnswer = flowState.responses[currentQuestion.id];

    // Store lead data if it's a lead question
    if (currentQuestion.isLead) {
      setFlowState(prev => ({
        ...prev,
        leadData: {
          ...prev.leadData,
          [currentQuestion.id]: currentAnswer
        }
      }));
    }

    // Check for disqualification
    if (checkDisqualification(currentQuestion, currentAnswer)) {
      setFlowState(prev => ({
        ...prev,
        isDisqualified: true,
        disqualificationReason: `Based on your response to "${currentQuestion.text}", you don't meet the criteria for this survey.`
      }));
      onComplete(false, flowState.responses, flowState.leadData);
      return;
    }

    // Move to next question or complete
    if (flowState.currentQuestionIndex < questions.length - 1) {
      setFlowState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1
      }));
    } else {
      // All questions completed and qualified
      setFlowState(prev => ({ ...prev, isCompleted: true }));
      onComplete(true, flowState.responses, flowState.leadData);
    }
  };

  const handlePrevious = () => {
    if (flowState.currentQuestionIndex > 0) {
      setFlowState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1
      }));
    }
  };

  const renderQuestion = (question: EnhancedQuestion) => {
    const currentAnswer = flowState.responses[question.id];

    const questionClasses = `
      bg-white border-2 border-gray-200 rounded-xl p-8 mb-6
      ${question.isQualifying ? 'border-yellow-300 bg-yellow-50' : ''}
      ${question.isLead ? 'border-purple-300 bg-purple-50' : ''}
    `;

    return (
      <div className={questionClasses}>
        <div className="flex items-start gap-4 mb-6">
          <div className={`
            w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg
            ${question.isLead ? 'bg-purple-600' : question.isQualifying ? 'bg-yellow-600' : 'bg-blue-600'}
          `}>
            {question.isLead ? '🎯' : question.isQualifying ? '✅' : flowState.currentQuestionIndex + 1}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{question.text}</h3>
            {question.description && (
              <p className="text-gray-600 mb-4">{question.description}</p>
            )}
            <div className="flex gap-2 mb-4">
              {question.required && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Required</span>
              )}
              {question.isLead && (
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">Lead Question</span>
              )}
              {question.isQualifying && (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Qualifying</span>
              )}
            </div>
          </div>
        </div>

        {renderQuestionInput(question, currentAnswer)}

        {validationError && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {validationError}
          </div>
        )}
      </div>
    );
  };

  const renderQuestionInput = (question: EnhancedQuestion, currentAnswer: any) => {
    switch (question.type) {
      case 'short-text':
      case 'email':
        return (
          <input
            type={question.type === 'email' ? 'email' : 'text'}
            value={currentAnswer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder={question.type === 'email' ? 'Enter your email address' : 'Type your answer...'}
          />
        );

      case 'paragraph':
        return (
          <textarea
            value={currentAnswer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            rows={4}
            className="w-full p-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Type your detailed response..."
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={currentAnswer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Enter a number..."
          />
        );

      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {question.options?.map((option) => (
              <label
                key={option.id}
                className={`
                  flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all
                  ${currentAnswer === option.value 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                  }
                  ${option.isDisqualifying ? 'border-red-300 bg-red-50' : ''}
                `}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.value}
                  checked={currentAnswer === option.value}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="mr-3 text-blue-600"
                />
                <span className="flex-1">{option.text}</span>
                {option.isDisqualifying && (
                  <span className="text-red-600 text-xs font-semibold">⚠️ Disqualifying</span>
                )}
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-3">
            {question.options?.map((option) => (
              <label
                key={option.id}
                className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors"
              >
                <input
                  type="checkbox"
                  value={option.value}
                  checked={Array.isArray(currentAnswer) && currentAnswer.includes(option.value)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(currentAnswer) ? currentAnswer : [];
                    if (e.target.checked) {
                      handleAnswerChange(question.id, [...currentValues, option.value]);
                    } else {
                      handleAnswerChange(question.id, currentValues.filter(v => v !== option.value));
                    }
                  }}
                  className="mr-3 text-blue-600"
                />
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'dropdown':
        return (
          <select
            value={currentAnswer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Select an option...</option>
            {question.options?.map((option) => (
              <option key={option.id} value={option.value}>
                {option.text}
              </option>
            ))}
          </select>
        );

      case 'scale':
        return (
          <div className="space-y-4">
            <input
              type="range"
              min="1"
              max="10"
              value={currentAnswer || 5}
              onChange={(e) => handleAnswerChange(question.id, parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>1 (Poor)</span>
              <span className="font-semibold text-blue-600">Current: {currentAnswer || 5}</span>
              <span>10 (Excellent)</span>
            </div>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={currentAnswer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        );
    }
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No pre-survey questions configured for this project.</p>
      </div>
    );
  }

  if (flowState.isDisqualified) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-800 mb-4">Survey Ended</h2>
          <p className="text-red-700 mb-6">{flowState.disqualificationReason}</p>
          <p className="text-gray-600">Thank you for your time and interest.</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[flowState.currentQuestionIndex];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Question {flowState.currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {Math.round(flowState.progress)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${flowState.progress}%` }}
          />
        </div>
      </div>

      {/* Current Question */}
      {currentQuestion && renderQuestion(currentQuestion)}

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8">
        <button
          onClick={handlePrevious}
          disabled={flowState.currentQuestionIndex === 0}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>

        <button
          onClick={handleNext}
          disabled={isSubmitting}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {flowState.currentQuestionIndex === questions.length - 1 ? 'Complete' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
