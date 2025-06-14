import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

interface Question {
  id: string;
  text: string;
  type: 'single_choice' | 'multiple_choice' | 'text' | 'number' | 'email' | 'boolean';
  options?: string[];
  required: boolean;
  conditions?: {
    showIf?: { questionId: string; value: any; operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' }[];
    qualification?: 'qualify' | 'disqualify' | 'continue';
    qualificationMessage?: string;
  };
}

interface ConditionalPresurveyFlowProps {
  projectId: string;
  uid: string;
  questions: Question[];
  onComplete: (qualified: boolean, answers: Record<string, any>) => void;
  onError: (error: string) => void;
}

interface FlowState {
  currentQuestionIndex: number;
  answers: Record<string, any>;
  isCompleted: boolean;
  isQualified: boolean | null;
  qualificationMessage: string;
  visibleQuestions: Question[];
}

export default function ConditionalPresurveyFlow({
  projectId,
  uid,
  questions,
  onComplete,
  onError
}: ConditionalPresurveyFlowProps) {
  const router = useRouter();
  const [flowState, setFlowState] = useState<FlowState>({
    currentQuestionIndex: 0,
    answers: {},
    isCompleted: false,
    isQualified: null,
    qualificationMessage: '',
    visibleQuestions: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize visible questions based on conditions
  useEffect(() => {
    updateVisibleQuestions();
  }, [questions, flowState.answers]);

  const updateVisibleQuestions = () => {
    const visible: Question[] = [];
    
    for (const question of questions) {
      if (shouldShowQuestion(question, flowState.answers)) {
        visible.push(question);
      }
    }
    
    setFlowState(prev => ({
      ...prev,
      visibleQuestions: visible
    }));
  };

  const shouldShowQuestion = (question: Question, answers: Record<string, any>): boolean => {
    if (!question.conditions?.showIf) return true;
    
    return question.conditions.showIf.every(condition => {
      const answerValue = answers[condition.questionId];
      
      switch (condition.operator) {
        case 'equals':
          return answerValue === condition.value;
        case 'not_equals':
          return answerValue !== condition.value;
        case 'contains':
          if (Array.isArray(answerValue)) {
            return answerValue.includes(condition.value);
          }
          return String(answerValue || '').includes(condition.value);
        case 'greater_than':
          return Number(answerValue) > Number(condition.value);
        case 'less_than':
          return Number(answerValue) < Number(condition.value);
        default:
          return true;
      }
    });
  };

  const validateAnswer = (question: Question, value: any): string | null => {
    if (question.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return 'This question is required';
    }

    if (question.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    }

    if (question.type === 'number' && value && isNaN(Number(value))) {
      return 'Please enter a valid number';
    }

    return null;
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    const newAnswers = { ...flowState.answers, [questionId]: value };
    
    setFlowState(prev => ({
      ...prev,
      answers: newAnswers
    }));

    // Clear validation error for this question
    if (validationErrors[questionId]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[questionId];
        return updated;
      });
    }

    // Check for immediate qualification/disqualification
    const currentQuestion = flowState.visibleQuestions[flowState.currentQuestionIndex];
    if (currentQuestion?.conditions?.qualification) {
      checkQualification(currentQuestion, value);
    }
  };

  const checkQualification = (question: Question, value: any) => {
    if (!question.conditions?.qualification) return;

    if (question.conditions.qualification === 'disqualify') {
      setFlowState(prev => ({
        ...prev,
        isCompleted: true,
        isQualified: false,
        qualificationMessage: question.conditions?.qualificationMessage || 
          'Thank you for your interest, but you do not qualify for this survey.'
      }));
    } else if (question.conditions.qualification === 'qualify') {
      // Continue to check if there are more questions
      if (flowState.currentQuestionIndex >= flowState.visibleQuestions.length - 1) {
        setFlowState(prev => ({
          ...prev,
          isCompleted: true,
          isQualified: true,
          qualificationMessage: question.conditions?.qualificationMessage || 
            'Congratulations! You qualify for the main survey. Click continue to proceed.'
        }));
      }
    }
  };

  const handleNext = () => {
    const currentQuestion = flowState.visibleQuestions[flowState.currentQuestionIndex];
    const currentAnswer = flowState.answers[currentQuestion.id];
    
    // Validate current answer
    const error = validateAnswer(currentQuestion, currentAnswer);
    if (error) {
      setValidationErrors(prev => ({
        ...prev,
        [currentQuestion.id]: error
      }));
      return;
    }

    // Check if this is the last question
    if (flowState.currentQuestionIndex >= flowState.visibleQuestions.length - 1) {
      // Complete the flow
      setFlowState(prev => ({
        ...prev,
        isCompleted: true,
        isQualified: true,
        qualificationMessage: 'Thank you for completing the pre-survey. You qualify for the main survey!'
      }));
    } else {
      // Move to next question
      setFlowState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1
      }));
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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const response = await axios.post('/api/presurvey/submit', {
        projectId,
        uid,
        answers: flowState.answers,
        metadata: {
          startTime: new Date().toISOString(),
          completionTime: Date.now(),
          qualified: flowState.isQualified,
          qualificationFlow: true,
          totalQuestions: flowState.visibleQuestions.length,
          answeredQuestions: Object.keys(flowState.answers).length
        }
      });

      if (response.data.success) {
        onComplete(flowState.isQualified || false, flowState.answers);
      } else {
        onError(response.data.message || 'Failed to submit answers');
      }
    } catch (error) {
      console.error('Error submitting presurvey:', error);
      onError('Failed to submit answers. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: Question) => {
    const value = flowState.answers[question.id];
    const hasError = validationErrors[question.id];

    return (
      <div key={question.id} className="space-y-4">
        <div className="text-lg font-medium text-gray-900">
          {question.text}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </div>

        {question.type === 'single_choice' && question.options && (
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <label key={index} className="flex items-center space-x-3">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === 'multiple_choice' && question.options && (
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <label key={index} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  value={option}
                  checked={Array.isArray(value) && value.includes(option)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      handleAnswerChange(question.id, [...currentValues, option]);
                    } else {
                      handleAnswerChange(question.id, currentValues.filter(v => v !== option));
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === 'text' && (
          <textarea
            value={value || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="Enter your answer..."
          />
        )}

        {(question.type === 'number' || question.type === 'email') && (
          <input
            type={question.type === 'number' ? 'number' : 'email'}
            value={value || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={question.type === 'email' ? 'Enter your email' : 'Enter a number'}
          />
        )}

        {question.type === 'boolean' && (
          <div className="space-y-2">
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                name={question.id}
                value="true"
                checked={value === true}
                onChange={() => handleAnswerChange(question.id, true)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-gray-700">Yes</span>
            </label>
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                name={question.id}
                value="false"
                checked={value === false}
                onChange={() => handleAnswerChange(question.id, false)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-gray-700">No</span>
            </label>
          </div>
        )}

        {hasError && (
          <div className="text-red-600 text-sm mt-1">{hasError}</div>
        )}
      </div>
    );
  };

  if (flowState.isCompleted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            flowState.isQualified ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {flowState.isQualified ? (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          
          <h2 className={`text-2xl font-bold mb-4 ${
            flowState.isQualified ? 'text-green-900' : 'text-red-900'
          }`}>
            {flowState.isQualified ? 'You Qualify!' : 'Survey Complete'}
          </h2>
          
          <p className="text-gray-700 mb-6">
            {flowState.qualificationMessage}
          </p>
          
          {flowState.isQualified ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Continue to Main Survey'}
            </button>
          ) : (
            <button
              onClick={() => window.close()}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  if (flowState.visibleQuestions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = flowState.visibleQuestions[flowState.currentQuestionIndex];
  const progress = ((flowState.currentQuestionIndex + 1) / flowState.visibleQuestions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {flowState.currentQuestionIndex + 1} of {flowState.visibleQuestions.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        {renderQuestion(currentQuestion)}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={flowState.currentQuestionIndex === 0}
          className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        <button
          onClick={handleNext}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
        >
          {flowState.currentQuestionIndex >= flowState.visibleQuestions.length - 1 ? 'Complete' : 'Next'}
        </button>
      </div>
    </div>
  );
}
