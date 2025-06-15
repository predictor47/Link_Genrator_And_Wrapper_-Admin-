import React, { useState, useEffect } from 'react';
import PreSurveyFlow from './PreSurveyFlow';
import SurveyFlow from './SurveyFlow';
import { EnhancedQuestion } from '@/types/form-types';

type FlowStage = 'loading' | 'pre-survey' | 'main-survey' | 'completed' | 'disqualified' | 'error';

interface CombinedSurveyFlowProps {
  projectId: string;
  uid: string;
  surveyUrl?: string;
  vendorId?: string;
}

export default function CombinedSurveyFlow({
  projectId,
  uid,
  surveyUrl,
  vendorId
}: CombinedSurveyFlowProps) {
  const [currentStage, setCurrentStage] = useState<FlowStage>('loading');
  const [preSurveyQuestions, setPreSurveyQuestions] = useState<EnhancedQuestion[]>([]);
  const [preSurveyData, setPreSurveyData] = useState<{
    responses: Record<string, any>;
    leadData: Record<string, any>;
  } | null>(null);
  const [error, setError] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');

  // Helper function to normalize question types
  const normalizeQuestionType = (type: string): EnhancedQuestion['type'] => {
    const typeMap: Record<string, EnhancedQuestion['type']> = {
      'text': 'short-text',
      'textarea': 'paragraph',
      'email': 'email',
      'number': 'number',
      'single_choice': 'multiple-choice',
      'multiple_choice': 'checkbox',
      'dropdown': 'dropdown',
      'scale': 'scale',
      'MULTIPLE_CHOICE': 'multiple-choice',
      'TEXT': 'short-text',
      'EMAIL': 'email',
      'NUMBER': 'number',
      'short-text': 'short-text',
      'paragraph': 'paragraph',
      'multiple-choice': 'multiple-choice',
      'checkbox': 'checkbox'
    };
    return typeMap[type] || 'short-text';
  };

  // Helper function to normalize questions from API
  const normalizeQuestions = (questions: any[]): EnhancedQuestion[] => {
    return questions.map((q: any) => ({
      id: q.id,
      text: q.text,
      description: q.description || '',
      type: normalizeQuestionType(q.type),
      required: q.required ?? true,
      isLead: q.isLead || false,
      isQualifying: q.isQualifying || false,
      options: q.options?.map((opt: any, index: number) => ({
        id: opt.id || `opt_${index}`,
        text: typeof opt === 'string' ? opt : opt.text,
        value: typeof opt === 'string' ? opt.toLowerCase().replace(/\s+/g, '_') : opt.value,
        isDisqualifying: opt.isDisqualifying || false
      })) || [],
      disqualifyingAnswers: q.disqualifyingAnswers || []
    }));
  };

  // Load pre-survey questions
  useEffect(() => {
    fetchPreSurveyQuestions();
  }, [projectId]);

  const fetchPreSurveyQuestions = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/pre-survey-questions`);
      const data = await response.json();

      if (data.success) {
        const normalizedQuestions = normalizeQuestions(data.questions || []);
        setPreSurveyQuestions(normalizedQuestions);
        setProjectName(data.projectName || 'Survey');
        
        // If no pre-survey questions, skip directly to main survey
        if (!data.questions || data.questions.length === 0) {
          setCurrentStage('main-survey');
        } else {
          setCurrentStage('pre-survey');
        }
      } else {
        throw new Error(data.error || 'Failed to load survey questions');
      }
    } catch (err) {
      console.error('Error fetching pre-survey questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load survey');
      setCurrentStage('error');
    }
  };

  const handlePreSurveyComplete = async (
    qualified: boolean, 
    responses: Record<string, any>, 
    leadData: Record<string, any>
  ) => {
    try {
      // Save pre-survey responses
      const saveResponse = await fetch(`/api/projects/${projectId}/pre-survey-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid,
          responses,
          leadData,
          qualified,
          completionTime: Date.now()
        })
      });

      const saveData = await saveResponse.json();

      if (!saveData.success) {
        throw new Error(saveData.error || 'Failed to save responses');
      }

      setPreSurveyData({ responses, leadData });

      if (qualified) {
        // Proceed to main survey
        setCurrentStage('main-survey');
      } else {
        // Show disqualification
        setCurrentStage('disqualified');
      }
    } catch (err) {
      console.error('Error saving pre-survey response:', err);
      setError(err instanceof Error ? err.message : 'Failed to save responses');
      setCurrentStage('error');
    }
  };

  const handlePreSurveyError = (errorMessage: string) => {
    setError(errorMessage);
    setCurrentStage('error');
  };

  if (currentStage === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (currentStage === 'error') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-800 mb-4">Survey Error</h2>
          <p className="text-red-700 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (currentStage === 'disqualified') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-yellow-800 mb-4">Survey Ended</h2>
          <p className="text-yellow-700 mb-6">
            Thank you for your interest, but you don't qualify for this particular survey.
          </p>
          <p className="text-gray-600">
            We appreciate your time and encourage you to check back for other opportunities.
          </p>
        </div>
      </div>
    );
  }

  if (currentStage === 'pre-survey') {
    return (
      <div>
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{projectName}</h1>
          <p className="text-lg text-gray-600">Pre-screening Questions</p>
          <p className="text-sm text-gray-500 mt-2">
            Please answer these questions to determine your eligibility for this survey.
          </p>
        </div>

        <PreSurveyFlow
          projectId={projectId}
          uid={uid}
          questions={preSurveyQuestions}
          onComplete={handlePreSurveyComplete}
          onError={handlePreSurveyError}
        />
      </div>
    );
  }

  if (currentStage === 'main-survey') {
    return (
      <div>
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{projectName}</h1>
          {preSurveyData && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">
                ✅ Pre-screening completed successfully! You may now proceed to the main survey.
              </p>
            </div>
          )}
        </div>

        <SurveyFlow
          projectId={projectId}
          uid={uid}
          surveyUrl={surveyUrl || `${window.location.origin}/survey`}
          vendorId={vendorId}
        />
      </div>
    );
  }

  return null;
}
