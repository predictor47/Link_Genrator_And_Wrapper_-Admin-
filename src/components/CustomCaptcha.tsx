import { useState, useEffect, useRef } from 'react';

interface CustomCaptchaProps {
  onVerify: (verified: boolean) => void;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface CaptchaState {
  verified: boolean;
  challenge: string;
  attemptCount: number;
}

interface CaptchaChallenge {
  question: string;
  answer: string;
  type: 'math' | 'drag' | 'hold';
  items?: string[];
}

const CustomCaptcha: React.FC<CustomCaptchaProps> = ({ 
  onVerify, 
  difficulty = 'medium'
}) => {
  const [loading, setLoading] = useState(true);  const [challenge, setChallenge] = useState<CaptchaChallenge>({ 
    question: '', 
    answer: '',
    type: 'math'
  });
  const [userAnswer, setUserAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  
  // For drag challenges
  const [draggableItems, setDraggableItems] = useState<string[]>([]);
  const [dragResult, setDragResult] = useState<string[]>([]);
  
  // For hold-to-verify challenge
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const holdStartTime = useRef<number | null>(null);
  
  // Generate a challenge based on difficulty
  useEffect(() => {
    generateChallenge();
  }, [difficulty]);
  
  const generateChallenge = () => {
    setLoading(true);
    setError(null);
    
    try {
      let captchaChallenge;
      
      switch (difficulty) {
        case 'easy':
          captchaChallenge = generateEasyChallenge();
          break;
        case 'hard':
          captchaChallenge = generateHardChallenge();
          break;
        case 'medium':
        default:
          captchaChallenge = generateMediumChallenge();
          break;
      }
      
      setChallenge(captchaChallenge);
        // If it's a drag challenge, prepare the items
      if (captchaChallenge.type === 'drag' && captchaChallenge.items) {
        setDraggableItems(captchaChallenge.items);
        setDragResult([]);
      }
    } catch (err) {
      console.error('Error generating CAPTCHA challenge:', err);
      setError('Failed to generate CAPTCHA challenge');
    } finally {
      setLoading(false);
    }
  };
    const generateEasyChallenge = (): CaptchaChallenge => {
    // Simple math addition
    const num1 = Math.floor(Math.random() * 10);
    const num2 = Math.floor(Math.random() * 10);
    
    return {
      question: `What is ${num1} + ${num2}?`,
      answer: String(num1 + num2),
      type: 'math'
    };
  };
    const generateMediumChallenge = (): CaptchaChallenge => {
    const challengeType = Math.random() > 0.5 ? 'math' : 'drag';
    
    if (challengeType === 'math') {
      // Slightly harder math problem
      const operations = ['+', '-', '*'];
      const op = operations[Math.floor(Math.random() * operations.length)];
      
      let num1: number, num2: number, answer: number;
      
      switch (op) {
        case '+':
          num1 = Math.floor(Math.random() * 20);
          num2 = Math.floor(Math.random() * 20);
          answer = num1 + num2;
          break;
        case '-':
          num1 = Math.floor(Math.random() * 20) + 10;
          num2 = Math.floor(Math.random() * num1);
          answer = num1 - num2;
          break;
        case '*':
          num1 = Math.floor(Math.random() * 10);
          num2 = Math.floor(Math.random() * 10);
          answer = num1 * num2;
          break;
        default:
          num1 = 0;
          num2 = 0;
          answer = 0;
      }
      
      return {
        question: `What is ${num1} ${op} ${num2}?`,
        answer: String(answer),
        type: 'math'
      };
    } else {
      // Drag and drop challenge
      const challenges = [
        {
          question: 'Drag to order from smallest to largest',
          items: ['5', '2', '9', '1', '7'],
          answer: '12579'
        },
        {
          question: 'Drag to order alphabetically',
          items: ['dog', 'cat', 'bird', 'fish', 'ant'],
          answer: 'antbirddogcatfish'
        }
      ];
      
      const selectedChallenge = challenges[Math.floor(Math.random() * challenges.length)];
      
      return {
        question: selectedChallenge.question,
        items: [...selectedChallenge.items].sort(() => Math.random() - 0.5),
        answer: selectedChallenge.answer,
        type: 'drag' as const
      };
    }
  };
    const generateHardChallenge = (): CaptchaChallenge => {
    // Hold to verify with intermittent clicks
    return {
      question: 'Hold the button and click the targets that appear',
      answer: 'hold-complete',
      type: 'hold'
    };
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    setAttemptCount(prev => prev + 1);
    
    // For drag challenges, join the result array
    const submittedAnswer = challenge.type === 'drag'
      ? dragResult.join('')
      : userAnswer;
    
    if (submittedAnswer.trim() === challenge.answer) {
      setVerified(true);
      onVerify(true);
    } else {
      setError('Incorrect answer, please try again');
      
      // After 3 failed attempts, generate a new challenge
      if (attemptCount >= 2) {
        generateChallenge();
        setAttemptCount(0);
      }
    }
  };
  
  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, item: string) => {
    e.dataTransfer.setData('text/plain', item);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const item = e.dataTransfer.getData('text/plain');
    
    // Add to result and remove from draggable items
    setDragResult(prev => [...prev, item]);
    setDraggableItems(prev => prev.filter(i => i !== item));
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  // Handle hold challenge
  const handleHoldStart = () => {
    holdStartTime.current = Date.now();
    
    holdTimer.current = setInterval(() => {
      if (holdStartTime.current) {
        const elapsed = Date.now() - holdStartTime.current;
        const progress = Math.min(elapsed / 3000, 1); // Complete in 3 seconds
        setHoldProgress(progress);
        
        if (progress >= 1) {
          if (holdTimer.current) clearInterval(holdTimer.current);
          setVerified(true);
          onVerify(true);
        }
      }
    }, 50);
  };
  
  const handleHoldEnd = () => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
    
    // If they didn't hold long enough, reset progress
    if (holdProgress < 1) {
      setHoldProgress(0);
      holdStartTime.current = null;
    }
  };
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (holdTimer.current) clearInterval(holdTimer.current);
    };
  }, []);
  
  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (verified) {
    return (
      <div className="bg-green-50 p-4 rounded-md">
        <p className="text-green-600">Verification successful</p>
      </div>
    );
  }
  
  return (
    <div className="border p-4 rounded-md shadow-sm mb-4">
      <h3 className="font-medium text-gray-800 mb-3">Security Verification</h3>
      
      {error && (
        <div className="bg-red-50 p-2 rounded-md mb-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      
      <div className="mb-4">
        <p className="text-gray-700">{challenge.question}</p>
      </div>
      
      {challenge.type === 'math' && (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            required
            placeholder="Your answer"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
          
          <div className="mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Verify
            </button>
          </div>
        </form>
      )}
      
      {challenge.type === 'drag' && (
        <div>
          <div 
            className="min-h-[100px] bg-gray-100 p-4 rounded-md border-2 border-dashed border-gray-300 mb-4"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <p className="text-gray-500 mb-2">Drop items here in the correct order</p>
            
            <div className="flex flex-wrap gap-2">
              {dragResult.map((item, index) => (
                <div 
                  key={`result-${index}`}
                  className="bg-blue-100 p-2 rounded-md"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {draggableItems.map((item, index) => (
              <div 
                key={`item-${index}`}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                className="bg-gray-200 p-2 rounded-md cursor-move"
              >
                {item}
              </div>
            ))}
          </div>
          
          {dragResult.length === challenge.items?.length && (
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Verify
            </button>
          )}
        </div>
      )}
      
      {challenge.type === 'hold' && (
        <div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${holdProgress * 100}%` }}
            ></div>
          </div>
          
          <button
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 w-full"
          >
            Hold to verify
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomCaptcha;
