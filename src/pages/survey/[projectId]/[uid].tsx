import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { amplifyDataService } from '@/lib/amplify-data-service';
import { detectVPN } from '@/lib/vpn-detection';
import { collectClientMetadata } from '@/lib/metadata';

// Types for our component
interface Question {
  id: string;
  text: string;
  options: string[];
}

interface SessionData {
  token: string;
  projectId: string;
  uid: string;
  linkType: string;
  answers: Array<{
    questionId: string;
    value: string;
  }>;
  metadata: any;
}

export default function SurveyPage({ 
  isValid, 
  originalUrl, 
  geoRestriction,
  linkType,
  vendorCode,
  questions = [],
}: { 
  isValid: boolean;
  originalUrl: string | null;
  geoRestriction: string[] | null;
  linkType: 'TEST' | 'LIVE';
  vendorCode: string | null;
  questions: Question[];
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVpnWarning, setShowVpnWarning] = useState(false);
  const [geoBlocked, setGeoBlocked] = useState(false);
  const [userCountry, setUserCountry] = useState<string>('Unknown');
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // New states for mid-survey validation
  const [showMidSurveyQuestion, setShowMidSurveyQuestion] = useState(false);
  const [midSurveyQuestion, setMidSurveyQuestion] = useState<Question | null>(null);
  const [midSurveyAnswer, setMidSurveyAnswer] = useState<string>('');
  const [validationCountdown, setValidationCountdown] = useState<number | null>(null);
  const [validationTimer, setValidationTimer] = useState<NodeJS.Timeout | null>(null);
  const [validationFailed, setValidationFailed] = useState(false);

  // Set up a random question for pre-survey screening
  useEffect(() => {
    if (questions.length > 0 && !question) {
      const randomIndex = Math.floor(Math.random() * questions.length);
      setQuestion(questions[randomIndex]);
    }
  }, [questions]);
  
  // Set up mid-survey validation timer
  useEffect(() => {
    if (sessionData && iframeLoaded && !validationTimer && questions.length > 0 && !showMidSurveyQuestion) {
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
  }, [sessionData, iframeLoaded, questions, showMidSurveyQuestion]);
  
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

  // Perform initial check for VPN and geo-restriction
  useEffect(() => {
    const checkSecurityConstraints = async () => {
      if (!isValid || !originalUrl) return;
      
      setIsLoading(true);
      try {
        // Get IP information
        const ipResponse = await axios.get('/api/ip-check');
        const isVpn = await detectVPN(ipResponse.data.ip);
        const country = ipResponse.data.country || 'Unknown';
        
        setUserCountry(country);
        
        // Check if user's country is in the allowed list
        const isGeoAllowed = !geoRestriction || 
          !geoRestriction.length || 
          geoRestriction.includes(country);
        
        // Handle VPN detection based on link type
        if (isVpn) {
          if (linkType === 'LIVE') {
            setShowVpnWarning(true);
            
            // Log this VPN detection
            await axios.post('/api/links/flag', {
              projectId: router.query.projectId as string,
              uid: router.query.uid as string,
              reason: 'VPN detected',
              metadata: {
                ip: ipResponse.data.ip,
                country
              }
            });
          } else {
            // For TEST links, log but allow
            console.log('VPN detected but allowed in TEST mode');
            
            // Still flag it but continue
            await axios.post('/api/links/flag', {
              projectId: router.query.projectId as string,
              uid: router.query.uid as string,
              reason: 'VPN detected (TEST link)',
              metadata: {
                ip: ipResponse.data.ip,
                country
              }
            });
          }
        }
        
        // Handle geo-restriction based on link type  
        if (!isGeoAllowed) {
          if (linkType === 'LIVE') {
            setGeoBlocked(true);
            
            // Flag the geo-restriction violation
            await axios.post('/api/links/flag', {
              projectId: router.query.projectId as string,
              uid: router.query.uid as string,
              reason: 'Geographic restriction violation',
              metadata: {
                ip: ipResponse.data.ip,
                country,
                allowedCountries: geoRestriction
              }
            });
          } else {
            // For TEST links, log but allow
            console.log('Geo-restriction violated but allowed in TEST mode');
            
            // Still flag it but continue
            await axios.post('/api/links/flag', {
              projectId: router.query.projectId as string,
              uid: router.query.uid as string,
              reason: 'Geographic restriction violation (TEST link)',
              metadata: {
                ip: ipResponse.data.ip,
                country,
                allowedCountries: geoRestriction
              }
            });
          }
        }
        
        // Collect metadata about user session
        const metadata = collectClientMetadata();
        
        // Store session data
        if (!showVpnWarning && !geoBlocked) {
          const sessionToken = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          
          const session: SessionData = {
            token: sessionToken,
            projectId: router.query.projectId as string,
            uid: router.query.uid as string,
            linkType: linkType,
            answers: question ? [{ questionId: question.id, value: selectedAnswer || '' }] : [],
            metadata: {
              ...metadata,
              ip: ipResponse.data.ip,
              country,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              vendor: vendorCode
            }
          };
          
          sessionStorage.setItem('surveySession', JSON.stringify(session));
          setSessionData(session);
          
          // Update the survey link status to STARTED
          try {
            await axios.post('/api/links/update-status', {
              projectId: router.query.projectId as string,
              uid: router.query.uid as string,
              status: 'STARTED',
              token: sessionToken,
              metadata: session.metadata
            });
          } catch (error) {
            console.error('Failed to update status to STARTED:', error);
          }
        }
      } catch (error) {
        console.error('Error during security checks:', error);
        setError('Failed to perform security checks. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSecurityConstraints();
  }, [originalUrl, isValid, geoRestriction, linkType, router.query, vendorCode]);

  // Handle pre-survey question submission
  const handleQuestionSubmit = async () => {
    if (!selectedAnswer || !question) {
      setError('Please select an answer to continue');
      return;
    }
    
    try {
      // Store the answer
      const storedSession = sessionStorage.getItem('surveySession');
      if (storedSession) {
        const session: SessionData = JSON.parse(storedSession);
        
        // Add/update this answer
        const answerIndex = session.answers.findIndex(a => a.questionId === question.id);
        if (answerIndex >= 0) {
          session.answers[answerIndex].value = selectedAnswer;
        } else {
          session.answers.push({
            questionId: question.id,
            value: selectedAnswer
          });
        }
        
        sessionStorage.setItem('surveySession', JSON.stringify(session));
        setSessionData(session);
        
        // Save the answer to database
        await axios.post('/api/links/update-status', {
          projectId: router.query.projectId as string,
          uid: router.query.uid as string,
          status: 'IN_PROGRESS',
          questionId: question.id,
          answer: selectedAnswer,
          token: session.token
        });
      }
      
      // Continue to survey
      setQuestion(null);
    } catch (error) {
      console.error('Error saving answer:', error);
      setError('Failed to save your answer. Please try again.');
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
  
  // VPN Warning
  if (showVpnWarning) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-amber-600 mb-4">VPN Detected</h1>
          <p className="text-gray-700 mb-6">
            It appears you're using a VPN or proxy. To ensure data quality, please disable your VPN and refresh this page.
          </p>
          <p className="text-gray-500 text-sm">
            This helps us maintain the integrity of survey responses.
          </p>
        </div>
      </div>
    );
  }
  
  // Geo-restriction block
  if (geoBlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Geographic Restriction</h1>
          <p className="text-gray-700 mb-6">
            We're sorry, but this survey is not available in your country ({userCountry}).
          </p>
          <p className="text-gray-500 text-sm">
            This survey is only available to participants from specific regions.
          </p>
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
  
  // Show pre-survey question
  if (question) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Pre-Survey Question</h1>
          <p className="text-gray-500 text-sm mb-6">
            Please answer this question before proceeding to the survey.
          </p>
          
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-700 mb-3">{question.text}</h2>
            <div className="space-y-2">
              {question.options.map((option, index) => (
                <div key={index} className="flex items-center">
                  <input
                    id={`option-${index}`}
                    type="radio"
                    name="question"
                    value={option}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    onChange={() => setSelectedAnswer(option)}
                    checked={selectedAnswer === option}
                  />
                  <label htmlFor={`option-${index}`} className="ml-2 block text-gray-700">
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleQuestionSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Continue to Survey
          </button>
        </div>
      </div>
    );
  }
  
  // Show mid-survey validation
  if (showMidSurveyQuestion && midSurveyQuestion) {
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
  
  // Show the survey in an iframe
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

export async function getServerSideProps(context: any) {
  const { projectId, uid } = context.params;
  
  try {
    // Get the survey link using Amplify Data Service
    const linkResult = await amplifyDataService.surveyLinks.getByUid(uid);
    if (!linkResult || !linkResult.data) {
      return {
        props: {
          isValid: false,
          originalUrl: null,
          geoRestriction: null,
          linkType: null,
          vendorCode: null,
          questions: []
        }
      };
    }
    
    const link = linkResult.data;
    
    if (link.projectId !== projectId) {
      return {
        props: {
          isValid: false,
          originalUrl: null,
          geoRestriction: null,
          linkType: null,
          vendorCode: null,
          questions: []
        }
      };
    }
    
    // Get the project with questions
    const projectResult = await amplifyDataService.projects.get(projectId);
    if (!projectResult || !projectResult.data) {
      return {
        props: {
          isValid: false,
          originalUrl: null,
          geoRestriction: null,
          linkType: null,
          vendorCode: null,
          questions: []
        }
      };
    }
    
    const project = projectResult.data;
    
    // Get the questions for this project
    const questionsResult = await amplifyDataService.questions.listByProject(projectId);
    const questionsData = questionsResult?.data || [];

    // Get vendor code if available
    let vendorCode = null;
    if (link.vendorId) {
      const vendorResult = await amplifyDataService.vendors.get(link.vendorId);
      vendorCode = vendorResult?.data?.code || null;
    }
    
    // Parse geo-restriction from JSON string
    let geoRestriction = null;
    if (link.geoRestriction) {
      try {
        geoRestriction = JSON.parse(link.geoRestriction);
      } catch (e) {
        console.error('Error parsing geo-restriction:', e);
      }
    }
    
    // Parse question options from JSON string
    const questions = questionsData.map(q => ({
      ...q,
      options: JSON.parse(q.options || '[]')
    }));
    
    return {
      props: {
        isValid: true,
        originalUrl: link.originalUrl,
        geoRestriction,
        linkType: link.linkType,
        vendorCode,
        questions: JSON.parse(JSON.stringify(questions))
      }
    };
  } catch (error) {
    console.error('Error fetching survey link:', error);
    return {
      props: {
        isValid: false,
        originalUrl: null,
        geoRestriction: null,
        linkType: null,
        vendorCode: null,
        questions: []
      }
    };
  }
}