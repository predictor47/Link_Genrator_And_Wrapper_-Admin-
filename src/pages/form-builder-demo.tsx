import React, { useState } from 'react';
import EnhancedFormGenerator from '@/components/EnhancedFormGenerator';
import { EnhancedFormData } from '@/types/form-types';

export default function FormBuilderDemo() {
  const [savedForm, setSavedForm] = useState<EnhancedFormData | null>(null);

  const handleFormSave = (formData: EnhancedFormData) => {
    setSavedForm(formData);
    console.log('Form saved:', formData);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Enhanced Form Generator Demo
          </h1>
          <p className="text-xl text-gray-600">
            Professional form builder with advanced logic and qualification rules
          </p>
          {savedForm && (
            <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded-lg">
              <p className="text-green-800">
                ✅ Form "{savedForm.title}" saved with {savedForm.questions.length} questions!
              </p>
            </div>
          )}
        </div>

        <EnhancedFormGenerator
          onSave={handleFormSave}
          initialData={savedForm || undefined}
          className="max-w-none"
        />

        {savedForm && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Form Data Preview:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(savedForm, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
