import React, { useState, useEffect } from 'react';
import { EnhancedQuestion, EnhancedFormData, QuestionOption } from '@/types/form-types';
import QuestionEditor from './QuestionEditor';

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
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<EnhancedQuestion | undefined>(undefined);

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
    setEditingQuestion(existingQuestion);
    setShowQuestionEditor(true);
  };

  const handleQuestionSave = (questionData: Omit<EnhancedQuestion, 'id'>) => {
    if (editingQuestion) {
      // Update existing question
      const questionIndex = currentForm.questions.findIndex(q => q.id === editingQuestion.id);
      if (questionIndex !== -1) {
        updateQuestion(questionIndex, questionData);
      }
    } else {
      // Add new question
      addQuestion(questionData);
    }
    setShowQuestionEditor(false);
    setEditingQuestion(undefined);
  };

  const handleQuestionCancel = () => {
    setShowQuestionEditor(false);
    setEditingQuestion(undefined);
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
      ? generateOptionsEditor(existingQuestion?.options || [], currentForm.questions)
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

  const generateOptionsEditor = (options: QuestionOption[], allQuestions: EnhancedQuestion[] = []) => {
    // Helper function to safely escape HTML content
    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    return `
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Options & Logic</label>
        <div id="options-list" class="space-y-3">
          ${options.map((option, index) => {
            const safeText = escapeHtml(option.text || '');
            const safeId = escapeHtml(option.id || '');
            return `
            <div class="border border-gray-200 rounded-lg p-3 option-container" data-option-id="${safeId}">
              <div class="flex items-center space-x-2 mb-2">
                <input type="text" class="flex-1 border border-gray-300 rounded-md px-3 py-2 option-text" 
                       value="${safeText}" placeholder="Option ${index + 1}">
                <button type="button" class="text-red-600 hover:text-red-800" onclick="removeOption(this.closest('.option-container'))">×</button>
              </div>
              
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">After this option:</label>
                  <select class="w-full text-sm border border-gray-300 rounded px-2 py-1 option-action" onchange="toggleSkipTarget(this)">
                    <option value="next" ${(option.skipToAction || 'next') === 'next' ? 'selected' : ''}>Next Question</option>
                    <option value="skip_to" ${option.skipToAction === 'skip_to' ? 'selected' : ''}>Skip to Question</option>
                    <option value="end_success" ${option.skipToAction === 'end_success' ? 'selected' : ''}>End Survey (Success)</option>
                    <option value="end_disqualify" ${option.skipToAction === 'end_disqualify' ? 'selected' : ''}>End Survey (Disqualify)</option>
                  </select>
                </div>
                
                <div class="skip-to-container" style="display: ${option.skipToAction === 'skip_to' ? 'block' : 'none'}">
                  <label class="block text-xs font-medium text-gray-600 mb-1">Skip to:</label>
                  <select class="w-full text-sm border border-gray-300 rounded px-2 py-1 skip-target">
                    <option value="">Select Question</option>
                    ${allQuestions.map((q, qIndex) => {
                      const safeQuestionText = escapeHtml(q.text?.substring(0, 30) || 'Untitled');
                      const safeQuestionId = escapeHtml(q.id || '');
                      return `<option value="${safeQuestionId}" ${option.skipToQuestion === q.id ? 'selected' : ''}>Question ${qIndex + 1}: ${safeQuestionText}${q.text && q.text.length > 30 ? '...' : ''}</option>`;
                    }).join('')}
                  </select>
                </div>
              </div>
              
              <div class="mt-2">
                <label class="flex items-center text-xs text-gray-600">
                  <input type="checkbox" class="option-disqualifying mr-1" ${option.isDisqualifying ? 'checked' : ''}>
                  Mark as disqualifying answer
                </label>
              </div>
            </div>
            `;
          }).join('')}
        </div>
        <button type="button" class="mt-3 text-blue-600 hover:text-blue-800 font-medium" onclick="addAdvancedOption()">+ Add Option</button>
      </div>
    `;
  };

  const saveQuestionFromModal = (type: string) => {
    try {
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
        const optionContainers = document.querySelectorAll('.option-container') as NodeListOf<HTMLElement>;
        const options = Array.from(optionContainers)
          .map((container, index) => {
            const textInput = container.querySelector('.option-text') as HTMLInputElement;
            const actionSelect = container.querySelector('.option-action') as HTMLSelectElement;
            const skipTarget = container.querySelector('.skip-target') as HTMLSelectElement;
            const isDisqualifying = container.querySelector('.option-disqualifying') as HTMLInputElement;
            
            if (!textInput?.value?.trim()) return null;
            
            const option: QuestionOption = {
              id: (index + 1).toString(),
              text: textInput.value.trim(),
              value: textInput.value.trim().toLowerCase().replace(/\s+/g, '_'),
              skipToAction: actionSelect?.value as any || 'next',
              isDisqualifying: isDisqualifying?.checked || false
            };
            
            if (actionSelect?.value === 'skip_to' && skipTarget?.value) {
              option.skipToQuestion = skipTarget.value;
            }
            
            return option;
          })
          .filter(option => option !== null) as QuestionOption[];

        if (options.length < 2) {
          showAlert('Please provide at least 2 options.', 'error');
          return;
        }

        questionData.options = options;
        
        // Set disqualifying answers for backward compatibility
        questionData.disqualifyingAnswers = options
          .filter(opt => opt.isDisqualifying)
          .map(opt => opt.text);
      }

      if (editingQuestionIndex !== null) {
        updateQuestion(editingQuestionIndex, questionData);
        setEditingQuestionIndex(null);
      } else {
        addQuestion(questionData);
      }

      setShowModal(false);
    } catch (error) {
      console.error('Error saving question:', error);
      showAlert('Failed to save question. Please try again.', 'error');
    }
  };

  // Enhanced option management functions
  useEffect(() => {
    // Helper function to safely escape HTML content
    const escapeHtml = (text: string) => {
      try {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      } catch (error) {
        console.error('Error escaping HTML:', error);
        return text.replace(/[&<>"']/g, ''); // Basic fallback
      }
    };

    // Add advanced option function
    (window as any).addAdvancedOption = () => {
      try {
        const optionsList = document.getElementById('options-list');
        if (!optionsList) {
          console.warn('Options list not found');
          return;
        }
        
        const count = optionsList.children.length + 1;
        const div = document.createElement('div');
        div.className = 'border border-gray-200 rounded-lg p-3 option-container';
        
        // Generate the question options HTML safely
        const questionOptionsHtml = currentForm.questions.map((q, qIndex) => {
          const safeQuestionText = escapeHtml(q.text?.substring(0, 30) || 'Untitled');
          const safeQuestionId = escapeHtml(q.id || '');
          return `<option value="${safeQuestionId}">Question ${qIndex + 1}: ${safeQuestionText}${q.text && q.text.length > 30 ? '...' : ''}</option>`;
        }).join('');
        
        div.innerHTML = `
          <div class="flex items-center space-x-2 mb-2">
            <input type="text" class="flex-1 border border-gray-300 rounded-md px-3 py-2 option-text" 
                   placeholder="Option ${count}">
            <button type="button" class="text-red-600 hover:text-red-800" onclick="removeOption(this.closest('.option-container'))">×</button>
          </div>
          
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">After this option:</label>
              <select class="w-full text-sm border border-gray-300 rounded px-2 py-1 option-action" onchange="toggleSkipTarget(this)">
                <option value="next">Next Question</option>
                <option value="skip_to">Skip to Question</option>
                <option value="end_success">End Survey (Success)</option>
                <option value="end_disqualify">End Survey (Disqualify)</option>
              </select>
            </div>
            
            <div class="skip-to-container" style="display: none">
              <label class="block text-xs font-medium text-gray-600 mb-1">Skip to:</label>
              <select class="w-full text-sm border border-gray-300 rounded px-2 py-1 skip-target">
                <option value="">Select Question</option>
                ${questionOptionsHtml}
              </select>
            </div>
          </div>
          
          <div class="mt-2">
            <label class="flex items-center text-xs text-gray-600">
              <input type="checkbox" class="option-disqualifying mr-1">
              Mark as disqualifying answer
            </label>
          </div>
        `;
        optionsList.appendChild(div);
      } catch (error) {
        console.error('Error adding option:', error);
      }
    };

    // Toggle skip target visibility
    (window as any).toggleSkipTarget = (select: HTMLSelectElement) => {
      try {
        const container = select.closest('.option-container');
        const skipContainer = container?.querySelector('.skip-to-container') as HTMLElement;
        if (skipContainer) {
          skipContainer.style.display = select.value === 'skip_to' ? 'block' : 'none';
        }
      } catch (error) {
        console.error('Error toggling skip target:', error);
      }
    };

    // Remove option function
    (window as any).removeOption = (container: HTMLElement) => {
      try {
        if (container && container.parentNode) {
          container.remove();
        }
      } catch (error) {
        console.error('Error removing option:', error);
      }
    };

    return () => {
      delete (window as any).addAdvancedOption;
      delete (window as any).toggleSkipTarget;
      delete (window as any).removeOption;
    };
  }, [currentForm.questions]);

  // Make functions available globally for the modal
  React.useEffect(() => {
    (window as any).saveQuestion = saveQuestionFromModal;
    (window as any).hideModal = () => setShowModal(false);
  }, [editingQuestionIndex]);

  const saveForm = () => {
    if (currentForm.questions.length === 0) {
      showAlert('Please add at least one question before saving.', 'error');
      return;
    }

    // Save the form data and switch to preview mode
    onSave(currentForm);
    showAlert('Survey saved successfully! You can now preview it or create the project.', 'success');
    
    // Switch to preview mode to show the saved form
    setIsPreviewMode(true);
    setCurrentQuestionIndex(0);
    setUserResponses({});
    setIsDisqualified(false);
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

        .option-container {
          transition: all 0.2s ease;
        }
        
        .option-container:hover {
          border-color: #6366f1;
          box-shadow: 0 2px 4px rgba(99, 102, 241, 0.1);
        }
        
        .skip-to-container {
          transition: all 0.3s ease;
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
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Answer Options:</h5>
                        <div className="space-y-1">
                          {question.options.map((opt, optIndex) => (
                            <div key={opt.id} className="flex items-center justify-between text-sm">
                              <span className="text-gray-800">• {opt.text}</span>
                              <div className="flex gap-2">
                                {opt.isDisqualifying && (
                                  <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded">Disqualify</span>
                                )}
                                {opt.skipToAction && opt.skipToAction !== 'next' && (
                                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">
                                    {opt.skipToAction === 'end_success' ? 'End Success' :
                                     opt.skipToAction === 'end_disqualify' ? 'End Disqualify' :
                                     opt.skipToAction === 'skip_to' ? `Skip to Q${currentForm.questions.findIndex(q => q.id === opt.skipToQuestion) + 1}` :
                                     opt.skipToAction}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show conditional logic */}
                    {question.conditionalLogic && question.conditionalLogic.length > 0 && (
                      <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                        <h5 className="text-sm font-medium text-purple-700 mb-2">Conditional Logic:</h5>
                        <div className="space-y-1">
                          {question.conditionalLogic.map((logic, logicIndex) => (
                            <div key={logic.id} className="text-sm text-purple-800">
                              If answer {logic.condition} "{logic.value}" → {logic.action}
                              {logic.target && ` (Q${currentForm.questions.findIndex(q => q.id === logic.target) + 1})`}
                            </div>
                          ))}
                        </div>
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
              {!isPreviewMode && (
                <>
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
                </>
              )}
              
              {isPreviewMode && (
                <>
                  <button
                    onClick={() => setIsPreviewMode(false)}
                    className="w-full btn-secondary"
                  >
                    ✏️ Edit Survey
                  </button>
                  <button
                    onClick={saveForm}
                    className="w-full btn-primary"
                  >
                    💾 Save Changes
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Question Editor Modal */}
      <QuestionEditor
        question={editingQuestion}
        availableQuestions={currentForm.questions}
        onSave={handleQuestionSave}
        onCancel={handleQuestionCancel}
        isOpen={showQuestionEditor}
      />

      {/* Old Modal (keep for other uses) */}
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
