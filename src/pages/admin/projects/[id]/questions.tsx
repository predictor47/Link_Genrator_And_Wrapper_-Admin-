import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '@/lib/protected-route';
import { getAmplifyDataService } from '@/lib/amplify-data-service';
import EnhancedFormGenerator from '@/components/EnhancedFormGenerator';
import { EnhancedFormData, EnhancedQuestion, convertEnhancedToLegacy } from '@/types/form-types';

interface Project {
  id: string;
  name: string;
  description?: string;
  settings?: string;
}

export default function QuestionsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<EnhancedFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  const loadProject = async () => {
    try {
      setIsLoading(true);
      const amplifyDataService = await getAmplifyDataService();
      
      if (!amplifyDataService || !amplifyDataService.projects) {
        throw new Error('Data service not available');
      }

      const projectResult = await amplifyDataService.projects.get({ id: id as string });
      
      if (projectResult && projectResult.data) {
        const projectData = projectResult.data;
        setProject(projectData);

        // Parse settings to get pre-survey questions
        if (projectData.settings) {
          try {
            const settings = JSON.parse(projectData.settings);
            if (settings.preSurveyQuestions) {
              const enhancedFormData: EnhancedFormData = {
                id: `form_${projectData.id}`,
                title: projectData.name,
                questions: settings.preSurveyQuestions.map((q: any, index: number) => ({
                  id: q.id || `q_${index + 1}`,
                  text: q.text,
                  description: q.description || '',
                  type: q.type || 'multiple-choice',
                  required: q.required ?? true,
                  isLead: q.isLead ?? false,
                  isQualifying: q.isQualifying ?? false,
                  options: (q.options || []).map((opt: any, optIndex: number) => {
                    // Handle both simple string options and enhanced option objects
                    if (typeof opt === 'string') {
                      return {
                        id: `opt_${optIndex + 1}`,
                        text: opt,
                        value: opt.toLowerCase().replace(/\s+/g, '_'),
                        skipToAction: 'next' as const,
                        isDisqualifying: false
                      };
                    } else {
                      return {
                        id: opt.id || `opt_${optIndex + 1}`,
                        text: opt.text || '',
                        value: opt.value || opt.text?.toLowerCase().replace(/\s+/g, '_') || '',
                        skipToAction: opt.skipToAction || 'next' as const,
                        skipToQuestion: opt.skipToQuestion,
                        isDisqualifying: opt.isDisqualifying || false
                      };
                    }
                  }),
                  disqualifyingAnswers: q.disqualifyingAnswers || [],
                  conditionalLogic: q.conditionalLogic || [],
                  validation: q.validation || {}
                })),
                responses: [],
                qualified: 0,
                disqualified: 0,
                createdAt: new Date(projectData.createdAt),
                lastModified: new Date()
              };
              setFormData(enhancedFormData);
            }
          } catch (e) {
            console.error('Error parsing project settings:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error loading project:', err);
      setError('Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSave = async (savedFormData: EnhancedFormData) => {
    try {
      setIsSaving(true);
      setError(null);

      const amplifyDataService = await getAmplifyDataService();
      
      if (!amplifyDataService || !amplifyDataService.projects) {
        throw new Error('Data service not available');
      }

      // Update project settings with new form data
      const currentSettings = project?.settings ? JSON.parse(project.settings) : {};
      const updatedSettings = {
        ...currentSettings,
        preSurveyQuestions: savedFormData.questions
      };

      await amplifyDataService.projects.update({
        id: id as string,
        settings: JSON.stringify(updatedSettings),
        updatedAt: new Date().toISOString()
      });

      setFormData(savedFormData);
      setSuccess('Pre-survey questions updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving questions:', err);
      setError('Failed to save questions. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading project...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!project) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h2>
            <p className="text-gray-600 mb-6">The project you're looking for doesn't exist.</p>
            <Link href="/admin/projects" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Back to Projects
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/admin/projects" className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-2 inline-block">
                  ← Back to Projects
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-gray-600 mt-2">Edit pre-survey questions and qualification logic</p>
              </div>
              <div className="flex gap-3">
                <Link 
                  href={`/admin/projects/${id}`}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  Project Overview
                </Link>
                <Link 
                  href={`/admin/projects/${id}/generate`}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Generate Links
                </Link>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}

          {/* Enhanced Form Generator */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Pre-Survey Questions</h2>
              <p className="text-gray-600">
                Configure questions that respondents must answer before accessing the main survey.
                Use these questions for qualification, lead generation, and conditional survey flow.
              </p>
              {isSaving && (
                <p className="text-blue-600 mt-2">
                  💾 Saving changes...
                </p>
              )}
            </div>

            <div className="p-6">
              <EnhancedFormGenerator
                onSave={handleFormSave}
                initialData={formData || {
                  id: `form_${project.id}`,
                  title: project.name,
                  questions: [],
                  responses: [],
                  qualified: 0,
                  disqualified: 0,
                  createdAt: new Date(),
                  lastModified: new Date()
                }}
              />
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-3">💡 Tips for Effective Pre-Survey Questions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <h4 className="font-medium mb-2">Question Types:</h4>
                <ul className="space-y-1">
                  <li>• <strong>Lead Questions:</strong> Collect contact information</li>
                  <li>• <strong>Qualifying Questions:</strong> Screen respondents</li>
                  <li>• <strong>Multiple Choice:</strong> Simple selection questions</li>
                  <li>• <strong>Scale Questions:</strong> Rating or satisfaction questions</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Advanced Features:</h4>
                <ul className="space-y-1">
                  <li>• <strong>Skip Logic:</strong> Route users based on answers</li>
                  <li>• <strong>Conditional Logic:</strong> Advanced branching rules</li>
                  <li>• <strong>Disqualification:</strong> End survey for specific answers</li>
                  <li>• <strong>Success Completion:</strong> End with qualified completion</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}