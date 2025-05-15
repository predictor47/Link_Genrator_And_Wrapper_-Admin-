import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import BehaviorTracker, { BehaviorData } from './BehaviorTracker';
import TrapQuestion from './TrapQuestion';
import CustomCaptcha from './CustomCaptcha';
import IframeMonitor from './IframeMonitor';

interface SurveyFlowProps {
  projectId: string;
  uid: string;
  surveyUrl: string;
  vendorId?: string;
}

type FlowStep = 'captcha' | 'trap-question' | 'survey' | 'completed' | 'disqualified' | 'quota-full' | 'error';

/**
 * SurveyFlow manages the complete flow from CAPTCHA verification through 
 * trap questions to survey completion
 */
const SurveyFlow: React.FC<SurveyFlowProps> = ({
  projectId,
  uid,
  surveyUrl,
  vendorId
}) => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<FlowStep>('captcha');
  const [error, setError] = useState<string | null>(null);
  const [behaviorData, setBehaviorData] = useState<BehaviorData | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [trapQuestionsVerified, setTrapQuestionsVerified] = useState(false);
  const [sessionData, setSessionData] = useState<any>({
    token: Math.random().toString(36).substring(2, 15),
    projectId,
    uid,
    vendorId,
    startTime: Date.now(),
    answers: [],
    metadata: {}
  });

  // Track suspicious behaviors
  const suspiciousActivity = useRef({
    rapidAnswers: false,
    inconsistentAnswers: false,
    botLikeBehavior: false,
    flagged: false,
    flags: [] as string[]
  });

  // Save session data to browser storage
  useEffect(() => {
    if (sessionData) {
      try {
        sessionStorage.setItem('surveySession', JSON.stringify(sessionData));
      } catch (e) {
        console.error('Failed to save session data to sessionStorage:', e);
      }
    }
  }, [sessionData]);

  // Handle behavior data collection
  const handleBehaviorData = (data: BehaviorData) => {
    setBehaviorData(data);
      // Update session metadata with behavior data
    setSessionData((prev: any) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        behavior: data
      }
    }));

    // Check for suspicious patterns
    const mouseMoveSpeed = data.mouseMovements / (data.idleTime || 1);
    
    if (mouseMoveSpeed > 100) { // Unusually fast mouse movements
      suspiciousActivity.current.botLikeBehavior = true;
      suspiciousActivity.current.flags.push('Unusually fast mouse movements');
    }

    if (data.copyPasteEvents > 5) { // Excessive copy-paste actions
      suspiciousActivity.current.botLikeBehavior = true;
      suspiciousActivity.current.flags.push('Excessive copy/paste detected');
    }
      // Add suspicious activity to session data
    if (suspiciousActivity.current.flags.length > 0) {
      setSessionData((prev: any) => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          suspiciousFlags: suspiciousActivity.current.flags
        }
      }));
    }
  };

  // Handle CAPTCHA verification
  const handleCaptchaVerify = (verified: boolean) => {
    setCaptchaVerified(verified);
    
    if (verified) {      // Add CAPTCHA verification to session data
      setSessionData((prev: any) => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          captchaVerified: true,
          captchaVerifiedAt: Date.now()
        }
      }));

      // Move to trap question if we have trap questions, otherwise directly to survey
      setCurrentStep('trap-question');
    }
  };

  // Handle trap question answers
  const handleTrapQuestionAnswer = async (question: string, answer: string, isCorrect: boolean) => {    // Store answer in session data
    setSessionData((prev: any) => ({
      ...prev,
      answers: [...prev.answers, { question, answer, isCorrect }]
    }));

    if (!isCorrect) {
      // Flag suspicious activity if trap question is answered incorrectly
      suspiciousActivity.current.inconsistentAnswers = true;
      suspiciousActivity.current.flags.push('Incorrect trap question answer');
      
      // We should still continue to the survey but flag this
      try {
        await axios.post('/api/links/flag', {
          projectId,
          uid,
          reason: 'Failed trap question',
          metadata: {
            question,
            answer,
            timestamp: Date.now()
          }
        });
      } catch (err) {
        console.error('Failed to flag incorrect trap question:', err);
      }
    }

    setTrapQuestionsVerified(true);
    setCurrentStep('survey');
  };

  // Handle survey status changes from IframeMonitor
  const handleSurveyStatusChange = (status: string, data?: any) => {
    switch (status) {
      case 'COMPLETED':
        setCurrentStep('completed');
        // Redirect after a short delay
        setTimeout(() => {
          router.push(`/thank-you-completed?projectId=${projectId}&uid=${uid}`);
        }, 2000);
        break;
      
      case 'QUOTA_FULL':
        setCurrentStep('quota-full');
        // Redirect after a short delay
        setTimeout(() => {
          router.push(`/sorry-quota-full?projectId=${projectId}&uid=${uid}`);
        }, 2000);
        break;
      
      case 'DISQUALIFIED':
        setCurrentStep('disqualified');
        // Redirect after a short delay
        setTimeout(() => {
          router.push(`/sorry-disqualified?projectId=${projectId}&uid=${uid}`);
        }, 2000);
        break;
      
      default:
        // Other status changes don't need page navigation
        break;
    }
  };

  // Handle errors
  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setCurrentStep('error');
  };

  return (
    <div className="survey-flow-container relative">
      {/* Track behavior throughout all steps */}
      <BehaviorTracker onDataCollected={handleBehaviorData} startTracking={true} />
      
      {/* Render current step */}
      {currentStep === 'captcha' && (
        <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
          <h2 className="text-xl font-medium text-gray-900 mb-4">Please Verify You Are Human</h2>
          <CustomCaptcha onVerify={handleCaptchaVerify} difficulty="medium" />
        </div>
      )}
      
      {currentStep === 'trap-question' && captchaVerified && (
        <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
          <h2 className="text-xl font-medium text-gray-900 mb-4">Quick Question</h2>
          <TrapQuestion 
            projectId={projectId} 
            onAnswer={handleTrapQuestionAnswer} 
          />
        </div>
      )}
      
      {currentStep === 'survey' && captchaVerified && (
        <div className="w-full h-full">
          <IframeMonitor 
            projectId={projectId}
            uid={uid}
            url={surveyUrl}
            onStatusChange={handleSurveyStatusChange}
          />
        </div>
      )}
      
      {currentStep === 'error' && (
        <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
          <h2 className="text-xl font-medium text-red-600 mb-2">Error</h2>
          <p className="text-gray-700">{error}</p>
          <button 
            onClick={() => setCurrentStep('captcha')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      )}

      {(currentStep === 'completed' || currentStep === 'disqualified' || currentStep === 'quota-full') && (
        <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
          <h2 className="text-xl font-medium text-gray-900 mb-4">
            {currentStep === 'completed' ? 'Survey Completed' : 
             currentStep === 'quota-full' ? 'Survey Quota Full' : 'Not Eligible'}
          </h2>
          <p className="text-gray-700">
            {currentStep === 'completed' ? 
              'Thank you for completing the survey. You will be redirected shortly.' :
             currentStep === 'quota-full' ? 
              'The quota for this survey has been filled. Thank you for your interest.' :
              'You do not match the criteria for this survey. Thank you for your interest.'}
          </p>
          <p className="text-sm text-gray-500 mt-4">Redirecting you in a few seconds...</p>
        </div>
      )}
    </div>
  );
};

export default SurveyFlow;
