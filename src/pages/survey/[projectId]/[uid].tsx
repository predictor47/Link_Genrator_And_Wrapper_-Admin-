import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { detectVPN } from '@/lib/vpn-detection';
import { collectClientMetadata } from '@/lib/metadata';
import ConsentPage from '@/components/ConsentPage';
import ConditionalPresurveyFlow from '@/components/ConditionalPresurveyFlow';

// Types for our component
interface Question {
  id: string;
  text: string;
  options: string[];
}

interface ConsentItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  type: 'privacy' | 'data_collection' | 'participation' | 'recording' | 'cookies' | 'marketing' | 'custom';
}

interface PresurveyQuestion {
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

interface SessionData {
  token: string;
  projectId: string;
  uid: string;
  linkType: string;
  consents: Record<string, boolean>;
  presurveyAnswers: Record<string, any>;
  isQualified: boolean;
  answers: Array<{
    questionId: string;
    value: string;
  }>;
  metadata: any;
}

// Flow states enum
type FlowState = 'CONSENT' | 'PRESURVEY' | 'DISQUALIFIED' | 'MAIN_SURVEY' | 'COMPLETED';

export default function SurveyPage({ 
  isValid, 
  originalUrl, 
  geoRestriction,
  linkType,
  vendorCode,
  questions = [],
  projectTitle,
  consentItems = [],
  presurveyQuestions = [],
}: { 
  isValid: boolean;
  originalUrl: string | null;
  geoRestriction: string[] | null;
  linkType: 'TEST' | 'LIVE';
  vendorCode: string | null;
  questions: Question[];
  projectTitle?: string;
  consentItems: ConsentItem[];
  presurveyQuestions: PresurveyQuestion[];
}) {
  const router = useRouter();
  const [flowState, setFlowState] = useState<FlowState>('CONSENT');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // States for mid-survey validation (keep existing functionality)
  const [showMidSurveyQuestion, setShowMidSurveyQuestion] = useState(false);
  const [midSurveyQuestion, setMidSurveyQuestion] = useState<Question | null>(null);
  const [midSurveyAnswer, setMidSurveyAnswer] = useState<string>('');
  const [validationCountdown, setValidationCountdown] = useState<number | null>(null);
  const [validationTimer, setValidationTimer] = useState<NodeJS.Timeout | null>(null);
  const [validationFailed, setValidationFailed] = useState(false);

  // Initialize session data and check validity
  useEffect(() => {
    if (!isValid || !originalUrl) return;
    
    const initializeSession = async () => {
      const sessionToken = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const metadata = collectClientMetadata();
      
      const session: SessionData = {
        token: sessionToken,
        projectId: router.query.projectId as string,
        uid: router.query.uid as string,
        linkType: linkType,
        consents: {},
        presurveyAnswers: {},
        isQualified: false,
        answers: [],
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          vendor: vendorCode
        }
      };
      
      sessionStorage.setItem('surveySession', JSON.stringify(session));
      setSessionData(session);
      setIsLoading(false);
    };
    
    initializeSession();
  }, [isValid, originalUrl, linkType, router.query, vendorCode]);

  // Handle consent completion
  const handleConsentComplete = async (consents: Record<string, boolean>) => {
    if (!sessionData) return;
    
    try {
      // Record consent
      await axios.post('/api/consent/record', {
        projectId: sessionData.projectId,
        uid: sessionData.uid,
        consents,
        token: sessionData.token,
        metadata: sessionData.metadata
      });
      
      // Update session
      const updatedSession = {
        ...sessionData,
        consents
      };
      
      sessionStorage.setItem('surveySession', JSON.stringify(updatedSession));
      setSessionData(updatedSession);
      
      // Move to presurvey flow
      setFlowState('PRESURVEY');
    } catch (error) {
      console.error('Error recording consent:', error);
      setError('Failed to record consent. Please try again.');
    }
  };

  // Handle VPN detection during consent
  const handleVpnDetected = () => {
    setError('VPN or proxy detected. Please disable your VPN and refresh this page to continue.');
  };

  // Handle geo-restriction during consent
  const handleGeoRestricted = (country: string) => {
    setError(`We're sorry, but this survey is not available in your country (${country}). This survey is only available to participants from specific regions.`);
  };

  // Handle presurvey completion
  const handlePresurveyComplete = async (qualified: boolean, answers: Record<string, any>) => {
    if (!sessionData) return;
    
    try {
      // Update session with presurvey results
      const updatedSession = {
        ...sessionData,
        presurveyAnswers: answers,
        isQualified: qualified
      };
      
      sessionStorage.setItem('surveySession', JSON.stringify(updatedSession));
      setSessionData(updatedSession);
      
      // Update status in database
      await axios.post('/api/links/update-status', {
        projectId: sessionData.projectId,
        uid: sessionData.uid,
        status: qualified ? 'QUALIFIED' : 'DISQUALIFIED',
        token: sessionData.token,
        presurveyData: {
          answers,
          qualified,
          timestamp: new Date().toISOString()
        }
      });
      
      if (qualified) {
        setFlowState('MAIN_SURVEY');
      } else {
        setFlowState('DISQUALIFIED');
      }
    } catch (error) {
      console.error('Error updating presurvey results:', error);
      setError('Failed to process presurvey results. Please try again.');
    }
  };

  // Handle presurvey error
  const handlePresurveyError = (error: string) => {
    setError(error);
  };
  
  
  // Set up mid-survey validation timer (only for main survey)
  useEffect(() => {
    if (flowState === 'MAIN_SURVEY' && sessionData && iframeLoaded && !validationTimer && questions.length > 0 && !showMidSurveyQuestion) {
      // Only set up validation for LIVE links with questions
      if (linkType === 'LIVE') {
        // Set a timer for a random time between 30-120 seconds
        const timeout = Math.floor(Math.random() * (120 - 30 + 1) + 30) * 1000;
        
        const timer = setTimeout(() => {
          triggerMidSurveyValidation();
        }, timeout);
        
        setValidationTimer(timer);
      }
    }
    
    return () => {
      if (validationTimer) {
        clearTimeout(validationTimer);
      }
    };
  }, [flowState, sessionData, iframeLoaded, questions, showMidSurveyQuestion]);
  
  // Function to trigger mid-survey validation
  const triggerMidSurveyValidation = () => {
    if (questions.length === 0 || !sessionData) return;
    
    // Find a question that was already answered
    const answeredQuestions = questions.filter(q => 
      sessionData.answers.some(a => a.questionId === q.id)
    );
    
    if (answeredQuestions.length > 0) {
      // Pick a random answered question
      const questionIndex = Math.floor(Math.random() * answeredQuestions.length);
      const selectedQuestion = answeredQuestions[questionIndex];
      
      setMidSurveyQuestion(selectedQuestion);
      setShowMidSurveyQuestion(true);
      
      // Start countdown for 60 seconds
      setValidationCountdown(60);
      
      // Handle countdown timer
      const countdownTimer = setInterval(() => {
        setValidationCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownTimer);
            handleValidationTimeout();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // If no answered questions (unlikely), just set another timer
      const timer = setTimeout(() => {
        triggerMidSurveyValidation();
      }, 60000);
      
      setValidationTimer(timer);
    }
  };
  
  // Function to handle timeout during validation
  const handleValidationTimeout = async () => {
    // This is considered a failed validation
    setValidationFailed(true);
    
    // Flag this as suspicious
    try {
      await axios.post('/api/links/flag', {
        projectId: router.query.projectId as string,
        uid: router.query.uid as string,
        reason: 'Mid-survey validation timeout',
        metadata: {
          questionId: midSurveyQuestion?.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error flagging validation timeout:', error);
    }
  };
  
  // Validate mid-survey answer
  const handleMidSurveySubmit = async () => {
    if (!midSurveyQuestion || !sessionData) return;
    
    // Find the original answer given for this question
    const originalAnswer = sessionData.answers.find(
      a => a.questionId === midSurveyQuestion.id
    );
    
    if (!originalAnswer) return;
    
    // Compare answers
    const isValid = originalAnswer.value === midSurveyAnswer;
    
    if (!isValid) {
      setValidationFailed(true);
      
      // Flag this inconsistency
      try {
        await axios.post('/api/links/flag', {
          projectId: router.query.projectId as string,
          uid: router.query.uid as string,
          reason: 'Mid-survey validation failed',
          metadata: {
            questionId: midSurveyQuestion.id,
            originalAnswer: originalAnswer.value,
            newAnswer: midSurveyAnswer,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Error flagging validation failure:', error);
      }
    } else {
      // Answer matched, continue survey
      setShowMidSurveyQuestion(false);
      
      // Set timer for next validation
      const timeout = Math.floor(Math.random() * (120 - 30 + 1) + 30) * 1000;
      
      const timer = setTimeout(() => {
        triggerMidSurveyValidation();
      }, timeout);
      
      setValidationTimer(timer);
    }
  };

  // Handle iframe load event
  const handleIframeLoad = () => {
    setIframeLoaded(true);
  };
   // If the link is invalid, show an error
  if (!isValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Survey Link</h1>
          <p className="text-gray-700 mb-6">
            This survey link is invalid or has expired. Please check the URL or contact the survey administrator.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Loading Survey</h1>
          <p className="text-gray-600 mb-6">Please wait while we set up your survey...</p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  // Mid-survey validation failed
  if (validationFailed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Validation Failed</h1>
          <p className="text-gray-700 mb-6">
            Your answers were inconsistent with your previous responses. This survey has been marked for review.
          </p>
          <p className="text-gray-500 text-sm">
            Consistent answers are important for data quality.
          </p>
        </div>
      </div>
    );
  }

  // Show mid-survey validation during main survey
  if (showMidSurveyQuestion && midSurveyQuestion && flowState === 'MAIN_SURVEY') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-amber-600">Verification Required</h1>
            <div className="text-amber-600 font-semibold">
              {validationCountdown}s
            </div>
          </div>
          
          <p className="text-gray-500 text-sm mb-6">
            Please answer this question again to verify your identity.
          </p>
          
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-700 mb-3">{midSurveyQuestion.text}</h2>
            <div className="space-y-2">
              {midSurveyQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center">
                  <input
                    id={`mid-option-${index}`}
                    type="radio"
                    name="mid-question"
                    value={option}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    onChange={() => setMidSurveyAnswer(option)}
                    checked={midSurveyAnswer === option}
                  />
                  <label htmlFor={`mid-option-${index}`} className="ml-2 block text-gray-700">
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleMidSurveySubmit}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={!midSurveyAnswer}
          >
            Verify & Continue
          </button>
        </div>
      </div>
    );
  }

  // Show consent page
  if (flowState === 'CONSENT') {
    return (
      <ConsentPage
        projectId={router.query.projectId as string}
        uid={router.query.uid as string}
        projectTitle={projectTitle}
        requiredConsents={consentItems}
        onConsentComplete={handleConsentComplete}
        onVpnDetected={handleVpnDetected}
        onGeoRestricted={handleGeoRestricted}
      />
    );
  }

  // Show presurvey flow
  if (flowState === 'PRESURVEY') {
    return (
      <ConditionalPresurveyFlow
        projectId={router.query.projectId as string}
        uid={router.query.uid as string}
        questions={presurveyQuestions}
        onComplete={handlePresurveyComplete}
        onError={handlePresurveyError}
      />
    );
  }

  // Show disqualification page
  if (flowState === 'DISQUALIFIED') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-amber-600 mb-4">Survey Complete</h1>
          <p className="text-gray-700 mb-6">
            Thank you for your time. Based on your responses, you do not qualify for this particular survey.
          </p>
          <p className="text-gray-500 text-sm">
            We appreciate your participation and may have other opportunities available in the future.
          </p>
        </div>
      </div>
    );
  }

  // Show the main survey in an iframe
  if (flowState === 'MAIN_SURVEY') {
    return (
      <div className="flex flex-col min-h-screen">
        {/* Survey Header */}
        <header className="bg-white shadow-sm p-4">
          <div className="container mx-auto">
            <h1 className="text-lg font-medium text-gray-800">Survey in Progress</h1>
          </div>
        </header>
        
        {/* Survey Iframe */}
        <main className="flex-grow relative">
          {originalUrl && (
            <iframe 
              ref={iframeRef}
              src={originalUrl}
              className="w-full h-full absolute top-0 left-0 border-0"
              onLoad={handleIframeLoad}
              title="Survey"
            ></iframe>
          )}
        </main>
      </div>
    );
  }

  // Fallback loading state
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Loading...</h1>
        <p className="text-gray-600 mb-6">Setting up your survey experience...</p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context: any) {
  const { projectId, uid } = context.params;
  
  try {
    // In a real implementation, these would be fetched from your database
    // For now, we'll return mock data that should be replaced with actual API calls
    
    const props = {
      isValid: true, // This should be validated based on the link
      originalUrl: null, // This should be fetched from your database
      geoRestriction: null, // Project-specific geo restrictions
      linkType: 'LIVE' as const, // Determined from the link
      vendorCode: null, // Vendor associated with this link
      questions: [], // Legacy questions for mid-survey validation
      projectTitle: 'Research Survey', // Project title
      consentItems: [
        {
          id: 'privacy',
          title: 'Privacy Policy',
          description: 'I agree to the privacy policy and understand how my data will be used.',
          required: true,
          type: 'privacy' as const
        },
        {
          id: 'data_collection',
          title: 'Data Collection',
          description: 'I consent to the collection and processing of my survey responses.',
          required: true,
          type: 'data_collection' as const
        },
        {
          id: 'participation',
          title: 'Voluntary Participation',
          description: 'I understand that my participation is voluntary and I can withdraw at any time.',
          required: true,
          type: 'participation' as const
        }
      ], // Consent items required for this project
      presurveyQuestions: [
        {
          id: 'age_check',
          text: 'Are you 18 years of age or older?',
          type: 'single_choice' as const,
          options: ['Yes', 'No'],
          required: true,
          conditions: {
            qualification: 'disqualify' as const,
            qualificationMessage: 'You must be 18 or older to participate in this survey.'
          }
        },
        {
          id: 'country_check',
          text: 'Which country do you currently reside in?',
          type: 'single_choice' as const,
          options: ['United States', 'Canada', 'United Kingdom', 'Australia', 'Other'],
          required: true,
          conditions: {
            qualification: 'qualify' as const
          }
        }
      ] // Presurvey questions with conditional logic
    };
    
    return { props };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      props: {
        isValid: false,
        originalUrl: null,
        geoRestriction: null,
        linkType: 'LIVE' as const,
        vendorCode: null,
        questions: [],
        projectTitle: 'Survey',
        consentItems: [],
        presurveyQuestions: []
      }
    };
  }
}