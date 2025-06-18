import React, { useState, useEffect } from 'react';
import { EnhancedQuestion, QuestionOption, ConditionalLogic } from '@/types/form-types';

interface QuestionEditorProps {
  question?: EnhancedQuestion;
  availableQuestions: EnhancedQuestion[];
  onSave: (question: Omit<EnhancedQuestion, 'id'>) => void;
  onCancel: () => void;
  isOpen: boolean;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  availableQuestions,
  onSave,
  onCancel,
  isOpen
}) => {
  const [formData, setFormData] = useState<Omit<EnhancedQuestion, 'id'>>({
    text: '',
    description: '',
    type: 'multiple-choice',
    required: true,
    isLead: false,
    isQualifying: false,
    options: [],
    disqualifyingAnswers: [],
    conditionalLogic: [],
    validation: {}
  });

  const [options, setOptions] = useState<QuestionOption[]>([]);
  const [conditionalLogic, setConditionalLogic] = useState<ConditionalLogic[]>([]);

  useEffect(() => {
    if (question) {
      setFormData({
        text: question.text,
        description: question.description || '',
        type: question.type,
        required: question.required,
        isLead: question.isLead,
        isQualifying: question.isQualifying,
        options: question.options || [],
        disqualifyingAnswers: question.disqualifyingAnswers || [],
        conditionalLogic: question.conditionalLogic || [],
        validation: question.validation || {}
      });
      setOptions(question.options || []);
      setConditionalLogic(question.conditionalLogic || []);
    } else {
      // Reset for new question
      setFormData({
        text: '',
        description: '',
        type: 'multiple-choice',
        required: true,
        isLead: false,
        isQualifying: false,
        options: [],
        disqualifyingAnswers: [],
        conditionalLogic: [],
        validation: {}
      });
      setOptions([]);
      setConditionalLogic([]);
    }
  }, [question, isOpen]);

  const handleAddOption = () => {
    const newOption: QuestionOption = {
      id: `opt_${Date.now()}`,
      text: '',
      value: '',
      skipToAction: 'next'
    };
    setOptions([...options, newOption]);
  };

  const handleUpdateOption = (index: number, field: keyof QuestionOption, value: any) => {
    const updatedOptions = options.map((opt, i) => 
      i === index ? { ...opt, [field]: value } : opt
    );
    setOptions(updatedOptions);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleAddConditionalLogic = () => {
    const newLogic: ConditionalLogic = {
      id: `logic_${Date.now()}`,
      condition: 'equals',
      value: '',
      action: 'skip_to'
    };
    setConditionalLogic([...conditionalLogic, newLogic]);
  };

  const handleUpdateConditionalLogic = (index: number, field: keyof ConditionalLogic, value: any) => {
    const updatedLogic = conditionalLogic.map((logic, i) => 
      i === index ? { ...logic, [field]: value } : logic
    );
    setConditionalLogic(updatedLogic);
  };

  const handleRemoveConditionalLogic = (index: number) => {
    setConditionalLogic(conditionalLogic.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!formData.text.trim()) {
      alert('Question text is required');
      return;
    }

    // Validate options for choice-based questions
    if (['multiple-choice', 'checkbox', 'dropdown'].includes(formData.type)) {
      const validOptions = options.filter(opt => opt.text.trim());
      if (validOptions.length < 2) {
        alert('Please add at least 2 options for choice-based questions');
        return;
      }
      
      // Update option values based on text
      const processedOptions = validOptions.map(opt => ({
        ...opt,
        value: opt.value || opt.text.toLowerCase().replace(/[^a-z0-9]/g, '_')
      }));

      setOptions(processedOptions);
      formData.options = processedOptions;
    }

    formData.conditionalLogic = conditionalLogic;
    onSave(formData);
  };

  if (!isOpen) return null;

  const showOptions = ['multiple-choice', 'checkbox', 'dropdown'].includes(formData.type);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">
            {question ? 'Edit' : 'Add'} Question
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Question Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="short-text">Short Text</option>
                <option value="paragraph">Paragraph</option>
                <option value="multiple-choice">Multiple Choice</option>
                <option value="checkbox">Checkboxes</option>
                <option value="dropdown">Dropdown</option>
                <option value="number">Number</option>
                <option value="email">Email</option>
                <option value="scale">Scale (1-10)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.required}
                  onChange={(e) => setFormData({...formData, required: e.target.checked})}
                  className="mr-2"
                />
                Required
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isLead}
                  onChange={(e) => setFormData({...formData, isLead: e.target.checked})}
                  className="mr-2"
                />
                Lead Question (collect contact info)
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isQualifying}
                  onChange={(e) => setFormData({...formData, isQualifying: e.target.checked})}
                  className="mr-2"
                />
                Qualifying Question
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Text
            </label>
            <input
              type="text"
              value={formData.text}
              onChange={(e) => setFormData({...formData, text: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Enter your question..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={2}
              placeholder="Additional context or instructions..."
            />
          </div>

          {/* Options Section */}
          {showOptions && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium">Answer Options</h4>
                <button
                  onClick={handleAddOption}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Add Option
                </button>
              </div>

              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => handleUpdateOption(index, 'text', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1"
                      placeholder="Option text..."
                    />
                    
                    <select
                      value={option.skipToAction || 'next'}
                      onChange={(e) => handleUpdateOption(index, 'skipToAction', e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="next">Next Question</option>
                      <option value="skip_to">Skip to Question</option>
                      <option value="end_success">End Survey (Success)</option>
                      <option value="end_disqualify">End Survey (Disqualify)</option>
                    </select>

                    {option.skipToAction === 'skip_to' && (
                      <select
                        value={option.skipToQuestion || ''}
                        onChange={(e) => handleUpdateOption(index, 'skipToQuestion', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="">Select question...</option>
                        {availableQuestions.map(q => (
                          <option key={q.id} value={q.id}>
                            {q.text.substring(0, 50)}...
                          </option>
                        ))}
                      </select>
                    )}

                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={option.isDisqualifying || false}
                        onChange={(e) => handleUpdateOption(index, 'isDisqualifying', e.target.checked)}
                        className="mr-1"
                      />
                      Disqualify
                    </label>

                    <button
                      onClick={() => handleRemoveOption(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conditional Logic Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-medium">Conditional Logic (Optional)</h4>
              <button
                onClick={handleAddConditionalLogic}
                className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
              >
                Add Condition
              </button>
            </div>

            {conditionalLogic.length > 0 && (
              <div className="space-y-3">
                {conditionalLogic.map((logic, index) => (
                  <div key={logic.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-purple-50">
                    <span className="text-sm font-medium">If answer</span>
                    
                    <select
                      value={logic.condition}
                      onChange={(e) => handleUpdateConditionalLogic(index, 'condition', e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="equals">equals</option>
                      <option value="not_equals">does not equal</option>
                      <option value="contains">contains</option>
                      <option value="greater_than">greater than</option>
                      <option value="less_than">less than</option>
                    </select>

                    <input
                      type="text"
                      value={logic.value}
                      onChange={(e) => handleUpdateConditionalLogic(index, 'value', e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1"
                      placeholder="Value..."
                    />

                    <span className="text-sm font-medium">then</span>

                    <select
                      value={logic.action}
                      onChange={(e) => handleUpdateConditionalLogic(index, 'action', e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="skip_to">Skip to question</option>
                      <option value="end_success">End survey (Success)</option>
                      <option value="end_disqualify">End survey (Disqualify)</option>
                      <option value="show_message">Show message</option>
                    </select>

                    {logic.action === 'skip_to' && (
                      <select
                        value={logic.target || ''}
                        onChange={(e) => handleUpdateConditionalLogic(index, 'target', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="">Select question...</option>
                        {availableQuestions.map(q => (
                          <option key={q.id} value={q.id}>
                            {q.text.substring(0, 50)}...
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      onClick={() => handleRemoveConditionalLogic(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {question ? 'Update' : 'Add'} Question
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionEditor;
