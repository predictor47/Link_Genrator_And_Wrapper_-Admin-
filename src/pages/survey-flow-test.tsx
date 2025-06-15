import { useState } from 'react';
import Link from 'next/link';
import CombinedSurveyFlow from '@/components/CombinedSurveyFlow';

export default function SurveyFlowTest() {
  const [testConfig, setTestConfig] = useState({
    projectId: 'test-project-123',
    uid: 'test-uid-456',
    surveyUrl: 'https://example.com/survey',
    vendorId: 'test-vendor'
  });

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Survey Flow Test Page
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            This page demonstrates the complete survey flow with pre-survey questions
          </p>
          
          {/* Test Configuration */}
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow mb-8">
            <h3 className="text-lg font-semibold mb-4">Test Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project ID
                </label>
                <input
                  type="text"
                  value={testConfig.projectId}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UID
                </label>
                <input
                  type="text"
                  value={testConfig.uid}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, uid: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Survey URL
                </label>
                <input
                  type="text"
                  value={testConfig.surveyUrl}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, surveyUrl: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor ID
                </label>
                <input
                  type="text"
                  value={testConfig.vendorId}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, vendorId: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="max-w-4xl mx-auto mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">How to Test:</h3>
          <ol className="list-decimal list-inside text-blue-700 space-y-2">
            <li>First, create a project with pre-survey questions using the Enhanced Form Generator at <Link href="/form-builder-demo" className="underline text-blue-600 hover:text-blue-800">/form-builder-demo</Link></li>
            <li>Use the project ID from your created project in the configuration above</li>
            <li>The flow will automatically load pre-survey questions and walk users through them</li>
            <li>Based on answers, users will either qualify for the main survey or be disqualified</li>
            <li>Lead questions will capture contact information for follow-up</li>
          </ol>
        </div>

        {/* Survey Flow Demo */}
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <CombinedSurveyFlow
            projectId={testConfig.projectId}
            uid={testConfig.uid}
            surveyUrl={testConfig.surveyUrl}
            vendorId={testConfig.vendorId}
          />
        </div>

        {/* API Endpoints */}
        <div className="max-w-4xl mx-auto mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Available API Endpoints:</h3>
          <div className="space-y-2 text-sm font-mono">
            <div><span className="text-green-600">GET</span> /api/projects/{testConfig.projectId}/pre-survey-questions</div>
            <div><span className="text-blue-600">POST</span> /api/projects/{testConfig.projectId}/pre-survey-response</div>
          </div>
        </div>
      </div>
    </div>
  );
}
