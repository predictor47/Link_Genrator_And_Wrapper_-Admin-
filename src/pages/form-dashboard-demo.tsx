import React from 'react';
import EnhancedFormDashboard from '@/components/EnhancedFormDashboard';

export default function FormDashboardDemo() {
  // For demo purposes, we'll use a hardcoded project ID
  // In a real application, this would come from the router or props
  const demoProjectId = 'demo-project-1';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Enhanced Form Dashboard Demo</h1>
            <p className="mt-2 text-gray-600">
              This dashboard shows comprehensive analytics for enhanced forms created with our form builder.
            </p>
            <div className="mt-4 p-4 bg-blue-100 border border-blue-200 rounded-lg">
              <p className="text-blue-800">
                <strong>Demo Project ID:</strong> {demoProjectId}
              </p>
              <p className="text-blue-700 mt-1">
                This demo uses sample data. In production, connect to a real project with form responses.
              </p>
            </div>
          </div>

          <EnhancedFormDashboard projectId={demoProjectId} />
        </div>
      </div>
    </div>
  );
}
