import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { prisma } from '@/lib/prisma';

// Types for our component props and state
interface Question {
  id: string;
  text: string;
  options: string[];
}

interface Answer {
  questionId: string;
  value: string;
}

interface PageProps {
  projectId: string;
  uid: string;
  questions: Question[];
  isValid: boolean;
  errorMessage?: string;
}

// Client-side metadata collection
const collectClientMetadata = () => {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    fingerprint: window.navigator.userAgent, // Basic fingerprint, could be enhanced
    screenSize: {
      width: window.screen.width,
      height: window.screen.height
    },
    colorDepth: window.screen.colorDepth,
    language: window.navigator.language,
    hasLocalStorage: !!window.localStorage,
    hasSessionStorage: !!window.sessionStorage,
  };
};

export default function SurveyLandingPage({ 
  projectId, 
  uid, 
  questions, 
  isValid, 
  errorMessage 
}: PageProps) {
  const router = useRouter();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(errorMessage || null);
  const [step, setStep] = useState<'captcha' | 'questions' | 'processing'>('captcha');

  // Handle CAPTCHA verification
  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    if (questions.length === 0) {
      // If no questions, submit directly
      handleSubmit();
    } else {
      // Move to questions step
      setStep('questions');
    }
  };

  // Handle answer changes
  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => {
      const existing = prev.find(a => a.questionId === questionId);
      
      if (existing) {
        return prev.map(a => a.questionId === questionId ? { ...a, value } : a);
      } else {
        return [...prev, { questionId, value }];
      }
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification');
      return;
    }

    if (questions.length > 0 && answers.length < questions.length) {
      setError('Please answer all questions');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setStep('processing');

    try {
      const clientMetadata = collectClientMetadata();
      
      const response = await axios.post('/api/verify/captcha', {
        token: captchaToken,
        projectId,
        uid,
        clientMetadata,
        answers
      });

      if (response.data.success) {
        // Store session token and answer data in sessionStorage for mid-survey validation
        sessionStorage.setItem('surveySession', JSON.stringify({
          token: response.data.sessionToken,
          projectId,
          uid,
          answers
        }));
        
        // Redirect to the actual survey in iframe wrapper
        router.push(`/survey/${projectId}/${uid}`);
      } else {
        setError(response.data.message || 'Verification failed');
        setStep('captcha');
      }
    } catch (error: any) {
      setError(error?.response?.data?.message || 'An error occurred during verification');
      setStep('captcha');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If not valid, show error
  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700">{error || 'This survey link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Survey Verification</h1>
        
        {step === 'captcha' && (
          <div className="space-y-6">
            <p className="text-gray-600 mb-4">Please complete the verification below to access the survey.</p>
            
            <div className="flex justify-center">
              <HCaptcha
                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY as string}
                onVerify={handleCaptchaVerify}
              />
            </div>
          </div>
        )}
        
        {step === 'questions' && (
          <div className="space-y-6">
            <p className="text-gray-600 mb-4">Please answer the following questions before proceeding to the survey:</p>
            
            {questions.map(question => (
              <div key={question.id} className="mb-4">
                <p className="font-medium mb-2">{question.text}</p>
                <div className="space-y-2">
                  {question.options.map((option, index) => (
                    <div key={index} className="flex items-center">
                      <input
                        type="radio"
                        id={`q${question.id}-${index}`}
                        name={`question-${question.id}`}
                        value={option}
                        onChange={() => handleAnswerChange(question.id, option)}
                        className="mr-2"
                      />
                      <label htmlFor={`q${question.id}-${index}`}>{option}</label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || answers.length < questions.length}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Continue to Survey'}
            </button>
          </div>
        )}
        
        {step === 'processing' && (
          <div className="text-center">
            <p className="text-gray-600 mb-4">Verifying your information...</p>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// Server-side props to validate the survey link and get questions
export async function getServerSideProps(context: any) {
  const { projectId, uid } = context.params;
  
  if (!projectId || !uid) {
    return {
      props: {
        isValid: false,
        errorMessage: 'Invalid URL parameters',
        projectId: '',
        uid: '',
        questions: [],
      },
    };
  }

  try {
    // Check if survey link exists and is valid
    const surveyLink = await prisma.surveyLink.findFirst({
      where: {
        projectId,
        uid,
        status: 'PENDING',
      },
    });

    if (!surveyLink) {
      return {
        props: {
          isValid: false,
          errorMessage: 'This survey link is invalid or has already been used',
          projectId,
          uid,
          questions: [],
        },
      };
    }

    // Get pre-survey questions for this project
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

    return {
      props: {
        isValid: true,
        projectId,
        uid,
        questions: JSON.parse(JSON.stringify(questions)), // Serialize for Next.js
      },
    };
  } catch (error) {
    console.error('Error fetching survey data:', error);
    return {
      props: {
        isValid: false,
        errorMessage: 'Failed to load survey information',
        projectId,
        uid,
        questions: [],
      },
    };
  }
}