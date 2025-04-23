import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { prisma } from '@/lib/prisma';

// Types for our component
interface SurveyWrapperProps {
  originalUrl: string | null;
  question: {
    id: string;
    text: string;
    options: string[];
  } | null;
  isValid: boolean;
  errorMessage?: string;
}

interface SessionData {
  token: string;
  projectId: string;
  uid: string;
  answers: {
    questionId: string;
    value: string;
  }[];
}

export default function SurveyWrapper({ 
  originalUrl, 
  question, 
  isValid, 
  errorMessage 
}: SurveyWrapperProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(errorMessage || null);
  const [validationActive, setValidationActive] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [statusUpdated, setStatusUpdated] = useState<boolean>(false);
  
  // Reference to track if we've already marked as in progress
  const inProgressTracking = useRef<{
    marked: boolean,
    timeOnPage: number,
    activityCount: number,
    completionTimer: NodeJS.Timeout | null
  }>({
    marked: false,
    timeOnPage: 0,
    activityCount: 0,
    completionTimer: null
  });
  
  // Load session data on component mount
  useEffect(() => {
    const checkSession = () => {
      const storedSession = sessionStorage.getItem('surveySession');
      if (!storedSession) {
        setError('No active session found. Please return to the verification page.');
        return false;
      }
      
      try {
        const parsedSession = JSON.parse(storedSession) as SessionData;
        setSessionData(parsedSession);
        return true;
      } catch (e) {
        setError('Invalid session data. Please return to the verification page.');
        return false;
      }
    };
    
    const hasValidSession = checkSession();
    
    if (hasValidSession && originalUrl && question) {
      // Update status to IN_PROGRESS once iframe is loaded
      const updateToInProgress = async () => {
        if (!inProgressTracking.current.marked && sessionData) {
          try {
            await axios.post('/api/links/update-status', {
              projectId: sessionData.projectId,
              uid: sessionData.uid,
              status: 'IN_PROGRESS',
              token: sessionData.token
            });
            
            inProgressTracking.current.marked = true;
            setStatusUpdated(true);
          } catch (error) {
            console.error('Failed to update status to IN_PROGRESS:', error);
          }
        }
      };
      
      // Mark as IN_PROGRESS after the iframe loads
      const inProgressTimer = setTimeout(() => {
        updateToInProgress();
      }, 5000); // Give some time for the iframe to load
      
      // Set up random validation check after 30-120 seconds
      const validationDelay = Math.floor(Math.random() * (120 - 30 + 1) + 30) * 1000;
      
      const validationTimer = setTimeout(() => {
        setValidationActive(true);
      }, validationDelay);
      
      // Set up a timer to detect potential survey completion
      // This is a heuristic since we can't directly interact with the external survey
      const completionTimer = setTimeout(() => {
        if (sessionData && inProgressTracking.current.timeOnPage > 30 && inProgressTracking.current.activityCount > 5) {
          handlePotentialCompletion();
        }
      }, 180000); // Check after 3 minutes as a baseline
      
      inProgressTracking.current.completionTimer = completionTimer;
      
      // Track time on page
      const interval = setInterval(() => {
        inProgressTracking.current.timeOnPage += 1;
      }, 1000);
      
      // Track user activity as a signal they might be completing the survey
      const trackActivity = () => {
        inProgressTracking.current.activityCount += 1;
      };
      
      window.addEventListener('mousemove', trackActivity);
      window.addEventListener('click', trackActivity);
      window.addEventListener('keypress', trackActivity);
      
      // Add event listener for beforeunload to potentially mark as complete
      // This helps detect when the user is leaving after completing the survey
      window.addEventListener('beforeunload', handlePotentialCompletion);
      
      return () => {
        clearTimeout(inProgressTimer);
        clearTimeout(validationTimer);
        if (inProgressTracking.current.completionTimer) {
          clearTimeout(inProgressTracking.current.completionTimer);
        }
        clearInterval(interval);
        window.removeEventListener('mousemove', trackActivity);
        window.removeEventListener('click', trackActivity);
        window.removeEventListener('keypress', trackActivity);
        window.removeEventListener('beforeunload', handlePotentialCompletion);
      };
    }
  }, [originalUrl, question, sessionData]);
  
  // Handle potential survey completion
  const handlePotentialCompletion = async () => {
    if (sessionData && inProgressTracking.current.marked) {
      try {
        // Only attempt to update if we've already marked as in progress
        await axios.post('/api/links/update-status', {
          projectId: sessionData.projectId,
          uid: sessionData.uid,
          status: 'COMPLETED',
          token: sessionData.token
        });
      } catch (error) {
        console.error('Failed to update survey status to completed:', error);
      }
    }
  };
  
  // Handle validation submission
  const handleValidationSubmit = async () => {
    if (!selectedAnswer || !sessionData || !question) {
      setError('Please select an answer to continue');
      return;
    }
    
    // Find the original answer to this question
    const originalAnswer = sessionData.answers.find(a => a.questionId === question.id)?.value;
    
    if (originalAnswer === selectedAnswer) {
      // Answers match, let the user continue
      setValidationActive(false);
      
      // Eventually update survey link status to completed when actual completion is detected
      // This is now handled by the activity tracking logic
    } else {
      // Answers don't match, flag the response
      try {
        await axios.post('/api/links/flag', {
          projectId: sessionData.projectId,
          uid: sessionData.uid,
          token: sessionData.token,
          reason: 'Inconsistent answers during validation',
          metadata: {
            questionId: question.id,
            originalAnswer,
            validationAnswer: selectedAnswer
          }
        });
        
        setError('Your responses appear to be inconsistent. This survey session has been flagged.');
      } catch (error) {
        setError('Validation failed. Please return to the survey link and try again.');
      }
    }
  };
  
  // If there's an error or validation is not valid, show error
  if (!isValid || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-4">{error || 'This survey session is invalid or has expired.'}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }
  
  // If validation is active, show the question
  if (validationActive && question) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-blue-600 mb-4">Quick Verification</h1>
          <p className="text-gray-700 mb-4">
            Please answer this question to verify your identity and continue with the survey:
          </p>
          
          <div className="mb-6">
            <p className="font-medium mb-2">{question.text}</p>
            <div className="space-y-2">
              {question.options.map((option, index) => (
                <div key={index} className="flex items-center">
                  <input
                    type="radio"
                    id={`validation-${index}`}
                    name="validation-question"
                    value={option}
                    onChange={() => setSelectedAnswer(option)}
                    className="mr-2"
                  />
                  <label htmlFor={`validation-${index}`}>{option}</label>
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleValidationSubmit}
            disabled={!selectedAnswer}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
          >
            Continue Survey
          </button>
        </div>
      </div>
    );
  }
  
  // Show the survey in an iframe
  return (
    <div className="h-screen flex flex-col">
      <div className="bg-blue-600 text-white py-4 px-6 shadow-md">
        <h1 className="text-xl font-bold">Survey</h1>
      </div>
      
      {originalUrl && (
        <iframe
          src={originalUrl}
          className="w-full flex-grow border-none"
          title="Survey"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      )}
      
      {/* Optional helper for users to manually mark completion */}
      <div className="bg-gray-100 px-6 py-3 border-t flex justify-end">
        <button 
          onClick={handlePotentialCompletion}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded text-sm"
        >
          I've Completed The Survey
        </button>
      </div>
    </div>
  );
}

// Server-side props to get the original URL and a random question for validation
export async function getServerSideProps(context: any) {
  const { projectId, uid } = context.params;
  
  if (!projectId || !uid) {
    return {
      props: {
        isValid: false,
        errorMessage: 'Invalid URL parameters',
        originalUrl: null,
        question: null,
      },
    };
  }

  try {
    // Check if survey link exists and is valid (now we allow PENDING, STARTED or IN_PROGRESS)
    const surveyLink = await prisma.surveyLink.findFirst({
      where: {
        projectId,
        uid,
        status: {
          in: ['PENDING', 'STARTED', 'IN_PROGRESS']
        }
      },
    });

    if (!surveyLink) {
      return {
        props: {
          isValid: false,
          errorMessage: 'This survey link is invalid or has already been used',
          originalUrl: null,
          question: null,
        },
      };
    }

    // Get a random pre-survey question for validation
    const questions = await prisma.question.findMany({
      where: {
        projectId,
      },
      select: {
        id: true,
        text: true,
        options: true,
      },
    });

    // Parse options JSON string for each question
    const parsedQuestions = questions.map(q => ({
      id: q.id,
      text: q.text,
      options: JSON.parse(q.options || '[]')
    }));

    // Select a random question if available
    const randomQuestion = parsedQuestions.length > 0
      ? parsedQuestions[Math.floor(Math.random() * parsedQuestions.length)]
      : null;

    return {
      props: {
        isValid: true,
        originalUrl: surveyLink.originalUrl,
        question: randomQuestion ? JSON.parse(JSON.stringify(randomQuestion)) : null,
      },
    };
  } catch (error) {
    console.error('Error fetching survey data:', error);
    return {
      props: {
        isValid: false,
        errorMessage: 'Failed to load survey information',
        originalUrl: null,
        question: null,
      },
    };
  }
}