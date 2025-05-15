import { useState, useEffect } from 'react';
import { amplifyDataService } from '@/lib/amplify-data-service';

interface TrapQuestionProps {
  projectId: string;
  onAnswer: (question: string, answer: string, isCorrect: boolean) => void;
}

export interface TrapQuestion {
  id: string;
  text: string;
  type: string;
  options?: string[];
  correctAnswer: string;
}

/**
 * Component to present trap questions to users
 * These questions help detect bots and inattentive users
 */
const TrapQuestion: React.FC<TrapQuestionProps> = ({ projectId, onAnswer }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<TrapQuestion | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);

  // Load a random question
  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch questions for this project
        const questionsResult = await amplifyDataService.questions.listByProject(projectId);
        const questions = questionsResult.data || [];
        
        if (questions.length === 0) {
          setError('No questions available');
          setLoading(false);
          return;
        }
        
        // Select a random question
        const randomIndex = Math.floor(Math.random() * questions.length);
        const selectedQuestion = questions[randomIndex];
        
        // Extract options from JSON if they exist
        let options: string[] = [];
        if (selectedQuestion.options) {
          try {            if (typeof selectedQuestion.options === 'string') {
              options = JSON.parse(selectedQuestion.options) as string[];
            } else if (Array.isArray(selectedQuestion.options)) {
              options = selectedQuestion.options as string[];
            }
          } catch (e) {
            console.error('Error parsing question options:', e);
          }
        }
        
        setQuestion({
          id: selectedQuestion.id,
          text: selectedQuestion.text,
          type: selectedQuestion.type || 'TEXT',
          options: options,
          correctAnswer: typeof selectedQuestion.options === 'object' && selectedQuestion.options !== null 
            ? (selectedQuestion.options as any).correctAnswer || ''
            : ''
        });
      } catch (err) {
        console.error('Error fetching trap question:', err);
        setError('Failed to load question');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, [projectId]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    
    if (!question) return;
    
    // Check if the answer is correct
    // For multiple choice, exact match is required
    // For text input, we'll do a case-insensitive comparison
    const isCorrect = question.type === 'MULTIPLE_CHOICE'
      ? userAnswer === question.correctAnswer
      : userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
    
    onAnswer(question.text, userAnswer, isCorrect);
  };

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!question) {
    return null;
  }

  if (submitted) {
    return (
      <div className="bg-green-50 p-4 rounded-md">
        <p className="text-green-600">Thank you for your response.</p>
      </div>
    );
  }

  return (
    <div className="border p-4 rounded-md shadow-sm mb-4">
      <h3 className="font-medium text-gray-800 mb-3">{question.text}</h3>
      
      <form onSubmit={handleSubmit}>
        {question.type === 'MULTIPLE_CHOICE' && question.options && (
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <div key={index} className="flex items-center">
                <input
                  type="radio"
                  id={`option-${index}`}
                  name="trapAnswer"
                  value={option}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  required
                  className="mr-2"
                />
                <label htmlFor={`option-${index}`} className="text-gray-700">{option}</label>
              </div>
            ))}
          </div>
        )}
        
        {question.type === 'TEXT' && (
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            required
            placeholder="Enter your answer here"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        )}
        
        {question.type === 'COUNTRY' && (
          <select
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">Select your country</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
            {/* Add more countries as needed */}
          </select>
        )}
        
        <div className="mt-4">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Submit Answer
          </button>
        </div>
      </form>
    </div>
  );
};

export default TrapQuestion;
