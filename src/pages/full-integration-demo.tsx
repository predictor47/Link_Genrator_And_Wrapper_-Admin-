import React, { useState } from 'react';
import EnhancedFormGenerator from '@/components/EnhancedFormGenerator';
import CombinedSurveyFlow from '@/components/CombinedSurveyFlow';
import EnhancedFormDashboard from '@/components/EnhancedFormDashboard';
import { EnhancedFormData } from '@/types/form-types';

export default function FullIntegrationDemo() {
  const [currentStep, setCurrentStep] = useState<'build' | 'test' | 'analytics'>('build');
  const [savedForm, setSavedForm] = useState<EnhancedFormData | null>(null);
  const [projectId] = useState('demo-project-integration');

  const handleFormSave = (formData: EnhancedFormData) => {
    setSavedForm(formData);
    console.log('Form saved:', formData);
    // In a real application, this would save to the backend
  };

  const stepIndicator = (step: string, label: string, isActive: boolean, isCompleted: boolean) => (
    <div className={`flex items-center ${isCompleted ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-400'}`}>
      <div className={`
        flex items-center justify-center w-8 h-8 rounded-full border-2 
        ${isCompleted ? 'bg-green-600 border-green-600 text-white' : 
          isActive ? 'bg-blue-600 border-blue-600 text-white' : 
          'border-gray-300 text-gray-400'}
      `}>
        {isCompleted ? '✓' : step}
      </div>
      <span className="ml-2 font-medium">{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Complete Enhanced Form Integration Demo
            </h1>
            <p className="text-gray-600 mb-6">
              Experience the full workflow: Build → Test → Analyze
            </p>

            {/* Step Indicator */}
            <div className="flex space-x-8 mb-8">
              {stepIndicator('1', 'Build Form', currentStep === 'build', savedForm !== null)}
              {stepIndicator('2', 'Test Flow', currentStep === 'test', false)}
              {stepIndicator('3', 'View Analytics', currentStep === 'analytics', false)}
            </div>

            {/* Navigation */}
            <div className="flex space-x-4 mb-8">
              <button
                onClick={() => setCurrentStep('build')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentStep === 'build'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Form Builder
              </button>
              <button
                onClick={() => setCurrentStep('test')}
                disabled={!savedForm}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentStep === 'test' && savedForm
                    ? 'bg-blue-600 text-white'
                    : savedForm
                    ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Test Survey Flow
              </button>
              <button
                onClick={() => setCurrentStep('analytics')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentStep === 'analytics'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Analytics Dashboard
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-lg">
            {currentStep === 'build' && (
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Enhanced Form Builder</h2>
                  <p className="text-gray-600">
                    Create professional pre-survey forms with advanced question types, logic, and validation.
                  </p>
                </div>
                
                {savedForm && (
                  <div className="mb-6 p-4 bg-green-100 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">
                          Form saved successfully! You can now test the survey flow.
                        </p>
                        <p className="text-sm text-green-700 mt-1">
                          Form "{savedForm.title}" with {savedForm.questions.length} questions
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <EnhancedFormGenerator 
                  onSave={handleFormSave}
                  initialData={savedForm || undefined}
                />
              </div>
            )}

            {currentStep === 'test' && savedForm && (
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Test Survey Flow</h2>
                  <p className="text-gray-600">
                    Experience how respondents will interact with your form in the actual survey flow.
                  </p>
                </div>

                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-4">
                    <strong>Simulation Mode:</strong> This shows how your form integrates with the survey flow
                  </p>
                  
                  <CombinedSurveyFlow 
                    projectId={projectId}
                    uid="demo-uid-123"
                  />
                </div>
              </div>
            )}

            {currentStep === 'test' && !savedForm && (
              <div className="p-6">
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No form to test</h3>
                  <p className="mt-1 text-sm text-gray-500">Create and save a form first to test the survey flow.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => setCurrentStep('build')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Go to Form Builder
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'analytics' && (
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
                  <p className="text-gray-600">
                    Comprehensive insights into form performance, response patterns, and user behavior.
                  </p>
                </div>

                <EnhancedFormDashboard projectId={projectId} />
              </div>
            )}
          </div>

          {/* Features Overview */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">Advanced Form Builder</h3>
              </div>
              <p className="text-gray-600">
                Professional form creation with 8+ question types, conditional logic, validation rules, and lead capture.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">Seamless Integration</h3>
              </div>
              <p className="text-gray-600">
                Forms automatically inject into survey flows with qualification logic and backend data persistence.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">Rich Analytics</h3>
              </div>
              <p className="text-gray-600">
                Detailed insights including qualification rates, response patterns, completion times, and lead analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
