import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '@/lib/protected-route';
import { getAmplifyDataService } from '@/lib/amplify-data-service';

interface Question {
  text: string;
  options: string[];
}

export default function NewProject() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentOptions, setCurrentOptions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Add a new question to the list
  const addQuestion = () => {
    if (!currentQuestion.trim()) {
      setError('Question text is required');
      return;
    }

    // Parse options (comma-separated)
    const optionsArray = currentOptions
      .split(',')
      .map(option => option.trim())
      .filter(option => option.length > 0);

    if (optionsArray.length < 2) {
      setError('At least two options are required');
      return;
    }

    setQuestions([
      ...questions,
      {
        text: currentQuestion,
        options: optionsArray
      }
    ]);

    // Reset inputs
    setCurrentQuestion('');
    setCurrentOptions('');
    setError('');
  };

  // Remove a question from the list
  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const amplifyDataService = await getAmplifyDataService();
      if (!amplifyDataService || !amplifyDataService.projects) {
        console.error('amplifyDataService or amplifyDataService.projects is undefined:', { amplifyDataService });
        setError('Project creation service is not available (projects undefined).');
        setIsSubmitting(false);
        return;
      }
      if (typeof amplifyDataService.projects.create !== 'function') {
        console.error('amplifyDataService.projects.create is not a function:', amplifyDataService.projects);
        setError('Project creation service is not available (create not a function).');
        setIsSubmitting(false);
        return;
      }
      // Create project directly on client
      const now = new Date().toISOString();
      const projectResult = await amplifyDataService.projects.create({
        name,
        description: description || '',
        surveyUrl: `${window.location.origin}/survey`, // Auto-generate survey URL
        status: status,
        targetCompletions: 100,
        currentCompletions: 0,
        createdAt: now,
        updatedAt: now,
        settings: null
      });
      if (!projectResult || !projectResult.data) {
        setError('Failed to create project. Project creation returned null.');
        setIsSubmitting(false);
        return;
      }
      // Add questions if provided
      if (questions && Array.isArray(questions) && questions.length > 0) {
        const projectId = projectResult.data.id;
        const questionPromises = questions.map((q: { text: string, options: string[] }, index: number) => 
          amplifyDataService.questions.create({
            projectId,
            text: q.text,
            type: 'MULTIPLE_CHOICE',
            options: JSON.stringify(q.options || []),
            sequence: index + 1,
            isRequired: true,
            createdAt: now,
            updatedAt: now
          })
        );
        await Promise.all(questionPromises);
      }
      // Redirect to the admin dashboard
      router.push('/admin');
    } catch (error: any) {
      setError(error.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
          <Link 
            href="/admin" 
            className="text-blue-600 hover:text-blue-800"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Project Details</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            {/* Project Name */}
            <div className="mb-6">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Project Description */}
            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Project Status */}
            <div className="mb-6">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Project Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="DRAFT">Draft - Project is being created/configured</option>
                <option value="LIVE">Live - Project is active and collecting responses</option>
                <option value="COMPLETE">Complete - Project has finished collecting responses</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Choose the initial status for this project. You can change this later from the dashboard.
              </p>
            </div>

            {/* Pre-survey Questions Section */}
            <div className="mb-6 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Pre-survey Questions</h3>
              <p className="text-sm text-gray-600 mb-4">
                These questions will be asked before the survey and used for validation.
              </p>
              
              {/* Add New Question */}
              <div className="mb-6 p-4 bg-gray-50 rounded-md">
                <div className="mb-4">
                  <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text
                  </label>
                  <input
                    type="text"
                    id="question"
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="E.g., What is your age group?"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="options" className="block text-sm font-medium text-gray-700 mb-1">
                    Options (comma separated)
                  </label>
                  <input
                    type="text"
                    id="options"
                    value={currentOptions}
                    onChange={(e) => setCurrentOptions(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="E.g., 18-24, 25-34, 35-44, 45+"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={addQuestion}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  Add Question
                </button>
              </div>
              
              {/* Question List */}
              {questions.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">Added Questions:</h4>
                  
                  {questions.map((q, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-md bg-white flex justify-between items-start">
                      <div>
                        <p className="font-medium">{q.text}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Options: {q.options.join(', ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No questions added yet</p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}