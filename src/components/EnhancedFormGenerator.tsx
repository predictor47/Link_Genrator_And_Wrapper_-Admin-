import React, { useState, useEffect } from 'react';
import { EnhancedQuestion, EnhancedFormData, QuestionOption } from '@/types/form-types';

interface EnhancedFormGeneratorProps {
  onSave: (formData: EnhancedFormData) => void;
  initialData?: EnhancedFormData;
  className?: string;
}

const EnhancedFormGenerator: React.FC<EnhancedFormGeneratorProps> = ({
  onSave,
  initialData,
  className = ''
}) => {
  const [currentForm, setCurrentForm] = useState<EnhancedFormData>({
    id: generateId(),
    title: 'Professional Survey',
    questions: [],
    responses: [],
    qualified: 0,
    disqualified: 0,
    createdAt: new Date(),
    lastModified: new Date()
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [userResponses, setUserResponses] = useState<Record<string, any>>({});
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', body: '' });

  function generateId() {
    return 'form_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  useEffect(() => {
    if (initialData) {
      setCurrentForm(initialData);
    } else {
      // Add some sample questions for demonstration
      const sampleQuestions: EnhancedQuestion[] = [
        {
          id: generateId(),
          text: "What's your name?",
          type: 'short-text',
          required: true,
          isLead: true,
          isQualifying: false
        },
        {
          id: generateId(),
          text: "Are you currently employed?",
          type: 'multiple-choice',
          required: true,
          isLead: false,
          isQualifying: true,
          options: [
            { id: '1', text: 'Yes, full-time', value: 'yes_full' },
            { id: '2', text: 'Yes, part-time', value: 'yes_part' },
            { id: '3', text: 'No, unemployed', value: 'no_unemployed' },
            { id: '4', text: 'No, retired', value: 'no_retired', isDisqualifying: true }
          ],
          disqualifyingAnswers: ['No, retired']
        },
        {
          id: generateId(),
          text: "How satisfied are you with our service?",
          type: 'scale',
          required: true,
          isLead: false,
          isQualifying: false
        }
      ];

      setCurrentForm(prev => ({
        ...prev,
        questions: sampleQuestions
      }));
    }
  }, [initialData]);

  const showAlert = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    // Create and show alert notification
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  const updateFormTitle = (newTitle: string) => {
    setCurrentForm(prev => ({
      ...prev,
      title: newTitle || 'Untitled Survey',
      lastModified: new Date()
    }));
  };

  const addQuestion = (questionData: Omit<EnhancedQuestion, 'id'>) => {
    const newQuestion: EnhancedQuestion = {
      ...questionData,
      id: generateId()
    };

    setCurrentForm(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
      lastModified: new Date()
    }));

    showAlert('Question added successfully!', 'success');
  };

  const updateQuestion = (index: number, questionData: Omit<EnhancedQuestion, 'id'>) => {
    setCurrentForm(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...questionData, id: q.id } : q
      ),
      lastModified: new Date()
    }));

    showAlert('Question updated successfully!', 'success');
  };

  const deleteQuestion = (index: number) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      setCurrentForm(prev => ({
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index),
        lastModified: new Date()
      }));

      showAlert('Question deleted successfully!', 'success');
    }
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const questions = [...currentForm.questions];
    
    if (direction === 'up' && index > 0) {
      [questions[index], questions[index - 1]] = [questions[index - 1], questions[index]];
    } else if (direction === 'down' && index < questions.length - 1) {
      [questions[index], questions[index + 1]] = [questions[index + 1], questions[index]];
    }

    setCurrentForm(prev => ({
      ...prev,
      questions,
      lastModified: new Date()
    }));

    showAlert('Question moved successfully!', 'success');
  };

  const openQuestionEditor = (type: string, existingQuestion?: EnhancedQuestion) => {
    setEditingQuestionIndex(existingQuestion ? 
      currentForm.questions.indexOf(existingQuestion) : null);
    
    setModalContent({
      title: `${editingQuestionIndex !== null ? 'Edit' : 'Add'} ${formatQuestionType(type)} Question`,
      body: generateQuestionEditorContent(type, existingQuestion)
    });
    setShowModal(true);
  };

  const formatQuestionType = (type: string) => {
    const types: Record<string, string> = {
      'short-text': 'Short Text',
      'paragraph': 'Paragraph',
      'multiple-choice': 'Multiple Choice',
      'checkbox': 'Checkboxes',
      'dropdown': 'Dropdown',
      'number': 'Number',
      'email': 'Email',
      'scale': 'Scale'
    };
    return types[type] || type;
  };

  const generateQuestionEditorContent = (type: string, existingQuestion?: EnhancedQuestion) => {
    const optionsHTML = ['multiple-choice', 'checkbox', 'dropdown'].includes(type) 
      ? generateOptionsEditor(existingQuestion?.options || [])
      : '';

    return `
      <div class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Question Text</label>
          <input type="text" id="question-text" class="w-full border border-gray-300 rounded-md px-3 py-2" 
                 value="${existingQuestion?.text || ''}" placeholder="Enter your question...">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
          <textarea id="question-description" class="w-full border border-gray-300 rounded-md px-3 py-2" 
                    placeholder="Additional context or instructions...">${existingQuestion?.description || ''}</textarea>
        </div>

        <div class="flex items-center space-x-4">
          <label class="flex items-center">
            <input type="checkbox" id="required-checkbox" ${existingQuestion?.required ? 'checked' : ''}>
            <span class="ml-2 text-sm text-gray-700">Required</span>
          </label>
          
          <label class="flex items-center">
            <input type="checkbox" id="lead-checkbox" ${existingQuestion?.isLead ? 'checked' : ''}>
            <span class="ml-2 text-sm text-gray-700">Lead Question</span>
          </label>
          
          <label class="flex items-center">
            <input type="checkbox" id="qualifying-checkbox" ${existingQuestion?.isQualifying ? 'checked' : ''}>
            <span class="ml-2 text-sm text-gray-700">Qualifying Question</span>
          </label>
        </div>

        ${optionsHTML}
        
        <div class="flex justify-end space-x-3 pt-4 border-t">
          <button type="button" class="btn-secondary" onclick="hideModal()">Cancel</button>
          <button type="button" class="btn-primary" onclick="saveQuestion('${type}')">
            ${editingQuestionIndex !== null ? 'Update' : 'Add'} Question
          </button>
        </div>
      </div>
    `;
  };

  const generateOptionsEditor = (options: QuestionOption[]) => {
    return `
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Options</label>
        <div id="options-list" class="space-y-2">
          ${options.map((option, index) => `
            <div class="flex items-center space-x-2">
              <input type="text" class="flex-1 border border-gray-300 rounded-md px-3 py-2" 
                     value="${option.text}" placeholder="Option ${index + 1}">
              <button type="button" class="text-red-600 hover:text-red-800" onclick="removeOption(this)">×</button>
            </div>
          `).join('')}
        </div>
        <button type="button" class="mt-2 text-blue-600 hover:text-blue-800" onclick="addOption()">+ Add Option</button>
      </div>
    `;
  };

  const saveQuestionFromModal = (type: string) => {
    const questionText = (document.getElementById('question-text') as HTMLInputElement)?.value?.trim();
    if (!questionText) {
      showAlert('Please enter a question text.', 'error');
      return;
    }

    const questionData: Omit<EnhancedQuestion, 'id'> = {
      text: questionText,
      description: (document.getElementById('question-description') as HTMLTextAreaElement)?.value?.trim() || '',
      type: type as any,
      required: (document.getElementById('required-checkbox') as HTMLInputElement)?.checked || false,
      isLead: (document.getElementById('lead-checkbox') as HTMLInputElement)?.checked || false,
      isQualifying: (document.getElementById('qualifying-checkbox') as HTMLInputElement)?.checked || false
    };

    // Handle options for choice-based questions
    if (['multiple-choice', 'checkbox', 'dropdown'].includes(type)) {
      const optionInputs = document.querySelectorAll('.option-input') as NodeListOf<HTMLInputElement>;
      const options = Array.from(optionInputs)
        .map((input, index) => ({
          id: (index + 1).toString(),
          text: input.value.trim(),
          value: input.value.trim().toLowerCase().replace(/\s+/g, '_')
        }))
        .filter(option => option.text);

      if (options.length < 2) {
        showAlert('Please provide at least 2 options.', 'error');
        return;
      }

      questionData.options = options;
    }

    if (editingQuestionIndex !== null) {
      updateQuestion(editingQuestionIndex, questionData);
      setEditingQuestionIndex(null);
    } else {
      addQuestion(questionData);
    }

    setShowModal(false);
  };

  // Add this function to handle adding options in the modal
  const addOptionToModal = () => {
    const optionsList = document.getElementById('options-list');
    if (optionsList) {
      const count = optionsList.children.length + 1;
      const div = document.createElement('div');
      div.className = 'flex items-center space-x-2 mb-2';
      div.innerHTML = `
        <input type="text" class="flex-1 border border-gray-300 rounded-md px-3 py-2 option-input" 
               placeholder="Option ${count}">
        <button type="button" class="text-red-600 hover:text-red-800 font-bold text-lg" onclick="this.parentElement.remove()">×</button>
      `;
      optionsList.appendChild(div);
    }
  };

  // Make functions available globally for the modal
  React.useEffect(() => {
    (window as any).saveQuestion = saveQuestionFromModal;
    (window as any).addOption = addOptionToModal;
    (window as any).hideModal = () => setShowModal(false);
  }, [editingQuestionIndex]);

  const saveForm = () => {
    if (currentForm.questions.length === 0) {
      showAlert('Please add at least one question before saving.', 'error');
      return;
    }

    onSave(currentForm);
    showAlert('Survey saved successfully!', 'success');
  };

  const togglePreview = () => {
    if (currentForm.questions.length === 0) {
      showAlert('Please add at least one question to preview the survey.', 'error');
      return;
    }

    setIsPreviewMode(!isPreviewMode);
    if (!isPreviewMode) {
      setCurrentQuestionIndex(0);
      setUserResponses({});
      setIsDisqualified(false);
    }
  };

  const applyTemplate = (templateType: 'lead' | 'satisfaction' | 'feedback') => {
    const templates = {
      lead: [
        {
          text: "What's your name?",
          type: 'short-text' as const,
          required: true,
          isLead: true,
          isQualifying: false
        },
        {
          text: "What's your email address?",
          type: 'email' as const,
          required: true,
          isLead: true,
          isQualifying: false
        },
        {
          text: "Are you currently employed?",
          type: 'multiple-choice' as const,
          required: true,
          isLead: false,
          isQualifying: true,
          options: [
            { id: '1', text: 'Yes, full-time', value: 'yes_full' },
            { id: '2', text: 'Yes, part-time', value: 'yes_part' },
            { id: '3', text: 'No, retired', value: 'no_retired', isDisqualifying: true }
          ],
          disqualifyingAnswers: ['No, retired']
        }
      ],
      satisfaction: [
        {
          text: "How satisfied are you with our service?",
          type: 'scale' as const,
          required: true,
          isLead: false,
          isQualifying: false
        },
        {
          text: "What can we improve?",
          type: 'paragraph' as const,
          required: false,
          isLead: false,
          isQualifying: false
        }
      ],
      feedback: [
        {
          text: "How often do you use our product?",
          type: 'multiple-choice' as const,
          required: true,
          isLead: false,
          isQualifying: false,
          options: [
            { id: '1', text: 'Daily', value: 'daily' },
            { id: '2', text: 'Weekly', value: 'weekly' },
            { id: '3', text: 'Monthly', value: 'monthly' },
            { id: '4', text: 'Rarely', value: 'rarely' }
          ]
        }
      ]
    };

    if (currentForm.questions.length > 0) {
      if (!window.confirm('This will replace your current questions. Continue?')) {
        return;
      }
    }

    const templateQuestions = templates[templateType].map(q => ({
      ...q,
      id: generateId()
    }));

    setCurrentForm(prev => ({
      ...prev,
      questions: templateQuestions,
      lastModified: new Date()
    }));

    showAlert('Template applied successfully!', 'success');
  };

  return (
    <div className={`enhanced-form-generator ${className}`}>
      <style jsx>{`
        .enhanced-form-generator {
          max-width: 1600px;
          margin: 0 auto;
        }
        
        .hero {
          background: white;
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        }
        
        .hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #6366f1, #ec4899, #10b981, #f59e0b);
        }
        
        .main-content {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        
        @media (min-width: 1024px) {
          .main-content:not(.preview-mode) {
            grid-template-columns: 1fr 420px;
          }
        }
        
        .form-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          min-height: 600px;
        }
        
        .sidebar {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          height: fit-content;
          position: sticky;
          top: 20px;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .btn-secondary {
          background: white;
          color: #6b7280;
          border: 2px solid #e5e7eb;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .btn-primary:hover, .btn-secondary:hover {
          transform: translateY(-2px);
        }
        
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          padding: 20px;
        }
        
        .modal-content {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 24px;
        }
        
        .question-item {
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
          background: white;
          transition: all 0.3s ease;
        }
        
        .question-item:hover {
          border-color: #6366f1;
          transform: translateY(-2px);
        }
        
        .builder-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        
        .builder-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px;
          background: #f8fafc;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          color: inherit;
        }
        
        .builder-btn:hover {
          background: white;
          border-color: #6366f1;
          transform: translateY(-2px);
        }
      `}</style>

      {/* Hero Section */}
      <div className="hero">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          {isPreviewMode ? `${currentForm.title} (Preview)` : 'FormCraft Pro'}
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          {isPreviewMode ? 'Test your survey experience' : 'Professional form builder with advanced flow logic and qualification rules'}
        </p>
        <div className="flex justify-center gap-8 text-center">
          <div>
            <span className="block text-2xl font-bold text-blue-600">{currentForm.questions.length}</span>
            <span className="text-sm text-gray-600">Questions</span>
          </div>
          <div>
            <span className="block text-2xl font-bold text-green-600">{currentForm.qualified}</span>
            <span className="text-sm text-gray-600">Qualified</span>
          </div>
          <div>
            <span className="block text-2xl font-bold text-purple-600">∞</span>
            <span className="text-sm text-gray-600">Possibilities</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`main-content ${isPreviewMode ? 'preview-mode' : ''}`}>
        {/* Form Container */}
        <div className="form-container">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">{currentForm.title}</h2>
            <p className="text-blue-100">Please answer all questions honestly and completely</p>
          </div>

          <div className="p-8">
            {currentForm.questions.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No questions yet</h3>
                <p className="text-gray-500 mb-6">Start building your survey by adding questions</p>
                <button
                  onClick={() => openQuestionEditor('multiple-choice')}
                  className="btn-primary"
                >
                  Add First Question
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {currentForm.questions.map((question, index) => (
                  <div key={question.id} className="question-item">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{question.text}</h4>
                        {question.description && (
                          <p className="text-gray-600 mt-1">{question.description}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          {question.required && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Required</span>
                          )}
                          {question.isLead && (
                            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">Lead</span>
                          )}
                          {question.isQualifying && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Qualifying</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => moveQuestion(index, 'up')}
                          disabled={index === 0}
                          className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveQuestion(index, 'down')}
                          disabled={index === currentForm.questions.length - 1}
                          className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => openQuestionEditor(question.type, question)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteQuestion(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    {/* Show options for choice-based questions */}
                    {question.options && question.options.length > 0 && (
                      <div className="text-sm text-gray-600">
                        Options: {question.options.map(opt => opt.text).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        {!isPreviewMode && (
          <div className="sidebar">
            {/* Form Info */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                📊 Survey Overview
              </h3>
              <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-semibold">{currentForm.questions.length}</div>
                    <div className="opacity-90">Questions</div>
                  </div>
                  <div>
                    <div className="font-semibold">{currentForm.questions.filter(q => q.isLead).length}</div>
                    <div className="opacity-90">Lead Questions</div>
                  </div>
                </div>
              </div>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">Survey Title</label>
              <input
                type="text"
                value={currentForm.title}
                onChange={(e) => updateFormTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter survey title..."
              />
            </div>

            {/* Quick Add */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                ⚡ Quick Add
              </h3>
              <div className="builder-grid">
                <button
                  className="builder-btn"
                  onClick={() => openQuestionEditor('multiple-choice')}
                >
                  <span className="text-2xl">☑️</span>
                  <span className="text-sm font-semibold">Multiple Choice</span>
                </button>
                <button
                  className="builder-btn"
                  onClick={() => openQuestionEditor('short-text')}
                >
                  <span className="text-2xl">📝</span>
                  <span className="text-sm font-semibold">Text Input</span>
                </button>
                <button
                  className="builder-btn"
                  onClick={() => openQuestionEditor('email')}
                >
                  <span className="text-2xl">📧</span>
                  <span className="text-sm font-semibold">Email</span>
                </button>
                <button
                  className="builder-btn"
                  onClick={() => openQuestionEditor('scale')}
                >
                  <span className="text-2xl">📊</span>
                  <span className="text-sm font-semibold">Rating Scale</span>
                </button>
              </div>
            </div>

            {/* Templates */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                📋 Templates
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => applyTemplate('lead')}
                  className="w-full text-left p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <div className="font-medium text-purple-800">🎯 Lead Generation</div>
                  <div className="text-sm text-purple-600">Capture leads while qualifying</div>
                </button>
                <button
                  onClick={() => applyTemplate('satisfaction')}
                  className="w-full text-left p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="font-medium text-green-800">😊 Satisfaction</div>
                  <div className="text-sm text-green-600">Measure customer satisfaction</div>
                </button>
                <button
                  onClick={() => applyTemplate('feedback')}
                  className="w-full text-left p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="font-medium text-blue-800">💬 Feedback</div>
                  <div className="text-sm text-blue-600">Gather user feedback</div>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={togglePreview}
                className="w-full btn-primary"
                disabled={currentForm.questions.length === 0}
              >
                👁️ Preview Survey
              </button>
              <button
                onClick={saveForm}
                className="w-full btn-primary"
                disabled={currentForm.questions.length === 0}
              >
                💾 Save Survey
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{modalContent.title}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: modalContent.body }} />
          </div>
        </div>
      )}

      {/* Back to Builder Button (Preview Mode) */}
      {isPreviewMode && (
        <button
          onClick={togglePreview}
          className="fixed top-6 right-6 btn-primary z-50"
        >
          ← Back to Builder
        </button>
      )}
    </div>
  );
};

export default EnhancedFormGenerator;
