import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { amplifyDataService } from '@/lib/amplify-data-service';
import ProtectedRoute from '@/lib/protected-route';

// Types for our component
interface Question {
  id: string;
  text: string;
  options: string[];
}

interface QuestionsPageProps {
  project: {
    id: string;
    name: string;
  };
  initialQuestions: Question[];
}

export default function QuestionsPage({ project, initialQuestions }: QuestionsPageProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Add a new question
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    if (!newQuestion.trim()) {
      setError('Question text is required');
      setIsLoading(false);
      return;
    }
    
    // Parse options from newline-separated text
    const options = newOptions
      .split('\n')
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);
    
    if (options.length < 2) {
      setError('At least two options are required');
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await axios.post(`/api/projects/${project.id}/questions`, {
        text: newQuestion,
        options
      });
      
      if (response.data.success) {
        setQuestions([response.data.question, ...questions]);
        setNewQuestion('');
        setNewOptions('');
        setSuccess('Question added successfully');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to add question');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete a question
  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    
    try {
      const response = await axios.delete(`/api/projects/${project.id}/questions`, {
        data: { questionId }
      });
      
      if (response.data.success) {
        setQuestions(questions.filter(q => q.id !== questionId));
        setSuccess('Question deleted successfully');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete question');
    }
  };
  
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
        <Link 
          href={`/admin/projects/${project.id}`}
          className="text-blue-600 hover:text-blue-800"
        >
          &larr; Back to project
        </Link>
        <h1 className="text-3xl font-bold mt-2">{project.name}</h1>
        <h2 className="text-xl font-semibold text-gray-700">Pre-Survey Questions</h2>
        <p className="text-gray-600 mt-1">
          These questions will be asked before the survey starts and randomly during the survey as a validation check.
        </p>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Add new question form */}
        <div className="md:col-span-1">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Add New Question</h3>
            
            <form onSubmit={handleAddQuestion}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newQuestion">
                  Question Text
                </label>
                <input
                  id="newQuestion"
                  type="text"
                  placeholder="e.g., What is your age range?"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newOptions">
                  Options (one per line)
                </label>
                <textarea
                  id="newOptions"
                  placeholder="e.g.,
18-24
25-34
35-44
45+"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={newOptions}
                  onChange={(e) => setNewOptions(e.target.value)}
                  rows={5}
                  required
                ></textarea>
                <p className="text-gray-500 text-xs mt-1">
                  Enter each option on a new line. At least 2 options are required.
                </p>
              </div>
              
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Adding...' : 'Add Question'}
              </button>
            </form>
          </div>
        </div>
        
        {/* Right column: List existing questions */}
        <div className="md:col-span-2">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Existing Questions</h3>
            
            {questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No questions added yet.</p>
                <p className="text-sm mt-2">Add questions to enable mid-survey validation.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((question) => (
                  <div 
                    key={question.id} 
                    className="border border-gray-200 rounded-md p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-lg">{question.text}</h4>
                        <ul className="mt-3 list-disc pl-6">
                          {question.options.map((option, index) => (
                            <li key={index} className="text-gray-600">{option}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete question"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}

export async function getServerSideProps(context: any) {
  const { id } = context.params;
  
  try {
    const projectResult = await amplifyDataService.projects.get(id);
    const project = projectResult.data;
    
    if (!project) {
      return {
        notFound: true
      };
    }
    
    // Fetch questions using Amplify Data Service
    const questionsResult = await amplifyDataService.questions.list({
      filter: { projectId: { eq: id } },
      sort: { field: 'createdAt', direction: 'DESC' }
    });
    
    const questions = questionsResult.data || [];
    
    // Parse options from JSON string to array if needed
    const parsedQuestions = questions.map(q => ({
      id: q.id,
      text: q.text,
      options: typeof q.options === 'string' ? JSON.parse(q.options || '[]') : q.options
    }));
    
    return {
      props: {
        project: {
          id: project.id,
          name: project.name
        },
        initialQuestions: JSON.parse(JSON.stringify(parsedQuestions))
      }
    };
  } catch (error) {
    console.error("Error fetching project data:", error);
    return {
      notFound: true
    };
  }
}